// /[slug]/tarjeta-regalo (SE `/<slug>/presentkort`) — WP-77 (D-058): köp av
// presentkort. Egen rutt med egen layout: importerar inget från
// bokningsflödets klientkomponenter, så `/[slug]`:s JS-budget (D-039) påverkas
// inte. Bara SE (CL: 404). Designen: `presentkort/Main.dc.html` (desktop) och
// `Mobil.dc.html`.
import { ChevronLeft } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import { optionalAccount } from "@/app/(consumer)/cuenta/session";
import {
  GiftCardForm,
  type GiftCardFormState,
  type GiftCardFormTexts,
} from "@/components/gift-cards/gift-card-form";
import {
  GIFT_CARD_DELIVERY_MAX_DAYS,
  GIFT_CARD_MAX_SEK,
  GIFT_CARD_MIN_SEK,
  GIFT_CARD_PRESETS_SEK,
  GIFT_CARD_VALIDITY_MONTHS,
} from "@/config/gift-cards";
import { regalo } from "@/i18n";
import { addLocalDays, toLocalDate, type LocalDate } from "@/lib/format/dates";
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
      <header className="relative h-57.5 overflow-hidden bg-dark lg:h-65">
        {shop.coverUrl ? (
          // eslint-disable-next-line @next/next/no-img-element -- omslagsbilden, redan optimerad i bucketen
          <img
            src={shop.coverUrl}
            alt=""
            className="absolute inset-0 size-full object-cover"
          />
        ) : null}
        <div
          aria-hidden="true"
          className="absolute inset-0 bg-linear-to-b from-ink/35 to-ink/85 lg:bg-linear-to-r lg:from-ink/80 lg:to-ink/35"
        />
        <div className="relative mx-auto flex max-w-300 flex-col gap-11.5 p-4 text-on-dark lg:gap-7 lg:px-10 lg:pt-8">
          <Link
            href={`/${slug}`}
            aria-label={t.volverCorto}
            className="flex size-11 items-center justify-center self-start rounded-full border border-on-dark/30 bg-on-dark/15 text-14 font-semibold text-on-dark focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-on-dark lg:size-auto lg:gap-2 lg:px-4.5 lg:py-2.5"
          >
            <ChevronLeft aria-hidden="true" className="size-4.5 lg:size-4" />
            <span className="hidden lg:inline">
              {t.volver({ negocio: shop.name })}
            </span>
          </Link>
          <div className="flex flex-col gap-1.5 lg:gap-2.5">
            <span className="text-12 font-bold tracking-caps text-lime uppercase lg:text-13">
              {t.eyebrow}
            </span>
            <h1 className="font-display text-30 leading-hero font-extrabold tracking-display lg:text-52 lg:leading-none">
              {t.titulo({ negocio: shop.name })}
            </h1>
            <p className="hidden text-17 text-on-dark-soft lg:block">
              {t.bajada}
            </p>
          </div>
        </div>
      </header>
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
