// /[slug]/tarjeta-regalo/listo (SE `/<slug>/presentkort/klart`) — WP-77
// (D-058): tillbaka från Stripe Checkout. Skapar kortet direkt om webhooken
// inte hunnit (idempotent, som `confirmVoucherReturn`), visar "Klart!" och när
// mejlet skickas, eller "Vi bekräftar din betalning".
import { Check } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import { GiftCardHeader } from "@/components/gift-cards/gift-card-header";
import { GiftCardPreview } from "@/components/gift-cards/gift-card-preview";
import { regaloHref } from "@/config/routes";
import { regalo } from "@/i18n";
import {
  formatLocalDate,
  toLocalDate,
  type LocalDate,
} from "@/lib/format/dates";
import { formatMoney } from "@/lib/format/money";
import { confirmGiftCardReturn, loadGiftCardReturn } from "@/server/gift-cards";
import { loadGiftCardShop } from "@/server/gift-cards/shop";
import { systemClock } from "@/server/scheduling/clock";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: regalo.listo.meta,
  robots: { index: false, follow: false },
  referrer: "no-referrer",
};

type Params = Promise<{ slug: string }>;
type SearchParams = Promise<Record<string, string | string[] | undefined>>;

export default async function GiftCardDonePage({
  params,
  searchParams,
}: {
  params: Params;
  searchParams: SearchParams;
}) {
  const { slug } = await params;
  const shop = await loadGiftCardShop(slug);
  if (!shop) notFound();
  const sp = await searchParams;
  const session = typeof sp.session === "string" ? sp.session : "";
  const now = systemClock();
  await confirmGiftCardReturn(shop.id, session, now).catch(
    () => "pending" as const,
  );
  const done = await loadGiftCardReturn(shop.id, session);
  const t = regalo.listo;

  // Datumet i fetstil (designen): texten delas runt en markör.
  const MARK = "\u0000";
  const raw = !done
    ? t.pendiente
    : done.toBuyer
      ? t.textoTuyo
      : done.deliverOn && done.deliverOn > toLocalDate(now, shop.timeZone)
        ? t.texto({ nombre: done.recipientName ?? "", fecha: MARK })
        : t.textoAhora({ nombre: done.recipientName ?? "" });
  const [before, after] = raw.split(MARK);
  const when =
    done?.deliverOn && after !== undefined
      ? t.fechaHora({
          fecha: formatLocalDate(done.deliverOn as LocalDate, "dayMonthLong"),
        })
      : null;

  return (
    <div className="min-h-dvh bg-canvas text-ink">
      <GiftCardHeader
        coverUrl={shop.coverUrl}
        backHref={`/${slug}`}
        backLabel={regalo.compra.volver({ negocio: shop.name })}
        backLabelShort={regalo.compra.volverCorto}
        eyebrow={regalo.compra.eyebrow}
        title={regalo.compra.titulo({ negocio: shop.name })}
        lead={regalo.compra.bajada}
      />
      <main className="relative mx-auto -mt-4.5 max-w-160 px-4 pb-16 lg:-mt-10 lg:px-10">
        <section className="flex flex-col items-center gap-5.5 rounded-hero bg-surface p-6 text-center shadow-popover lg:p-10">
          <div className="flex size-18 items-center justify-center rounded-full bg-mint">
            <Check
              aria-hidden="true"
              className="size-8.5 text-success-fg"
              strokeWidth={2.5}
            />
          </div>
          <h1 className="font-display text-28 leading-snug font-extrabold tracking-display lg:text-34">
            {done ? t.titulo : regalo.tarjeta.meta}
          </h1>
          <p className="text-16 leading-relaxed text-muted">
            {before}
            {when ? <b className="text-ink">{when}</b> : null}
            {after}
          </p>
          {done ? (
            <GiftCardPreview
              theme={
                done.theme === "lime" || done.theme === "photo"
                  ? done.theme
                  : "lilac"
              }
              photoUrl={shop.coverUrl}
              businessName={shop.name}
              label={regalo.compra.tarjeta.etiqueta}
              amount={formatMoney(done.amountMinor)}
              className="w-full text-left"
            />
          ) : null}
          <div className="flex flex-wrap justify-center gap-2.5">
            {done ? (
              <Link
                href={`${regaloHref(slug, "tarjeta")}?s=${encodeURIComponent(session)}`}
                className="inline-flex min-h-12 items-center rounded-full bg-ink px-5.5 font-bold text-on-dark focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink"
              >
                {t.imprimir}
              </Link>
            ) : null}
            <Link
              href={regaloHref(slug)}
              className="inline-flex min-h-12 items-center rounded-full border-2 border-border bg-surface px-5.5 font-bold text-ink focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink"
            >
              {t.otra}
            </Link>
          </div>
        </section>
      </main>
    </div>
  );
}
