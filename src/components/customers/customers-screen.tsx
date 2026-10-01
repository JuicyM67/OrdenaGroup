"use client";

// CustomersScreen — /app/clientes (WP-24, F9; WP-57 UX-ombyggnad). Samma
// skal som Inicio/Ajustes (`AppShell`, `MainNav`/`OwnerMobileTabBar`,
// `PageHeader`) och samma mönster som Agenda för sök/sort/filter i URL:en
// (`agenda-screen.tsx`s `goTo`/`router.push`, "?vista=&fecha=") — servern
// (`/app/clientes/page.tsx`) läser `?q=&orden=&filtro=` och kör om
// `listCustomers` vid varje navigering, inget eget klientfilter av en lista
// som kan bli stor.
//
// WP-57 (UX-genomgången, "Clientes"): riktig tabell med sticky rubrik och
// 44 px-rader i stället för ett kort per kund, antal i filterknapparna,
// taggar (Socio/Habitual/Samtycke) och flerval → "Enviar campaña a N
// seleccionados" (länk till /app/clientes/utskick/nytt?kunder=…). Mobil
// (< lg): kompakt radlista, ingen tabell, ingen horisontell skrollning.
// Samma fel 5 rättat här: sökfältet har nu en ikon och en riktig
// `placeholder` (innan: bara en osynlig `<label>`-text, inget i fältet),
// och Inasistencias visar 0 i stället för "—" (0 är ett riktigt värde, inte
// saknad data).
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Search } from "lucide-react";
import { useRef, useState } from "react";

import { AppShell } from "@/components/dashboard/app-shell";
import { MainNav } from "@/components/dashboard/main-nav";
import { OwnerMobileTabBar } from "@/components/mobile/owner-tab-bar";
import type {
  MyProfileActions,
  MyProfileData,
} from "@/components/shared/my-profile-dialog";
import { OwnerPageHeader } from "@/components/shared/owner-page-header";
import { Avatar } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Chip, type ChipProps } from "@/components/ui/chip";
import { Pill } from "@/components/ui/pill";
import { Select } from "@/components/ui/select";
import { appHref } from "@/config/routes";
import { campanas, clientes, estados } from "@/i18n";
import { APP_TZ, formatDate, parseInstant } from "@/lib/format/dates";
import { formatPhone, isE164 } from "@/lib/format/phone";
import { initialsOf } from "@/lib/format/initials";

import {
  HABITUAL_VISITS_THRESHOLD,
  type CustomerFilterCounts,
  type CustomerListFilter,
  type CustomerListItem,
  type CustomerListSort,
} from "./types";
import { uxTextos } from "@/i18n";

export type CustomersQuery = {
  q: string;
  sort: CustomerListSort;
  filter: CustomerListFilter;
};

export type CustomersScreenProps = {
  items: readonly CustomerListItem[];
  counts: CustomerFilterCounts;
  query: CustomersQuery;
  /** WP-24 (D-034): döljer Caja i navigeringen. `undefined` visar den. */
  canViewReports?: boolean;
  /** WP-31: länk till `/app/clientes/utskick` (ägare eller
   * `can_manage_all_bookings`). `undefined` döljer knappen. */
  canManageCampaigns?: boolean;
  onLogout?: () => void | Promise<void>;
  /** WP-57 punkt 7: `<OwnerPageHeader>` (klocka + profilmeny), samma data
   * som Inicio skickar till `AppShell` (`owner-chrome.tsx`). */
  ownerName: string;
  publicPageHref: string;
  myProfile?: MyProfileData;
  myProfileActions?: MyProfileActions;
};

const FILTERS: { key: CustomerListFilter; label: string }[] = [
  { key: "todos", label: clientes.lista.filtros.todos },
  { key: "habituales", label: clientes.lista.filtros.habituales },
  { key: "inactivos", label: clientes.lista.filtros.inactivos },
  { key: "conInasistencias", label: clientes.lista.filtros.conInasistencias },
  { key: "socios", label: clientes.lista.filtros.socios },
];

