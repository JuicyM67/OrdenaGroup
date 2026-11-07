// /[slug]/tarjeta-regalo/tarjeta?t=<token> — WP-87 (D-073, som SE D-058):
// tarjetan bakom en länk (mottagarens i mejlet/utskriften eller köparens i
// kvittot). Visar kortet, saldot, giltigheten och koden. Serverrenderad,
// `noindex`, `no-referrer`; utskriftsvänlig (webbläsarens "Imprimir / guardar
// como PDF"). Misslyckade uppslag rate-limitas per IP.
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import { GiftCardPreview } from "@/components/gift-cards/gift-card-preview";
import { PrintButton } from "@/components/gift-cards/print-button";
import { regalo } from "@/i18n";
import { formatMoney } from "@/lib/format/money";
import { resolveBusinessBySlug } from "@/server/bookings/business";
import { loadGiftCardByToken } from "@/server/gift-cards";
import { formatGiftCardDate } from "@/server/gift-cards/rules";
import { systemClock } from "@/server/scheduling/clock";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: regalo.tarjeta.meta,
  robots: { index: false, follow: false },
  referrer: "no-referrer",
};

type Params = Promise<{ slug: string }>;
type SearchParams = Promise<Record<string, string | string[] | undefined>>;

const t = regalo.tarjeta;

export default async function GiftCardViewPage({
  params,
  searchParams,
}: {
  params: Params;
  searchParams: SearchParams;
}) {
  const { slug } = await params;
  const business = await resolveBusinessBySlug(slug);
  if (!business) notFound();
  const sp = await searchParams;
  const token = typeof sp.t === "string" ? sp.t : "";
  const result = await loadGiftCardByToken(business.id, token, systemClock());

  if (!result.ok) {
    return (
      <main className="mx-auto flex min-h-dvh max-w-160 flex-col items-center justify-center gap-4 bg-canvas p-6 text-center text-ink">
        <p className="text-16">
          {result.code === "rate_limited" ? t.demasiados : t.noEncontrada}
        </p>
        <Link href={`/${slug}`} className="text-14 font-bold underline">
          {business.name}
        </Link>
      </main>
    );
  }

  const view = result.view;
  const status =
    view.status === "active" && view.balanceMinor < view.initialMinor
      ? regalo.estados.parcial
      : regalo.estados[view.status];
  const validUntil = formatGiftCardDate(view.expiresAt, view.timeZone);

  return (
    <main className="min-h-dvh bg-canvas px-4 py-8 text-ink lg:py-12 print:bg-surface">
      <div className="mx-auto flex max-w-160 flex-col gap-5">
        <section className="flex flex-col gap-5.5 rounded-card bg-surface p-6 lg:p-8">
          <GiftCardPreview
            theme={view.theme}
            businessName={business.name}
            label={t.etiqueta}
            amount={formatMoney(view.initialMinor)}
            to={
              view.recipientName
                ? t.para({ nombre: view.recipientName })
                : undefined
            }
            footer={t.validaHasta({ fecha: validUntil })}
          />
          {view.greeting ? (
            <p className="rounded-control bg-canvas px-4.5 py-4 text-16 leading-relaxed text-ink-soft italic">
              “{view.greeting}”
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
            <dd>{validUntil}</dd>
            <dt className="text-muted">{t.estado}</dt>
            <dd>{status}</dd>
          </dl>
          <div className="flex flex-col gap-1.5">
            <span className="text-13 text-muted">{t.codigo}</span>
            <span className="self-start rounded-avatar border-2 border-dashed border-border px-4 py-3 font-mono text-24 font-bold tracking-caps">
              {view.code}
            </span>
          </div>
          <p className="text-13 leading-relaxed text-muted">
            {t.ayuda({ negocio: business.name })}
          </p>
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
      </div>
    </main>
  );
}
