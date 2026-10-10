// /admin/resenas: anmälda och dolda recensioner (WP-65, D-045). Svensk
// text (bara plattformsägaren använder ytan, samma som resten av /admin).
// Dölja/återställa — aldrig radera; varje åtgärd audit-loggas.
import Link from "next/link";

import { ConfirmActionButton } from "@/components/admin/confirm-action-button";
import { requireAdminPage } from "@/server/admin/auth";
import {
  listModerationReviews,
  type AdminReviewFilter,
} from "@/server/reviews/admin";

import { hideReviewAction, restoreReviewAction } from "./actions";

export const dynamic = "force-dynamic";

const REASONS: Record<string, string> = {
  offensive: "Kränkande språk",
  false: "Felaktig information",
  personal_data: "Personuppgifter",
  not_customer: "Inte deras kund",
  other: "Annat",
};

export default async function AdminReviewsPage({
  searchParams,
}: {
  searchParams: Promise<{ visa?: string }>;
}) {
  await requireAdminPage();
  const sp = await searchParams;
  const filter: AdminReviewFilter = sp.visa === "dolda" ? "hidden" : "reported";
  const reviews = await listModerationReviews(filter);

  return (
    <main className="mx-auto flex max-w-3xl flex-col gap-6 p-6">
      <div className="flex items-center justify-between gap-4">
        <h1 className="text-22 font-bold text-ink">Recensioner</h1>
        <Link
          href="/admin"
          className="text-13 font-semibold text-ink underline"
        >
          Företag
        </Link>
      </div>
      <nav className="flex gap-3 text-13">
        <Link
          href="/admin/resenas"
          className={
            filter === "reported"
              ? "font-bold text-ink"
              : "text-ink-soft underline"
          }
        >
          Anmälda
        </Link>
        <Link
          href="/admin/resenas?visa=dolda"
          className={
            filter === "hidden"
              ? "font-bold text-ink"
              : "text-ink-soft underline"
          }
        >
          Dolda
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
                {new Date(r.createdAt).toLocaleDateString("sv-SE")} · {r.rating}
                /5 · {r.displayName ?? "Anonym"}
              </span>
            </div>
            <p className="text-14 whitespace-pre-line text-ink">
              {r.comment ?? "(ingen text)"}
            </p>
            {r.reply ? (
              <p className="rounded-control bg-canvas px-3 py-2 text-13 whitespace-pre-line text-ink-soft">
                Svar: {r.reply}
              </p>
            ) : null}
            {r.reportReason ? (
              <p className="text-13 text-ink">
                Anmäld{" "}
                {r.reportedAt
                  ? new Date(r.reportedAt).toLocaleDateString("sv-SE")
                  : ""}
                : {REASONS[r.reportReason] ?? r.reportReason}
                {r.reportNote ? ` — ${r.reportNote}` : ""}
              </p>
            ) : null}
            <div className="flex gap-2">
              {r.hiddenAt ? (
                <ConfirmActionButton
                  label="Återställ"
                  title="Återställ recensionen?"
                  body="Den blir synlig på företagets sida igen."
                  confirmLabel="Återställ"
                  action={restoreReviewAction.bind(null, r.businessId, r.id)}
                />
              ) : (
                <>
                  <ConfirmActionButton
                    label="Dölj"
                    title="Dölj recensionen?"
                    body="Den försvinner från företagets sida och snittbetyget. Kan återställas."
                    confirmLabel="Dölj"
                    action={hideReviewAction.bind(null, r.businessId, r.id)}
                  />
                  <ConfirmActionButton
                    label="Avvisa anmälan"
                    title="Avvisa anmälan?"
                    body="Recensionen ligger kvar och anmälan stängs."
                    confirmLabel="Avvisa"
                    action={restoreReviewAction.bind(null, r.businessId, r.id)}
                  />
                </>
              )}
            </div>
          </li>
        ))}
        {reviews.length === 0 ? (
          <li className="text-13 text-ink-soft">Inget att granska.</li>
        ) : null}
      </ul>
    </main>
  );
}
