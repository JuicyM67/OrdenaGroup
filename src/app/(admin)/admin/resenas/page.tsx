// /admin/resenas: anmälda och dolda recensioner (WP-65, D-045). Text via
// `adminPanel.resenas` (es-CL). Dölja/återställa — aldrig radera; varje
// åtgärd audit-loggas. Filtret i URL:en: `?ver=ocultas`.
import Link from "next/link";

import { formatAdminDate } from "@/components/admin/admin-dates";
import { AdminShell } from "@/components/admin/admin-shell";
import { ConfirmActionButton } from "@/components/admin/confirm-action-button";
import { adminPanel } from "@/i18n";
import { requireAdminPage } from "@/server/admin/auth";
import {
  listModerationReviews,
  type AdminReviewFilter,
} from "@/server/reviews/admin";

import { hideReviewAction, restoreReviewAction } from "./actions";

export const dynamic = "force-dynamic";

const t = adminPanel.resenas;
const REASONS: Readonly<Record<string, string>> = t.motivos;

export default async function AdminReviewsPage({
  searchParams,
}: {
  searchParams: Promise<{ ver?: string }>;
}) {
  await requireAdminPage();
  const sp = await searchParams;
  const filter: AdminReviewFilter =
    sp.ver === "ocultas" ? "hidden" : "reported";
  const reviews = await listModerationReviews(filter);

  return (
    <AdminShell active="resenas" title={adminPanel.nav.resenas}>
      <div className="flex max-w-4xl flex-col gap-6">
        <nav className="flex gap-3 text-13">
          <Link
            href="/admin/resenas"
            className={
              filter === "reported"
                ? "font-bold text-ink"
                : "text-ink-soft underline"
            }
          >
            {t.reportadas}
          </Link>
          <Link
            href="/admin/resenas?ver=ocultas"
            className={
              filter === "hidden"
                ? "font-bold text-ink"
                : "text-ink-soft underline"
            }
          >
            {t.ocultas}
          </Link>
        </nav>
        <ul className="flex flex-col gap-3">
          {reviews.map((r) => (
            <li
              key={r.id}
              className="flex flex-col gap-2 rounded-card bg-surface p-5"
            >
              <div className="flex flex-wrap items-center justify-between gap-2 text-13">
                <Link
                  href={`/admin/negocios/${r.businessId}`}
                  className="font-semibold text-ink underline"
                >
                  {r.negocio}
                </Link>
                <span className="text-ink-soft">
                  {formatAdminDate(r.createdAt)} · {r.rating}/5 ·{" "}
                  {r.displayName ?? t.anonimo}
                </span>
              </div>
              <p className="text-14 whitespace-pre-line text-ink">
                {r.comment ?? t.sinTexto}
              </p>
              {r.reply ? (
                <p className="rounded-control bg-canvas px-3 py-2 text-13 whitespace-pre-line text-ink-soft">
                  {t.respuesta} {r.reply}
                </p>
              ) : null}
              {r.reportReason ? (
                <p className="text-13 text-ink">
                  {r.reportedAt
                    ? t.reportada({ fecha: formatAdminDate(r.reportedAt) })
                    : t.reportadaSinFecha}
                  : {REASONS[r.reportReason] ?? r.reportReason}
                  {r.reportNote ? ` — ${r.reportNote}` : ""}
                </p>
              ) : null}
              <div className="flex gap-2">
                {r.hiddenAt ? (
                  <ConfirmActionButton
                    label={t.restaurar.boton}
                    title={t.restaurar.titulo}
                    body={t.restaurar.texto}
                    confirmLabel={t.restaurar.boton}
                    action={restoreReviewAction.bind(null, r.businessId, r.id)}
                  />
                ) : (
                  <>
                    <ConfirmActionButton
                      label={t.ocultar.boton}
                      title={t.ocultar.titulo}
                      body={t.ocultar.texto}
                      confirmLabel={t.ocultar.boton}
                      action={hideReviewAction.bind(null, r.businessId, r.id)}
                    />
                    <ConfirmActionButton
                      label={t.descartar.boton}
                      title={t.descartar.titulo}
                      body={t.descartar.texto}
                      confirmLabel={t.descartar.confirmar}
                      action={restoreReviewAction.bind(
                        null,
                        r.businessId,
                        r.id,
                      )}
                    />
                  </>
                )}
              </div>
            </li>
          ))}
          {reviews.length === 0 ? (
            <li className="text-13 text-ink-soft">{t.vacio}</li>
          ) : null}
        </ul>
      </div>
    </AdminShell>
  );
}
