// Publika recensioner på `/[slug]` (WP-65, D-045). Serverkomponenter —
// ingen "use client", inget i klientbunten (JS-budgeten 190 kB, D-039):
// `ProfileBrowse` tar emot dem som färdiga noder. "Ver más" är en vanlig
// länk (`?resenas=N#resenas`), server-paginering utan klient-JS.
import { anchor } from "@/config/url-params";
import { Star } from "lucide-react";

import { Chip } from "@/components/ui/chip";
import { resenas } from "@/i18n";
import { APP_TZ, formatDate, parseInstant } from "@/lib/format/dates";

import { Stars } from "./stars";

/** Samma form som `PublicReviews` (`@/server/reviews/public`) — duplicerad
 * för att komponenterna inte ska importera `@/server/*`. */
export type PublicReviewsView = {
  average: number;
  count: number;
  items: readonly {
    id: string;
    rating: number;
    comment: string | null;
    displayName: string | null;
    servicio: string | null;
    createdAt: string;
    reply: string | null;
  }[];
  hasMore: boolean;
};

const t = resenas.publico;

/** "4,8" (en decimal, komma i båda marknaderna). */
export function formatAverage(avg: number): string {
  return avg.toFixed(1).replace(".", ",");
}

function monthYear(iso: string): string {
  const parsed = parseInstant(iso);
  return parsed.ok ? formatDate(parsed.value, APP_TZ, "monthYear") : "";
}

/** Chip nära namnet: ★ 4,8 · 23 reseñas. `href` gör den till en länk till
 * sektionen (dator); utan `href` är den bara text (mobilens flikar). */
export function RatingChip({
  reviews,
  href,
}: {
  reviews: PublicReviewsView;
  href?: string;
}) {
  const nota = formatAverage(reviews.average);
  const content = (
    <Chip tone="neutral" size="sm" className="gap-1">
      <Star
        aria-hidden="true"
        strokeWidth={1.8}
        className="size-3.5 fill-ink text-ink"
      />
      <span aria-hidden="true">
        {nota} · {t.cantidad({ n: reviews.count })}
      </span>
      <span className="sr-only">{t.notaAria({ nota, n: reviews.count })}</span>
    </Chip>
  );
  return href ? (
    <a
      href={href}
      className="rounded-chip focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink"
    >
      {content}
    </a>
  ) : (
    content
  );
}

export function ReviewsSection({
  id = anchor("resenas"),
  reviews,
  negocio,
  moreHref,
  headingClassName,
}: {
  /** Mobil och dator renderas båda (CSS växlar) — egna id:n. */
  id?: string;
  reviews: PublicReviewsView;
  negocio: string;
  /** `?resenas=N#resenas`, bara om det finns fler. */
  moreHref?: string;
  headingClassName?: string;
}) {
  const nota = formatAverage(reviews.average);
  return (
    <section
      id={id}
      aria-labelledby={`${id}-titulo`}
      className="flex scroll-mt-6 flex-col gap-3"
    >
      <h2 id={`${id}-titulo`} className={headingClassName}>
        {t.titulo}
      </h2>
      <div className="flex items-center gap-3">
        <span className="font-display text-40 font-bold text-ink">{nota}</span>
        <div className="flex flex-col gap-1">
          <Stars
            rating={reviews.average}
            label={t.notaAria({ nota, n: reviews.count })}
            size="md"
          />
          <span className="text-13 text-muted">
            {t.cantidad({ n: reviews.count })} · {t.verificadas}
          </span>
        </div>
      </div>
      <ul className="flex flex-col gap-2.5">
        {reviews.items.map((r) => (
          <li
            key={r.id}
            className="flex flex-col gap-2 rounded-tile bg-surface p-5"
          >
            <div className="flex items-center justify-between gap-3">
              <span className="text-14 font-bold text-ink">
                {r.displayName ?? t.anonimo}
              </span>
              <span className="text-12 text-muted">
                {monthYear(r.createdAt)}
              </span>
            </div>
            <div className="flex items-center gap-2">
              <Stars
                rating={r.rating}
                label={t.estrellasAria({ n: r.rating })}
              />
              {r.servicio ? (
                <span className="truncate text-12 text-muted">
                  {r.servicio}
                </span>
              ) : null}
            </div>
            {r.comment ? (
              <p className="text-14 leading-relaxed whitespace-pre-line text-ink-soft">
                {r.comment}
              </p>
            ) : null}
            {r.reply ? (
              <div className="mt-1 rounded-control bg-canvas px-4 py-3">
                <p className="text-12 font-bold text-ink">
                  {t.respuesta({ negocio })}
                </p>
                <p className="mt-1 text-13 leading-relaxed whitespace-pre-line text-ink-soft">
                  {r.reply}
                </p>
              </div>
            ) : null}
          </li>
        ))}
      </ul>
      {moreHref ? (
        <a
          href={moreHref}
          className="self-start rounded-control text-14 font-semibold text-ink underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink"
        >
          {t.verMas}
        </a>
      ) : null}
    </section>
  );
}
