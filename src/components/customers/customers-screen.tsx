"use client";

// CustomersScreen — /app/clientes (WP-24, F9): lista med sök/sortera/filtrera.
// Samma skal som Inicio/Ajustes (`AppShell`, `MainNav`/`OwnerMobileTabBar`,
// `PageHeader`) och samma mönster som Agenda för sök/sort/filter i URL:en
// (`agenda-screen.tsx`s `goTo`/`router.push`, "?vista=&fecha=") — servern
// (`/app/clientes/page.tsx`) läser `?q=&orden=&filtro=` och kör om
// `listCustomers` vid varje navigering, inget eget klientfilter av en lista
// som kan bli stor. Mobil 390 px: raderna staplas i en kolumn, ingen
// horisontell skrollning.
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useRef, useState } from "react";

import { AppShell } from "@/components/dashboard/app-shell";
import { MainNav } from "@/components/dashboard/main-nav";
import { OwnerMobileTabBar } from "@/components/mobile/owner-tab-bar";
import { Avatar } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Chip } from "@/components/ui/chip";
import { Pill } from "@/components/ui/pill";
import { PageHeader } from "@/components/ui/page-header";
import { Select } from "@/components/ui/select";
import { TextField } from "@/components/ui/text-field";
import { clientes, estados } from "@/i18n";
import { APP_TZ, formatDate, parseInstant } from "@/lib/format/dates";
import { formatPhone, isE164 } from "@/lib/format/phone";
import { initialsOf } from "@/lib/format/initials";

import type {
  CustomerListFilter,
  CustomerListItem,
  CustomerListSort,
} from "./types";

export type CustomersQuery = {
  q: string;
  sort: CustomerListSort;
  filter: CustomerListFilter;
};

export type CustomersScreenProps = {
  items: readonly CustomerListItem[];
  query: CustomersQuery;
  /** WP-24 (D-034): döljer Caja i navigeringen. `undefined` visar den. */
  canViewReports?: boolean;
  /** WP-31: länk till `/app/clientes/utskick` (ägare eller
   * `can_manage_all_bookings`). `undefined` döljer knappen. */
  canManageCampaigns?: boolean;
  onLogout?: () => void | Promise<void>;
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

export function CustomersScreen({
  items,
  query,
  canViewReports,
  canManageCampaigns,
  onLogout,
}: CustomersScreenProps) {
  const router = useRouter();
  const [q, setQ] = useState(query.q);
  const debounceRef = useRef<number | null>(null);

  function pushQuery(next: Partial<CustomersQuery>) {
    const merged = { ...query, ...next };
    const params = new URLSearchParams();
    if (merged.q.trim()) params.set("q", merged.q.trim());
    if (merged.sort !== "ultimaVisita") params.set("orden", merged.sort);
    if (merged.filter !== "todos") params.set("filtro", merged.filter);
    const qs = params.toString();
    router.push(qs ? `/app/clientes?${qs}` : "/app/clientes", {
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

  const isSearching = q.trim().length > 0;
  const emptyLabel = isSearching
    ? clientes.lista.sinResultados({ busqueda: q.trim() })
    : query.filter !== "todos"
      ? clientes.lista.sinResultadosFiltro
      : clientes.lista.vacio;

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
    >
      <PageHeader
        variant="desktop"
        title={clientes.titulo}
        actions={
          canManageCampaigns ? (
            <Button asChild variant="secondary" size="lg">
              <Link href="/app/clientes/utskick">{clientes.ctaCampanas}</Link>
            </Button>
          ) : undefined
        }
      />

      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <TextField
          label={clientes.lista.buscarPlaceholder}
          value={q}
          onChange={(e) => handleSearchChange(e.target.value)}
          className="lg:max-w-80"
        />
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
          <div className="flex flex-wrap gap-2">
            {FILTERS.map((f) => (
              <Pill
                key={f.key}
                selected={query.filter === f.key}
                onClick={() => pushQuery({ filter: f.key })}
              >
                {f.label}
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

      {items.length === 0 ? (
        <Card radius="tile" padding="lg" className="text-14 text-muted">
          {emptyLabel}
        </Card>
      ) : (
        <>
          <div className="hidden grid-cols-4 gap-4 px-5.5 text-11 font-bold tracking-caps text-muted uppercase lg:grid">
            <span>{clientes.editar.nameLabel}</span>
            <span>{clientes.lista.columnaUltimaVisita}</span>
            <span>{clientes.lista.columnaVisitas}</span>
            <span>{clientes.lista.columnaInasistencias}</span>
          </div>
          <ul className="flex flex-col gap-2.5">
            {items.map((c) => (
              <li key={c.id}>
                <Link
                  href={`/app/clientes/${c.id}`}
                  className="grid grid-cols-1 items-center gap-3 rounded-tile bg-surface px-5.5 py-4 transition-colors duration-150 ease-out hover:bg-canvas focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink lg:grid-cols-4 lg:gap-4"
                >
                  <span className="flex min-w-0 items-center gap-3">
                    <Avatar initials={initialsOf(c.name)} tone="lilac-100" />
                    <span className="flex min-w-0 flex-col">
                      <span className="flex items-center gap-1.5 truncate text-15 font-bold text-ink">
                        {c.name}
                        {c.isMember ? (
                          <Chip tone="lavender" size="xs">
                            {estados.socio}
                          </Chip>
                        ) : null}
                      </span>
                      <span className="truncate text-13 text-muted">
                        {phoneLabel(c.phone)}
                      </span>
                    </span>
                  </span>
                  <span className="flex items-center gap-2 text-13 text-ink lg:block">
                    <span className="text-11 font-semibold text-muted lg:hidden">
                      {clientes.lista.columnaUltimaVisita}:
                    </span>
                    {lastVisitLabel(c.lastVisitAt)}
                  </span>
                  <span className="flex items-center gap-2 text-13 text-ink lg:block">
                    <span className="text-11 font-semibold text-muted lg:hidden">
                      {clientes.lista.columnaVisitas}:
                    </span>
                    {clientes.ficha.visitas({ n: c.visitsCount })}
                  </span>
                  <span className="flex items-center gap-2 lg:block">
                    {c.noShowCount > 0 ? (
                      <Chip tone="deposit" size="sm">
                        {clientes.ficha.inasistencias({ n: c.noShowCount })}
                      </Chip>
                    ) : (
                      <span className="text-13 text-muted">—</span>
                    )}
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        </>
      )}
    </AppShell>
  );
}