function lastVisitLabel(iso: string | null): string {
  if (!iso) return "—";
  const parsed = parseInstant(iso);
  if (!parsed.ok) return "—";
  return formatDate(parsed.value, APP_TZ, "weekdayDayMonthShort");
}

function phoneLabel(phone: string | null): string {
  if (!phone) return "—";
  return isE164(phone) ? formatPhone(phone) : phone;
}

type Tag = { tone: ChipProps["tone"]; label: string };

/** Socio/Habitual/Samtycke (WP-57, Clientes y Ficha del cliente): "Habitual"
 * y "Acepta ofertas" no tienen todavía una palabra corta en es-CL.ts (los
 * textos existentes son oraciones completas, p.ej. `consentimientos.aceptoEl`)
 * — placeholder TODO_COPY, ver informe. "Socio" sí existe (`estados.socio`,
 * ya usado en esta misma pantalla y en la ficha). */
function tagsOf(c: CustomerListItem): Tag[] {
  const tags: Tag[] = [];
  if (c.isMember) tags.push({ tone: "lavender", label: estados.socio });
  if (c.visitsCount >= HABITUAL_VISITS_THRESHOLD) {
    tags.push({ tone: "peach", label: uxTextos.etiquetaHabitual });
  }
  if (c.hasMarketingConsent) {
    tags.push({ tone: "success", label: uxTextos.etiquetaAceptaOfertas });
  }
  return tags;
}

function TagList({ tags }: { tags: Tag[] }) {
  if (tags.length === 0) return <span className="text-13 text-muted">—</span>;
  return (
    <div className="flex flex-wrap gap-1">
      {tags.map((t) => (
        <Chip key={t.label} tone={t.tone} size="sm">
          {t.label}
        </Chip>
      ))}
    </div>
  );
}

