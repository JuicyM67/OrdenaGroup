// /admin: företagslistan som kort (WP-91, ägarens referens: CRM-kort med ikonmeny)
// med sök (namn, slug, ägarens e-post) och filter plan/status/fakturering som
// rundade dropdowns i samma GET-formulär (inget klient-JS). Planerna visas med sina
// riktiga namn (`planes.nombres`). Texten via `adminPanel` (es-CL).
// WP-84 (D-069): port av SE WP-91.
import { ChevronDown, Search } from "lucide-react";

import { AdminShell } from "@/components/admin/admin-shell";
import { AdminBusinessCard } from "@/components/admin/business-card";
import { cn } from "@/components/ui/cn";
import { BUSINESS_PLANS } from "@/config/plans";
import { adminPanel, planes } from "@/i18n";
import { requireAdminPage } from "@/server/admin/auth";
import {
  listBusinesses,
  type BusinessPlan,
  type BusinessStatus,
} from "@/server/admin/businesses";

export const dynamic = "force-dynamic";

const t = adminPanel.lista;
const PLANS: readonly BusinessPlan[] = BUSINESS_PLANS;
const STATUSES: readonly BusinessStatus[] = ["active", "frozen"];

type Params = {
  q?: string;
  plan?: string;
  status?: string;
  facturacion?: string;
};

/** Rundad nativ dropdown (GET-formulär, inget klient-JS). */
function PillSelect({
  name,
  label,
  value,
  children,
}: {
  name: string;
  label: string;
  value: string;
  children: React.ReactNode;
}) {
  return (
    <label className="relative flex">
      <span className="sr-only">{label}</span>
      <select
        name={name}
        defaultValue={value}
        className={cn(
          "h-12 w-full appearance-none rounded-full pr-10 pl-4 text-14 font-semibold shadow-soft focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink lg:w-auto",
          value ? "bg-ink text-on-dark" : "bg-surface text-ink",
        )}
      >
        {children}
      </select>
      <ChevronDown
        aria-hidden="true"
        className={cn(
          "pointer-events-none absolute top-1/2 right-3.5 size-4 -translate-y-1/2",
          value ? "text-on-dark" : "text-muted",
        )}
        strokeWidth={2}
      />
    </label>
  );
}

export default async function AdminBusinessesPage({
  searchParams,
}: {
  searchParams: Promise<Params>;
}) {
  await requireAdminPage();
  const sp = await searchParams;
  const plan = PLANS.find((p) => p === sp.plan);
  const status = STATUSES.find((s) => s === sp.status);
  // WP-80 (D-061): filtret "Todos / Facturación manual".
  const billingMode = sp.facturacion === "manual" ? "manual" : undefined;
  const businesses = await listBusinesses({
    q: sp.q,
    plan,
    status,
    billingMode,
  });

  return (
    <AdminShell
      active="negocios"
      title={t.titulo}
      subtitle={t.cantidad({ n: businesses.length })}
    >
      <form
        method="get"
        role="search"
        className="flex flex-col gap-2 rounded-card bg-surface/60 p-3 lg:flex-row lg:items-center"
      >
        <label className="flex h-12 min-w-0 flex-1 items-center gap-2.5 rounded-full bg-surface px-4 shadow-soft focus-within:outline-2 focus-within:outline-ink">
          <Search
            aria-hidden="true"
            className="size-4.5 text-muted"
            strokeWidth={2}
          />
          <span className="sr-only">{t.buscar}</span>
          <input
            type="search"
            name="q"
            defaultValue={sp.q ?? ""}
            placeholder={t.buscar}
            className="h-full min-w-0 flex-1 bg-transparent text-15 outline-none placeholder:text-muted"
          />
        </label>
        <div className="grid grid-cols-3 gap-2 lg:flex">
          <PillSelect name="plan" label={t.plan} value={plan ?? ""}>
            <option value="">{`${t.plan}: ${t.todos}`}</option>
            {PLANS.map((p) => (
              <option key={p} value={p}>
                {planes.nombres[p]}
              </option>
            ))}
          </PillSelect>
          <PillSelect name="status" label={t.status} value={status ?? ""}>
            <option value="">{`${t.status}: ${t.todos}`}</option>
            <option value="active">{t.activo}</option>
            <option value="frozen">{t.congelado}</option>
          </PillSelect>
          <PillSelect
            name="facturacion"
            label={t.facturacion}
            value={billingMode ?? ""}
          >
            <option value="">{`${t.facturacion}: ${t.todos}`}</option>
            <option value="manual">{adminPanel.facturacion.manual}</option>
          </PillSelect>
        </div>
        <button
          type="submit"
          className="h-12 rounded-full bg-ink px-6 text-14 font-bold text-on-dark hover:opacity-90 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink"
        >
          {t.buscarBoton}
        </button>
      </form>

      {businesses.length === 0 ? (
        <p className="rounded-card bg-surface p-6 text-14 text-muted">
          {t.vacio}
        </p>
      ) : (
        <ul className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4">
          {businesses.map((b) => (
            <li key={b.id}>
              <AdminBusinessCard business={b} />
            </li>
          ))}
        </ul>
      )}
    </AdminShell>
  );
}
