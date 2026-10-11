// /[slug]/tarjeta-regalo/tarjeta (SE `/<slug>/presentkort/kort`) — WP-77
// (D-058): presentkortet bakom en länk (mottagarens eller köparens token,
// retursidans session eller inloggad köpare `?id=`). Serverrenderad,
// `noindex`, `no-referrer`; utskriftsvänlig (webbläsarens "Skriv ut / spara
// som PDF"). Köparen kan "Ångra köp" inom 14 dagar om kortet är oanvänt.
import type { Metadata } from "next";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";

import { optionalAccount } from "@/app/(consumer)/cuenta/session";
import { GiftCardPreview } from "@/components/gift-cards/gift-card-preview";
import { PrintButton } from "@/components/gift-cards/print-button";
import { regaloHref } from "@/config/routes";
import { regalo } from "@/i18n";
import { formatMoney } from "@/lib/format/money";
import {
  isGiftCardTokenShape,
  loadGiftCardByToken,
  withdrawGiftCard,
} from "@/server/gift-cards";
import { formatGiftCardDate } from "@/server/gift-cards/rules";
import { loadGiftCardShop } from "@/server/gift-cards/shop";
import { systemClock } from "@/server/scheduling/clock";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: regalo.tarjeta.meta,
  robots: { index: false, follow: false },
  referrer: "no-referrer",
};

type Params = Promise<{ slug: string }>;
type SearchParams = Promise<Record<string, string | string[] | undefined>>;

export default async function GiftCardViewPage({
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
  const now = systemClock();
  const token = typeof sp.t === "string" ? sp.t : "";
  const session = typeof sp.s === "string" ? sp.s : "";
  const cardId = typeof sp.id === "string" ? sp.id : "";
  const account = cardId ? await optionalAccount() : null;
  const view = isGiftCardTokenShape(token)
    ? await loadGiftCardByToken(shop.id, { token }, now)
    : session
      ? await loadGiftCardByToken(shop.id, { session }, now)
      : account
        ? await loadGiftCardByToken(
            shop.id,
            { userId: account.userId, cardId },
            now,
          )
        : undefined;
  const t = regalo.tarjeta;

  if (!view) {
    return (
      <main className="mx-auto flex min-h-dvh max-w-160 flex-col items-center justify-center gap-4 bg-canvas p-6 text-center text-ink">
        <p className="text-16">{t.noEncontrada}</p>
        <Link href={`/${slug}`} className="text-14 font-bold underline">
          {shop.name}
        </Link>
      </main>
    );
  }

  const canWithdraw = view.canWithdraw && isGiftCardTokenShape(token);
  async function withdraw(): Promise<void> {
    "use server";
    // Token binds på servern (krypterad closure), aldrig ur formuläret.
    const r = await withdrawGiftCard(
      { businessId: shop!.id, token },
      systemClock(),
    );
    redirect(
      `${regaloHref(slug, "tarjeta")}?t=${encodeURIComponent(token)}&angra=${r.ok ? "klart" : "fel"}`,
    );
  }
  const notice =
    sp.angra === "klart"
      ? t.arrepentido
      : sp.angra === "fel"
        ? t.errorArrepentirse
        : null;
  const theme =
    view.theme === "lime" || view.theme === "photo" ? view.theme : "lilac";
  const status =
    view.status === "active" && view.balanceMinor < view.initialMinor
      ? regalo.estados.parcial
      : regalo.estados[view.status];

  return (
    <main className="min-h-dvh bg-canvas px-4 py-8 text-ink lg:py-12 print:bg-surface">
      <div className="mx-auto flex max-w-160 flex-col gap-5">
        {notice ? (
          <p
            role="status"
            className="rounded-tile bg-lime px-4 py-3 text-14 font-semibold text-ink print:hidden"
          >
            {notice}
          </p>
        ) : null}
        <section className="flex flex-col gap-5.5 rounded-card bg-surface p-6 lg:p-8">
          <GiftCardPreview
            theme={theme}
            photoUrl={shop.coverUrl}
            businessName={shop.name}
            label={regalo.compra.tarjeta.etiqueta}
            amount={formatMoney(view.initialMinor)}
            to={
              view.recipientName
                ? regalo.compra.tarjeta.para({ nombre: view.recipientName })
                : undefined
            }
            footer={regalo.compra.tarjeta.validoHasta({
              fecha: formatGiftCardDate(view.expiresAt, view.timeZone),
            })}
          />
          {view.greeting ? (
            <p className="rounded-control bg-canvas px-4.5 py-4 text-16 leading-relaxed text-ink-soft italic">
              ”{view.greeting}”
              {view.buyerName ? (
                <span className="mt-1 block text-14 not-italic">
                  {t.de({ nombre: view.buyerName })}
                </span>
              ) : null}
            </p>
          ) : null}
          <dl className="grid grid-cols-2 gap-x-3.5 gap-y-1.5 text-14">
            <dt className="text-muted">{t.saldo}</dt>
            <dd className="font-extrabold">{formatMoney(view.balanceMinor)}</dd>
            <dt className="text-muted">{t.validoHasta}</dt>
            <dd>{formatGiftCardDate(view.expiresAt, view.timeZone)}</dd>
            <dt className="text-muted">{t.estado}</dt>
            <dd>{status}</dd>
          </dl>
          <div className="flex flex-col gap-1.5">
            <span className="text-13 text-muted">{t.codigo}</span>
            <span className="self-start rounded-avatar border-2 border-dashed border-border px-4 py-3 font-mono text-24 font-bold tracking-caps">
              {view.code}
            </span>
          </div>
          <p className="text-13 leading-relaxed text-muted">{t.ayuda}</p>
          <p className="text-12 text-muted">{t.moms}</p>
          <div className="flex flex-wrap gap-2.5 print:hidden">
            <PrintButton label={t.imprimir} />
            <Link
              href={`/${slug}`}
              className="inline-flex min-h-12 items-center rounded-full border-2 border-border bg-surface px-5.5 font-bold text-ink focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink"
            >
              {t.reservar}
            </Link>
          </div>
        </section>
        {canWithdraw ? (
          <form
            action={withdraw}
            className="flex flex-col gap-2.5 rounded-card bg-surface p-5 print:hidden"
          >
            <p className="text-13 text-muted">{t.arrepentirseTexto}</p>
            <button
              type="submit"
              className="self-start text-14 font-bold text-alert-fg underline underline-offset-2"
            >
              {t.arrepentirse}
            </button>
          </form>
        ) : null}
      </div>
    </main>
  );
}
