// Publik bokningssida (F5). Riktig data sedan WP-20 (D-020s grind för
// `/[slug]` togs bort i samma PR, se docs/decisions/DECISIONS.md).
import { readParam, queryString, anchor } from "@/config/url-params";
import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { toggleFavorite } from "@/app/(consumer)/cuenta/actions";
import { optionalAccount } from "@/app/(consumer)/cuenta/session";
import { FavoriteHeart } from "@/components/account/favorite-heart";
import { BookingScreen } from "@/components/booking/booking-screen";
import { ProfileBrowse } from "@/components/booking/profile-browse";
import { SocialLinks } from "@/components/booking/social-icons";
import type {
  CustomerFormOutput,
  WaitlistFormOutput,
} from "@/components/booking/form-schema";
import type { BookingActionResult } from "@/components/booking/types";
import { brand, market } from "@/config/brand";
import { href, regaloHref } from "@/config/routes";
import { vouchersMarket } from "@/config/marketplace";
import { planes, regalo, reserva, vales, visita } from "@/i18n";
import { formatMoney } from "@/lib/format/money";
import { isFavorite } from "@/server/accounts/account";
import { resolveBusinessBySlug } from "@/server/bookings/business";
import {
  findBookableMarketplaceOfferIn,
  isMarketplaceOfferIdShape,
} from "@/server/bookings/marketplace-offer";
import {
  marketplaceOfferPageData,
  marketplaceOfferSelection,
} from "@/server/bookings/marketplace-offer-page";
import { findValidOfferIn, isOfferTokenShape } from "@/server/bookings/offer";
import {
  flashSelection,
  isFlashIdShape,
  loadActiveFlashSlotsIn,
} from "@/server/flash/public";
import { loadReservaPageData } from "@/server/bookings/page-data";
import {
  loadPublicReviewsIn,
  PUBLIC_REVIEWS_MAX,
  PUBLIC_REVIEWS_PAGE,
} from "@/server/reviews/public";
import { withServiceTx } from "@/server/db/tx";
import { systemClock } from "@/server/scheduling/clock";
import { isUuid } from "@/server/accounts/account";
import { businessCanSellGiftCards } from "@/server/gift-cards";
import { businessAcceptsGiftCards } from "@/server/gift-cards/shop";
import { loadBookableVoucherIn } from "@/server/vouchers";
import {
  voucherPageData,
  voucherSelection,
} from "@/server/vouchers/booking-page";

import { createBooking, joinWaitlist } from "./actions";

// VERCEL_ENV/databasen måste läsas per request (samma skäl som tidigare:
// design-lab/layout.tsx), och tillgängligheten ändras minut för minut.
export const dynamic = "force-dynamic";

type Params = Promise<{ slug: string }>;
type SearchParams = Promise<Record<string, string | string[] | undefined>>;

export async function generateMetadata({
  params,
}: {
  params: Params;
}): Promise<Metadata> {
  const { slug } = await params;
  const business = await resolveBusinessBySlug(slug);
  return {
    title: business
      ? reserva.meta.titulo({ negocio: business.name })
      : undefined,
    // Riktig data, men fortfarande noindex (planens FRÅGA, WP-20-slim):
    // sidan är ny, ingen SEO-strategi bestämd än.
    robots: { index: false, follow: false },
  };
}

function pagoNoticeText(
  sp: Record<string, string | string[] | undefined>,
): string | undefined {
  switch (readParam(sp, "pago")) {
    case "ok":
      return reserva.pago.okAviso;
    case "cancelado":
      return reserva.pago.canceladoAviso;
    case "liberada":
      return reserva.pago.liberadaAviso;
    default:
      return undefined;
  }
}