export function CustomersScreen({
  items,
  counts,
  query,
  canViewReports,
  canManageCampaigns,
  onLogout,
  ownerName,
  publicPageHref,
  myProfile,
  myProfileActions,
}: CustomersScreenProps) {
  const router = useRouter();
  const [q, setQ] = useState(query.q);
  const debounceRef = useRef<number | null>(null);
  const [selected, setSelected] = useState<ReadonlySet<string>>(new Set());

  function pushQuery(next: Partial<CustomersQuery>) {
    const merged = { ...query, ...next };
    const params = new URLSearchParams();
    if (merged.q.trim()) params.set("q", merged.q.trim());
    if (merged.sort !== "ultimaVisita") params.set("orden", merged.sort);
    if (merged.filter !== "todos") params.set("filtro", merged.filter);
    const qs = params.toString();
    router.push(qs ? `${appHref("appClientes")}?${qs}` : appHref("appClientes"), {
      scroll: false,
    });
  }

  function handleSearchChange(value: string) {
    setQ(value);
    if (debounceRef.current !== null) window.clearTimeout(debounceRef.current);
    debounceRef.current = window.setTimeout(() => {
      pushQuery({ q: value });
    }, 350);
  }

  function toggleOne(id: string, checked: boolean) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (checked) next.add(id);
      else next.delete(id);
      return next;
    });
  }

  function toggleAll(checked: boolean) {
    setSelected(checked ? new Set(items.map((c) => c.id)) : new Set());
  }

  const allSelected = items.length > 0 && selected.size === items.length;

  const isSearching = q.trim().length > 0;
  const emptyLabel = isSearching
    ? clientes.lista.sinResultados({ busqueda: q.trim() })
    : query.filter !== "todos"
      ? clientes.lista.sinResultadosFiltro
      : clientes.lista.vacio;

  const selectedIds = Array.from(selected);

  return (
    <AppShell
      rail={
        <MainNav
          active="clientes"
          onLogout={onLogout}
          canViewReports={canViewReports}
        />
      }
      mobileTabBar={
        <OwnerMobileTabBar
          active="clientes"
          className="lg:hidden"
          canViewReports={canViewReports}
        />
      }
      onLogout={onLogout}
      ownerName={ownerName}
      publicPageHref={publicPageHref}
      canViewReports={canViewReports}
      myProfile={myProfile}
      myProfileActions={myProfileActions}
      hideMobileTopBar
    >
      <div className="flex flex-col gap-5 lg:min-h-0 lg:flex-1">
        <OwnerPageHeader
          title={clientes.titulo}
          actions={
            canManageCampaigns ? (
              <Button asChild variant="secondary" size="lg">
                <Link href={appHref("appClientesUtskick")}>{clientes.ctaCampanas}</Link>
              </Button>
            ) : undefined
          }
        />

        <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <label className="relative flex w-full lg:max-w-80">
            <span className="sr-only">{clientes.lista.buscarPlaceholder}</span>
            <Search
              aria-hidden="true"
              className="pointer-events-none absolute top-1/2 left-4 size-4.5 -translate-y-1/2 text-muted"
              strokeWidth={2}
            />
            <input
              type="search"
              value={q}
              placeholder={clientes.lista.buscarPlaceholder}
              onChange={(e) => handleSearchChange(e.target.value)}
              className="h-13 w-full rounded-control border-2 border-transparent bg-field py-2 pr-4 pl-11 text-15 font-medium text-ink transition-colors duration-150 ease-out placeholder:text-muted focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink focus-visible:transition-none"
            />
          </label>
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
            <div className="flex flex-wrap gap-2">
              {FILTERS.map((f) => (
                <Pill
                  key={f.key}
                  selected={query.filter === f.key}
                  onClick={() => pushQuery({ filter: f.key })}
                >
                  {f.label} {counts[f.key]}
                </Pill>
              ))}
            </div>
            <Select
              label={clientes.lista.ordenarPor}
              value={query.sort}
              onChange={(e) =>
                pushQuery({ sort: e.target.value as CustomerListSort })
              }
              className="sm:w-48"
            >
              <option value="ultimaVisita">
                {clientes.lista.ordenar.ultimaVisita}
              </option>
              <option value="masVisitas">
                {clientes.lista.ordenar.masVisitas}
              </option>
              <option value="nombre">{clientes.lista.ordenar.nombre}</option>
            </Select>
          </div>
        </div>

        {selected.size > 0 ? (
          <div className="flex flex-wrap items-center justify-between gap-3 rounded-tile bg-ink px-5 py-3 text-on-dark">
            <span className="text-13 font-semibold">
              {campanas.nueva.audienciaSeleccionadosResumen({
                n: selected.size,
              })}
            </span>
            <Button asChild variant="secondary" size="sm">
              <Link
                href={`${appHref("appClientesUtskickNytt")}?kunder=${selectedIds.join(",")}`}
              >
                {/* TODO_COPY: no hay un botón "Enviar a N seleccionados" en
                    es-CL.ts — el verbo más cercano es `clientes.ctaCampanas`
                    ("Campañas", sin el conteo). */}
                {uxTextos.enviarCampanaN({ n: selected.size })}
              </Link>
            </Button>
          </div>
        ) : null}

        {items.length === 0 ? (
          <Card radius="tile" padding="lg" className="text-14 text-muted">
            {emptyLabel}
          </Card>
        ) : (
          <>
            {/* Mobil (< lg): lista kompakt, ingen tabell. */}
            <ul className="flex flex-col gap-2 lg:hidden">
              {items.map((c) => (
                <li key={c.id}>
                  <Card
                    radius="tile"
                    padding="none"
                    className="flex items-center gap-3 px-4 py-3"
                  >
                    <input
                      type="checkbox"
                      checked={selected.has(c.id)}
                      onChange={(e) => toggleOne(c.id, e.target.checked)}
                      aria-label={uxTextos.seleccionarA({ nombre: c.name })}
                      className="size-4.5 shrink-0 accent-ink"
                    />
                    <Link
                      href={appHref("appClienteDetail", c.id)}
                      className="flex min-w-0 flex-1 items-center gap-3 rounded-control focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink"
                    >
                      <Avatar initials={initialsOf(c.name)} tone="lilac-100" />
                      <span className="flex min-w-0 flex-col gap-0.5">
                        <span className="flex items-center gap-1.5 truncate text-15 font-bold text-ink">
                          {c.name}
                        </span>
                        <span className="truncate text-13 text-muted">
                          {phoneLabel(c.phone)} ·{" "}
                          {lastVisitLabel(c.lastVisitAt)}
                        </span>
                        <TagList tags={tagsOf(c)} />
                      </span>
                    </Link>
                  </Card>
                </li>
              ))}
            </ul>

            {/* Escritorio (≥ lg): tabla real, un solo card, rubrik sticky. */}
            <Card
              radius="tile"
              padding="none"
              className="hidden lg:flex lg:min-h-0 lg:flex-1 lg:flex-col lg:overflow-y-auto"
            >
              <table className="w-full border-collapse text-left">
                <thead className="sticky top-0 z-10 bg-surface">
                  <tr className="border-b border-line">
                    <th className="w-11 px-4 py-3">
                      <input
                        type="checkbox"
                        checked={allSelected}
                        onChange={(e) => toggleAll(e.target.checked)}
                        aria-label={uxTextos.seleccionarTodos}
                        className="size-4.5 accent-ink"
                      />
                    </th>
                    <th className="px-2 py-3 text-11 font-bold tracking-caps text-muted uppercase">
                      {clientes.editar.nameLabel}
                    </th>
                    <th className="px-2 py-3 text-11 font-bold tracking-caps text-muted uppercase">
                      {clientes.lista.columnaUltimaVisita}
                    </th>
                    <th className="px-2 py-3 text-11 font-bold tracking-caps text-muted uppercase">
                      {clientes.lista.columnaVisitas}
                    </th>
                    <th className="px-2 py-3 text-11 font-bold tracking-caps text-muted uppercase">
                      {clientes.lista.columnaInasistencias}
                    </th>
                    <th className="px-2 py-3 text-11 font-bold tracking-caps text-muted uppercase">
                      {uxTextos.etiquetas}
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {items.map((c) => (
                    <tr
                      key={c.id}
                      className="h-11 border-b border-line last:border-0 hover:bg-canvas"
                    >
                      <td className="px-4">
                        <input
                          type="checkbox"
                          checked={selected.has(c.id)}
                          onChange={(e) => toggleOne(c.id, e.target.checked)}
                          aria-label={uxTextos.seleccionarA({ nombre: c.name })}
                          className="size-4.5 accent-ink"
                        />
                      </td>
                      <td className="min-w-0 px-2 py-1.5">
                        <Link
                          href={appHref("appClienteDetail", c.id)}
                          className="flex min-w-0 items-center gap-2.5 rounded-control py-1 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink"
                        >
                          <Avatar
                            initials={initialsOf(c.name)}
                            tone="lilac-100"
                            size={36}
                          />
                          <span className="flex min-w-0 flex-col">
                            <span className="truncate text-14 font-bold text-ink">
                              {c.name}
                            </span>
                            <span className="truncate text-12 text-muted">
                              {phoneLabel(c.phone)}
                            </span>
                          </span>
                        </Link>
                      </td>
                      <td className="px-2 text-13 text-ink">
                        {lastVisitLabel(c.lastVisitAt)}
                      </td>
                      <td className="px-2 text-13 text-ink">
                        {clientes.ficha.visitas({ n: c.visitsCount })}
                      </td>
                      <td className="px-2 text-13 text-ink">{c.noShowCount}</td>
                      <td className="px-2 py-1.5">
                        <TagList tags={tagsOf(c)} />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </Card>
          </>
        )}
      </div>
    </AppShell>
  );
}
