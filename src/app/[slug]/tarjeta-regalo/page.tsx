// /[slug]/tarjeta-regalo (SE `/<slug>/presentkort`) — WP-77 (D-058): köp av
// presentkort. Egen rutt med egen layout: importerar inget från
// bokningsflödets klientkomponenter, så `/[slug]`:s JS-budget (D-039) påverkas
// inte. Bara SE (CL: 404). Designen: `presentkort/Main.dc.html` (desktop) och
// `Mobil.dc.html`.
import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { optionalAccount } from "@/app/(consumer)/cuenta/session";
import {
  GiftCardForm,
  type GiftCardFormState,
  type GiftCardFormTexts,
} from "@/components/gift-cards/gift-card-form";
import { GiftCardHeader } from "@/components/gift-cards/gift-card-header";
import {
  GIFT_CARD_DELIVERY_MAX_DAYS,
  GIFT_CARD_MAX_SEK,
  GIFT_CARD_MIN_SEK,
  GIFT_CARD_PRESETS_SEK,
  GIFT_CARD_VALIDITY_MONTHS,
} from "@/config/gift-cards";
import { regalo } from "@/i18n";
import {
  addLocalDays,
  formatLocalDate,
  toLocalDate,
  type LocalDate,
} from "@/lib/format/dates";
import { formatMoney } from "@/lib/format/money";
import { formatGiftCardDate } from "@/server/gift-cards/rules";
import { loadGiftCardShop } from "@/server/gift-cards/shop";
import { systemClock } from "@/server/scheduling/clock";

import { buyGiftCard } from "./actions";

export const dynamic = "force-dynamic";

type Params = Promise<{ slug: string }>;
type SearchParams = Promise<Record<string, string | string[] | undefined>>;

export async function generateMetadata({
  params,
}: {
  params: Params;
}): Promise<Metadata> {
  const { slug } = await params;
  const shop = await loadGiftCardShop(slug);
  return {
    title: shop ? regalo.compra.meta({ negocio: shop.name }) : undefined,
    robots: { index: false, follow: false },
  };
}

/** Samma kalenderdag `months` fram (sista dagen i månaden om den saknas). */
function addMonths(date: LocalDate, months: number): LocalDate {
  const [y, m, d] = date.split("-").map(Number) as [number, number, number];
  const total = y * 12 + (m - 1) + months;
  const ny = Math.floor(total / 12);
  const nm = (total % 12) + 1;
  const last = new Date(Date.UTC(ny, nm, 0)).getUTCDate();
  const nd = Math.min(d, last);
  return `${ny}-${String(nm).padStart(2, "0")}-${String(nd).padStart(2, "0")}` as LocalDate;
}

/** Månadsnamnen och "{d} {m}" i installationens språk (via dates.ts). */
function monthTexts(): { months: string[]; dayMonthTpl: string } {
  const months = Array.from({ length: 12 }, (_, i) => {
    const mm = String(i + 1).padStart(2, "0");
    return formatLocalDate(
      `2026-${mm}-02` as LocalDate,
      "dayMonthLong",
    ).replace(/^2 (de )?/, "");
  });
  const sample = formatLocalDate("2026-01-02" as LocalDate, "dayMonthLong");
  return {
    months,
    dayMonthTpl: sample.replace(/^2/, "{d}").replace(months[0] ?? "", "{m}"),
  };
}

export default async function GiftCardPage({
  params,
  searchParams,
}: {
  params: Params;
  searchParams: SearchParams;
}) {
  const { slug } = await params;
  const shop = await loadGiftCardShop(slug);
  if (!shop?.canSell) notFound();
  const sp = await searchParams;
  const now = systemClock();
  const account = await optionalAccount();
  const t = regalo.compra;
  const today = toLocalDate(now, shop.timeZone);
  const validUntil = formatGiftCardDate(
    new Date(`${addMonths(today, GIFT_CARD_VALIDITY_MONTHS)}T12:00:00Z`),
    shop.timeZone,
  );

  const texts: GiftCardFormTexts = {
    steps: {
      amount: t.pasos.monto,
      design: t.pasos.diseno,
      to: t.pasos.paraQuien,
    },
    stepsShort: {
      amount: t.pasosCortos.monto,
      design: t.pasosCortos.diseno,
      to: t.pasosCortos.paraQuien,
    },
    other: t.otro,
    otherLabel: t.otroLabel({
      min: formatMoney(GIFT_CARD_MIN_SEK * 100),
      max: formatMoney(GIFT_CARD_MAX_SEK * 100),
    }),
    themes: t.temas,
    fields: {
      recipient: t.campos.destinatario,
      recipientEmail: t.campos.destinatarioEmail,
      recipientEmailHelp: t.campos.destinatarioEmailAyuda,
      greeting: t.campos.saludo,
      greetingShort: t.campos.saludoCorto,
      from: t.campos.de,
      send: t.campos.enviar,
      sendHelp: t.campos.enviarAyuda,
      buyerEmail: t.campos.tuEmail,
      buyerEmailShort: t.campos.tuEmailCorto,
    },
    terms: t.terminos,
    ...monthTexts(),
    cardLabel: t.tarjeta.etiqueta,
    toTpl: t.tarjeta.para({ nombre: "{nombre}" }),
    validUntil: `${t.tarjeta.validoHasta({ fecha: validUntil })} · PK-••••-••••-••••`,
    summary: {
      send: t.resumen.envio,
      now: t.resumen.ahora,
      toPay: t.resumen.aPagar,
      payTpl: t.resumen.pagar({ monto: "{monto}" }),
      stripe: t.resumen.stripe,
      withdrawal: t.resumen.arrepentimiento,
      mobileNote: t.resumen.notaMovil,
    },
    errors: {
      ...t.errores,
    },
  };

  async function buy(
    _prev: GiftCardFormState,
    fd: FormData,
  ): Promise<GiftCardFormState> {
    "use server";
    // `slug` binds här på servern, aldrig ur formuläret.
    return buyGiftCard(slug, fd);
  }

  return (
    <div className="min-h-dvh bg-canvas text-ink">
      <GiftCardHeader
        coverUrl={shop.coverUrl}
        backHref={`/${slug}`}
        backLabel={t.volver({ negocio: shop.name })}
        backLabelShort={t.volverCorto}
        eyebrow={t.eyebrow}
        title={t.titulo({ negocio: shop.name })}
        lead={t.bajada}
      />
      <main className="relative mx-auto -mt-4.5 flex max-w-300 flex-col gap-3.5 px-4 pb-10 lg:-mt-10 lg:px-10 lg:pb-16">
        {sp.avbrutet === "1" ? (
          <p
            role="status"
            className="rounded-tile bg-lime px-4 py-3 text-14 font-semibold text-ink"
          >
            {t.cancelado}
          </p>
        ) : null}
        <GiftCardForm
          texts={texts}
          businessName={shop.name}
          photoUrl={shop.coverUrl}
          presets={GIFT_CARD_PRESETS_SEK}
          minSek={GIFT_CARD_MIN_SEK}
          maxSek={GIFT_CARD_MAX_SEK}
          today={today}
          maxDate={addLocalDays(today, GIFT_CARD_DELIVERY_MAX_DAYS)}
          defaults={{
            buyerName: account?.displayName ?? "",
            buyerEmail: account?.email ?? "",
          }}
          initialError={null}
          action={buy}
        />
        <p className="text-center text-12 text-muted">
          {t.vendidoPor({ negocio: shop.name })}
        </p>
      </main>
    </div>
  );
}
