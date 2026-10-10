// `/resena/[token]` (SE `/recension/[token]`, WP-65, D-045): kundens
// recension efter en genomförd bokning. Publik sida, ingen inloggning.
// Token:en binds på servern i closuren `submit` (samma mönster som
// `/baja/[token]` och `/r/[token]`) och loggas aldrig.
import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { ReviewForm } from "@/components/reviews/review-form";
import { Stars } from "@/components/reviews/stars";
import { resenas } from "@/i18n";
import { APP_TZ, formatDate } from "@/lib/format/dates";
import { getClientIp, hitRateLimit } from "@/server/db/rate-limit";
import {
  loadReviewInvite,
  submitReview,
  type SubmitReviewResult,
} from "@/server/reviews/public";
import { systemClock } from "@/server/scheduling/clock";

// Samma princip som `/baja/[token]`: en IP kan spara högst så här många
// gånger per fönster.
const REVIEW_IP_WINDOW_SECONDS = 10 * 60;
const REVIEW_IP_MAX = 20;

export const dynamic = "force-dynamic";

type Params = Promise<{ token: string }>;

export async function generateMetadata({
  params,
}: {
  params: Params;
}): Promise<Metadata> {
  const { token } = await params;
  const invite = await loadReviewInvite(token, systemClock());
  return {
    title: invite
      ? `${resenas.formulario.titulo} · ${invite.negocio}`
      : undefined,
    robots: { index: false, follow: false },
  };
}

export default async function ResenaPage({ params }: { params: Params }) {
  const { token } = await params;
  const invite = await loadReviewInvite(token, systemClock());
  if (!invite) notFound();

  async function submit(input: {
    rating: number;
    comment: string;
  }): Promise<SubmitReviewResult> {
    "use server";
    const ip = await getClientIp();
    const allowed = await hitRateLimit({
      scope: "review:ip",
      subject: ip,
      windowSeconds: REVIEW_IP_WINDOW_SECONDS,
      max: REVIEW_IP_MAX,
    });
    if (!allowed) return { ok: false, code: "not_found" };
    return submitReview(token, input, systemClock());
  }

  const fecha = formatDate(
    new Date(invite.startsAt),
    APP_TZ,
    "weekdayDayMonthLongLower",
  );

  return (
    <main className="flex min-h-dvh items-start justify-center bg-canvas px-4 py-10 sm:items-center">
      <div className="flex w-full max-w-md flex-col gap-5 rounded-card bg-surface p-6 sm:p-8">
        <div>
          <p className="text-13 font-semibold text-muted">{invite.negocio}</p>
          <h1 className="mt-1 font-display text-24 font-semibold tracking-title text-ink">
            {resenas.formulario.titulo}
          </h1>
          <p className="mt-1 text-14 text-ink-soft">
            {invite.servicio} · {fecha}
          </p>
        </div>
        {invite.editable ? (
          <ReviewForm
            negocio={invite.negocio}
            pageHref={`/${invite.slug}`}
            displayName={invite.displayName}
            initial={invite.existing}
            onSubmit={submit}
          />
        ) : (
          <div className="flex flex-col gap-3">
            {invite.existing ? (
              <Stars
                rating={invite.existing.rating}
                label={resenas.publico.estrellasAria({
                  n: invite.existing.rating,
                })}
                size="md"
              />
            ) : null}
            <p className="text-15 text-ink-soft">
              {resenas.formulario.cerrada}
            </p>
            <a
              href={`/${invite.slug}`}
              className="text-14 font-semibold text-ink underline"
            >
              {resenas.formulario.verPagina}
            </a>
          </div>
        )}
      </div>
    </main>
  );
}
