// WP-67 (D-054, kompletterar D-045): Lämna recension från kontot (CL
// `/cuenta/resena/[id]`, SE `/konto/recension/[id]`). Referens
// `Recension.dc.html`. Samma formulär och regler som tokenlänken
// `/resena/[token]` (en per bokning, genomförd, 7 dagars ändring, 60 dagars
// fönster) men auktoriserat via kontots koppling: bokningens id binds på
// servern i closuren och prövas mot `private.my_booking_ref()` i kundens egen
// session. Taggarna i referensen ("Punktlig" m.fl.) finns inte i D-045 och
// byggs inte (IDEAS).
import { ArrowLeft, BadgeCheck } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import { AccountShell } from "@/components/account/account-shell";
import { dayMonthOf } from "@/components/account/format";
import { ReviewForm } from "@/components/reviews/review-form";
import { Stars } from "@/components/reviews/stars";
import { cuentaHref } from "@/config/routes";
import { cuenta, resenas } from "@/i18n";
import { bookingRefForAccount } from "@/server/accounts/account";
import { getClientIp, hitRateLimit } from "@/server/db/rate-limit";
import {
  loadAccountReview,
  submitReviewForAccount,
  type SubmitReviewResult,
} from "@/server/reviews/public";
import { systemClock } from "@/server/scheduling/clock";

import { requireAccount } from "../../session";

export const metadata: Metadata = {
  title: cuenta.meta.resena,
  robots: { index: false, follow: false },
};

export const dynamic = "force-dynamic";

const REVIEW_WINDOW_SECONDS = 10 * 60;
const REVIEW_MAX = 20;

export default async function CuentaResenaPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const session = await requireAccount();
  const ref = await bookingRefForAccount(session.userId, id);
  if (!ref) notFound();
  const page = await loadAccountReview(ref, systemClock());
  if (!page) notFound();

  async function submit(input: {
    rating: number;
    comment: string;
  }): Promise<SubmitReviewResult> {
    "use server";
    // Ny sessionskontroll i själva action:en (den kan anropas fristående).
    const s = await requireAccount();
    const allowed = await hitRateLimit({
      scope: "review:account",
      subject: `${s.userId}:${await getClientIp()}`,
      windowSeconds: REVIEW_WINDOW_SECONDS,
      max: REVIEW_MAX,
    });
    if (!allowed) return { ok: false, code: "not_found" };
    const r = await bookingRefForAccount(s.userId, id);
    if (!r) return { ok: false, code: "not_found" };
    return submitReviewForAccount(r, input, systemClock());
  }

  const t = cuenta.resena;
  return (
    <AccountShell active={null}>
      <div className="mx-auto flex max-w-lg flex-col gap-5">
        <Link
          href={cuentaHref("cuenta")}
          className="flex items-center gap-1.5 self-start text-14 font-semibold text-ink focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink"
        >
          <ArrowLeft className="size-4" strokeWidth={2.25} aria-hidden="true" />
          {t.volver}
        </Link>
        <div className="flex items-center gap-3 rounded-tile bg-surface p-3">
          <span
            aria-hidden="true"
            className="flex size-13 shrink-0 items-center justify-center rounded-control bg-staff-2 font-display text-20 font-bold text-ink"
          >
            {page.negocio.slice(0, 1).toUpperCase()}
          </span>
          <div className="flex min-w-0 flex-1 flex-col gap-0.5">
            <b className="truncate text-15 text-ink">{page.servicio}</b>
            <span className="truncate text-12 text-muted">
              {page.negocio} ·{" "}
              {t.conProfesional({
                profesional: page.profesional,
                fecha: dayMonthOf(page.startsAt, page.timezone),
              })}
            </span>
          </div>
          <span className="flex shrink-0 items-center gap-1 rounded-badge bg-success-bg px-2 py-0.5 text-11 font-bold text-success-fg">
            <BadgeCheck
              className="size-3.5"
              strokeWidth={2.25}
              aria-hidden="true"
            />
            {t.verificada}
          </span>
        </div>
        <h1 className="font-display text-30 leading-display font-semibold tracking-title text-ink">
          {t.titulo}
        </h1>
        <div className="rounded-card bg-surface p-5">
          {page.editable ? (
            <ReviewForm
              negocio={page.negocio}
              pageHref={`/${page.slug}`}
              displayName={page.displayName}
              initial={page.existing}
              onSubmit={submit}
            />
          ) : (
            <div className="flex flex-col gap-3">
              {page.existing ? (
                <Stars
                  rating={page.existing.rating}
                  label={resenas.publico.estrellasAria({
                    n: page.existing.rating,
                  })}
                  size="md"
                />
              ) : null}
              <p className="text-15 text-ink-soft">{t.cerrada}</p>
            </div>
          )}
        </div>
      </div>
    </AccountShell>
  );
}
