// /admin: företagslista med sök (namn, slug, ägarens e-post) och filter
// plan/status (F19/WP-36). GET-formulär (inget klient-JS krävs). Svensk
// text (bara ägaren använder ytan, se planen).
import Link from "next/link";

import { requireAdminPage } from "@/server/admin/auth";
import {
  listBusinesses,
  type BusinessPlan,
  type BusinessStatus,
} from "@/server/admin/businesses";

export const dynamic = "force-dynamic";

const PLANS: readonly BusinessPlan[] = ["free", "emprende", "equipo", "local"];
const STATUSES: readonly BusinessStatus[] = ["active", "frozen"];

export default async function AdminBusinessesPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; plan?: string; status?: string }>;
}) {
  await requireAdminPage();
  const sp = await searchParams;
  const plan = PLANS.find((p) => p === sp.plan);
  const status = STATUSES.find((s) => s === sp.status);
  const businesses = await listBusinesses({ q: sp.q, plan, status });

  return (
    <main className="mx-auto flex max-w-5xl flex-col gap-6 p-6">
      <div className="flex items-center justify-between gap-4">
        <h1 className="text-22 font-bold text-ink">Företag</h1>
        <div className="flex gap-3">
          <Link
            href="/admin/actividad"
            className="text-13 font-semibold text-ink underline"
          >
            Logg
          </Link>
          <Link
            href="/admin/nuevo"
            className="rounded-control bg-ink px-4 py-2 text-13 font-bold text-on-dark"
          >
            Nytt företag
          </Link>
        </div>
      </div>

      <form className="flex flex-wrap items-end gap-3" method="get">
        <label className="flex flex-col gap-1 text-13 text-ink">
          Sök
          <input
            type="text"
            name="q"
            defaultValue={sp.q ?? ""}
            placeholder="Namn, slug eller ägarens e-post"
            className="h-10 w-72 rounded-control border border-border bg-surface px-3 text-14 text-ink"
          />
        </label>
        <label className="flex flex-col gap-1 text-13 text-ink">
          Plan
          <select
            name="plan"
            defaultValue={sp.plan ?? ""}
            className="h-10 rounded-control border border-border bg-surface px-3 text-14 text-ink"
          >
            <option value="">Alla</option>
            {PLANS.map((p) => (
              <option key={p} value={p}>
                {p}
              </option>
            ))}
          </select>
        </label>
        <label className="flex flex-col gap-1 text-13 text-ink">
          Status
          <select
            name="status"
            defaultValue={sp.status ?? ""}
            className="h-10 rounded-control border border-border bg-surface px-3 text-14 text-ink"
          >
            <option value="">Alla</option>
            {STATUSES.map((s) => (
              <option key={s} value={s}>
                {s === "frozen" ? "Fryst" : "Aktiv"}
              </option>
            ))}
          </select>
        </label>
        <button
          type="submit"
          className="h-10 rounded-control bg-ink px-4 text-13 font-bold text-on-dark"
        >
          Filtrera
        </button>
      </form>

      <div className="overflow-x-auto rounded-card bg-surface">
        <table className="w-full text-left text-13">
          <thead>
            <tr className="border-b border-border text-ink-soft">
              <th className="px-4 py-3 font-semibold">Namn</th>
              <th className="px-4 py-3 font-semibold">Ägare</th>
              <th className="px-4 py-3 font-semibold">Plan</th>
              <th className="px-4 py-3 font-semibold">Status</th>
              <th className="px-4 py-3 font-semibold">Skapad</th>
            </tr>
          </thead>
          <tbody>
            {businesses.map((b) => (
              <tr key={b.id} className="border-b border-border last:border-0">
                <td className="px-4 py-3">
                  <Link
                    href={`/admin/negocios/${b.id}`}
                    className="font-semibold text-ink underline"
                  >
                    {b.name}
                  </Link>
                  <div className="text-12 text-ink-soft">{b.slug}</div>
                </td>
                <td className="px-4 py-3 text-ink-soft">
                  {b.ownerEmail ?? "—"}
                </td>
                <td className="px-4 py-3 text-ink-soft">
                  {b.plan}
                  {b.planOverrideUntil
                    ? ` (till ${new Date(b.planOverrideUntil).toLocaleDateString("sv-SE")})`
                    : ""}
                </td>
                <td className="px-4 py-3 text-ink-soft">
                  {b.status === "frozen" ? "Fryst" : "Aktiv"}
                  {b.deletionRequestedAt ? " · Radering begärd" : ""}
                </td>
                <td className="px-4 py-3 text-ink-soft">
                  {new Date(b.createdAt).toLocaleDateString("sv-SE")}
                </td>
              </tr>
            ))}
            {businesses.length === 0 ? (
              <tr>
                <td className="px-4 py-6 text-ink-soft" colSpan={5}>
                  Inga företag matchar.
                </td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </div>
    </main>
  );
}