export default async function ReservaPage({
  params,
  searchParams,
}: {
  params: Params;
  searchParams: SearchParams;
}) {
  const { slug } = await params;
  const business = await resolveBusinessBySlug(slug);
  if (!business) notFound();

  // WP-31 (F14): erbjudandelänken `?o=<token>`. Valideras här bara för att
  // visa raden; `createIn` validerar igen i bokningens transaktion (rätt
  // kund, ej inlöst). Ogiltig token = sidan som vanligt, inget fel.
  const sp = await searchParams;
  const rawOffer = sp.o;
  const offerToken =
    typeof rawOffer === "string" && isOfferTokenShape(rawOffer)
      ? rawOffer
      : undefined;
  // WP-30: `?flash=<id>` förväljer flash-tiden (tjänst, profesional, tid).
  // Okänd/avbruten/bokad tid = sidan som vanligt.
  const flashId = isFlashIdShape(sp.flash) ? sp.flash : undefined;
  // WP-65 (D-045): `?resenas=N` — "Ver más reseñas" (server-paginering,
  // ingen klient-JS). Okänt värde = första sidan.
  const rawResenasStr = readParam(sp, "resenas");
  const rawResenas = rawResenasStr !== undefined ? Number(rawResenasStr) : NaN;
  const reviewsExpanded = Number.isInteger(rawResenas) && rawResenas > 0;
  const reviewsLimit = reviewsExpanded
    ? Math.min(rawResenas, PUBLIC_REVIEWS_MAX)
    : PUBLIC_REVIEWS_PAGE;
  const now = systemClock();
  // WP-67 (D-054): inloggad kund med kundkonto → förifyllt namn/e-post och
  // hjärtat (favorit). Utloggad: oförändrat flöde, ingen extra fråga.
  const accountPromise = optionalAccount();
  // WP-69 (D-057): `?vardebevis=<id>` — boka med ett köpt värdebevis. Bara för
  // den inloggade köparen (annars sidan som vanligt), servervalidering här och
  // igen i bokningens transaktion.
  const rawVoucher = readParam(sp, "vardebevis");
  // D-060: `?oferta=<id>` — boka marknadsplatsens erbjudande till
  // erbjudandepris (CL, betalning i salongen). Ogiltigt = sidan som vanligt.
  const rawMarketOffer = readParam(sp, "oferta");
  const marketOfferId = isMarketplaceOfferIdShape(rawMarketOffer)
    ? rawMarketOffer
    : undefined;
  const voucherAccount =
    vouchersMarket() && isUuid(rawVoucher) ? await accountPromise : null;
  const [rawData, offer, flash, reviews, voucher, marketOffer] =
    await withServiceTx(async (q) => {
      const d = await loadReservaPageData(q, {
        businessId: business.id,
        slug,
        now,
      });
      const o = offerToken
        ? await findValidOfferIn(q, {
            businessId: business.id,
            token: offerToken,
            now,
          })
        : undefined;
      const f = flashId
        ? (await loadActiveFlashSlotsIn(q, business.id, now)).find(
            (x) => x.id === flashId,
          )
        : undefined;
      const r = await loadPublicReviewsIn(q, business.id, reviewsLimit);
      const v =
        voucherAccount && isUuid(rawVoucher)
          ? await loadBookableVoucherIn(q, {
              userId: voucherAccount.userId,
              voucherId: rawVoucher,
              businessId: business.id,
              now,
            })
          : undefined;
      const m = marketOfferId
        ? await findBookableMarketplaceOfferIn(q, {
            businessId: business.id,
            offerId: marketOfferId,
            now,
          })
        : undefined;
      return [d, o, f, r, v, m] as const;
    });
  // Värdebeviset går före (det betalar redan hela tjänsten).
  const activeMarketOffer = voucher ? undefined : marketOffer;
  const data =
    rawData && voucher
      ? voucherPageData(rawData, voucher)
      : rawData && activeMarketOffer
        ? marketplaceOfferPageData(rawData, activeMarketOffer)
        : rawData;
  // Bara en skyddsnät mot en race (företaget togs bort mellan de två
  // frågorna ovan) — `resolveBusinessBySlug` hittade det just innan.
  if (!data) notFound();
  const account = await accountPromise;
  // WP-77 (D-058): "Köp presentkort" — serverrenderad länk (ingen klient-JS).
  const sellsGiftCards = await businessCanSellGiftCards(business.id).catch(
    () => false,
  );
  // Kodfältet i datasteget: inte med värdebevis (det betalar redan allt).
  const acceptsGiftCards =
    !voucher &&
    (sellsGiftCards ||
      (await businessAcceptsGiftCards(business.id).catch(() => false)));
  const tr = regalo.reserva;
  const giftCardField = acceptsGiftCards ? (
    <details className="group rounded-control bg-field px-4 py-3 open:pb-4">
      <summary className="cursor-pointer text-14 font-semibold text-ink">
        {tr.pregunta}
      </summary>
      <label className="mt-3 flex flex-col gap-1.5 text-13 font-semibold text-ink">
        {tr.codigo}
        <input
          name="giftCardCode"
          autoComplete="off"
          autoCapitalize="characters"
          spellCheck={false}
          maxLength={40}
          className="h-13 w-full rounded-control border-2 border-transparent bg-surface px-4 font-mono text-15 font-medium tracking-caps text-ink uppercase focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink"
        />
      </label>
      <p className="mt-1.5 text-13 text-muted">{tr.ayuda}</p>
    </details>
  ) : undefined;
  const favorite = account
    ? await isFavorite(account.userId, business.id).catch(() => false)
    : false;
  const heart = account ? (
    <FavoriteHeart
      businessId={business.id}
      saved={favorite}
      back={`/${slug}`}
      action={toggleFavorite}
    />
  ) : null;

  const boundOfferToken = offer && !voucher ? offerToken : undefined;
  const boundVoucher =
    voucher && voucherAccount
      ? { id: voucher.id, userId: voucherAccount.userId }
      : undefined;
  const initialSelection = voucher
    ? voucherSelection(data, voucher.serviceId)
    : flash
      ? flashSelection(data, flash)
      : activeMarketOffer
        ? marketplaceOfferSelection(data, activeMarketOffer.serviceId)
        : undefined;
  const voucherNotice = voucher ? (
    <p
      role="note"
      className="flex flex-col gap-0.5 self-start rounded-control bg-lime px-3 py-2 text-13 font-semibold text-ink"
    >
      <span>{vales.reserva.aviso({ codigo: voucher.code })}</span>
      <span className="font-normal">{vales.reserva.avisoTexto}</span>
    </p>
  ) : undefined;
  const offerNotice = offer ? (
    <p
      role="note"
      className="flex flex-col gap-0.5 self-start rounded-control bg-lime px-3 py-2 text-13 font-semibold text-ink"
    >
      <span>{reserva.oferta.aviso({ pct: offer.pct })}</span>
      {offer.text ? <span className="font-normal">{offer.text}</span> : null}
    </p>
  ) : undefined;

  const marketOfferNotice = activeMarketOffer ? (
    <p
      role="note"
      className="flex flex-col gap-0.5 self-start rounded-control bg-lime px-3 py-2 text-13 font-semibold text-ink"
    >
      <span>
        {reserva.ofertaDescubre.aviso({
          titulo: activeMarketOffer.title,
          precio: formatMoney(activeMarketOffer.priceMinor),
        })}
      </span>
      <span className="font-normal">{reserva.ofertaDescubre.texto}</span>
    </p>
  ) : undefined;

  // WP-64 (D-044): tillbaka från Stripe Checkout (`?pago=ok|cancelado|liberada`).
  const pagoText = pagoNoticeText(sp);
  const pagoNotice = pagoText ? (
    <p
      role="status"
      className="self-start rounded-control bg-lime px-3 py-2 text-13 font-semibold text-ink"
    >
      {pagoText}
    </p>
  ) : undefined;

  // Bara de här två closurerna är riktiga server actions (qa-granskning
  // WP-13, item 5 — gäller fortfarande): `slug` binds på servern (fri
  // variabel i closuren, aldrig ett klientkontrollerat argument).
  async function submitBooking(
    input: CustomerFormOutput,
  ): Promise<BookingActionResult> {
    "use server";
    // WP-31: token binds här på servern (krypterad closure-variabel), bara
    // när sidan själv godkände den — aldrig ur klientens formulär.
    // WP-69: värdebeviset (id + köparens id) binds likadant, aldrig ur formuläret.
    // D-060: erbjudandets id binds likadant (bara när sidan godkände det).
    return createBooking(slug, input, {
      offerToken: boundOfferToken,
      voucher: boundVoucher,
      marketplaceOfferId: activeMarketOffer?.id,
    });
  }

  async function submitWaitlist(
    input: WaitlistFormOutput,
  ): Promise<BookingActionResult> {
    "use server";
    return joinWaitlist(slug, input);
  }

  // WP-51/D-032: ikonerna renderas här på servern och skickas in som färdigt
  // innehåll, så de kostar ingen JS i bokningsflödets klientbunt.
  const p = data.profile;
  const social = p
    ? {
        chips: heart ? (
          <span className="ml-auto flex items-center gap-2">
            <SocialLinks
              instagramUrl={p.instagramUrl}
              tiktokUrl={p.tiktokUrl}
              facebookUrl={p.facebookUrl}
              businessName={data.business.name}
              tone="surface"
              size={36}
            />
            {heart}
          </span>
        ) : (
          <SocialLinks
            instagramUrl={p.instagramUrl}
            tiktokUrl={p.tiktokUrl}
            facebookUrl={p.facebookUrl}
            businessName={data.business.name}
            tone="surface"
            size={36}
            className="ml-auto"
          />
        ),
        contact: (
          <SocialLinks
            instagramUrl={p.instagramUrl}
            tiktokUrl={p.tiktokUrl}
            facebookUrl={p.facebookUrl}
            businessName={data.business.name}
            tone="canvas"
            size={44}
          />
        ),
      }
    : undefined;

  // WP-53 (D-040): profilvyn renderas här, på servern — `BookingScreen` tar
  // bara emot det färdiga trädet (`profileContent`), ingen av
  // `ProfileBrowse`s markup/text/formatering hamnar i klientbunten.
  const reviewsMoreHref =
    reviews?.hasMore && reviews.items.length < PUBLIC_REVIEWS_MAX
      ? `${queryString("resenas", reviews.items.length + PUBLIC_REVIEWS_PAGE * 4)}#${anchor("resenas")}`
      : undefined;
  // WP-72: guidad visning, bara på marknadens demoföretag (aldrig riktiga företag).
  // Stripe-raden finns bara i SE och visas bara medan visningen pågår.
  const isDemo = slug === brand.demoSlug;
  const profileContent = p ? (
    <ProfileBrowse
      paymentNote={
        isDemo && market === "SE" ? visita.cliente.pagoNota : undefined
      }
      giftCardLink={
        sellsGiftCards ? (
          <a
            href={regaloHref(slug)}
            className="flex items-center justify-between gap-3 rounded-card bg-lilac px-5 py-4 text-15 font-bold text-ink focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink"
          >
            {regalo.compra.enlacePerfil}
            <span aria-hidden="true">→</span>
          </a>
        ) : undefined
      }
      data={data}
      profile={p}
      social={social}
      reviews={reviews}
      reviewsMoreHref={reviewsMoreHref}
    />
  ) : undefined;

  return (
    <>
      <BookingScreen
        profileContent={profileContent}
        tour={isDemo}
        offerNotice={
          voucherNotice ?? pagoNotice ?? marketOfferNotice ?? offerNotice
        }
        data={data}
        initialSelection={initialSelection}
        submitBooking={submitBooking}
        joinWaitlist={submitWaitlist}
        initialMobileTab={reviews && reviewsExpanded ? "resenas" : undefined}
        giftCardField={giftCardField}
        giftCardErrors={
          acceptsGiftCards
            ? {
                invalid: tr.errores.gift_card_invalid,
                empty: tr.errores.gift_card_empty,
                rate_limited: tr.errores.gift_card_rate_limited,
              }
            : undefined
        }
        initialContact={
          account
            ? {
                name: account.displayName ?? "",
                phone: "",
                email: account.email,
              }
            : undefined
        }
      />
      {/* WP-73 (D-048): diskret märkning på planen Gratis, serverrenderad. */}
      {data.business.branded ? (
        <p className="bg-canvas pt-4 pb-28 text-center text-12 text-muted lg:pb-6">
          <a
            href={href("inicio")}
            className="underline-offset-2 hover:underline"
          >
            {planes.creadoCon({ marca: brand.name })}
          </a>
        </p>
      ) : null}
    </>
  );
}
