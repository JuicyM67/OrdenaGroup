// Publik bokningssida (F5). Riktig data sedan WP-20 (D-020s grind för
// `/[slug]` togs bort i samma PR, se docs/decisions/DECISIONS.md).
import { readParam, queryString } from "@/config/url-params";
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
import { brand } from "@/config/brand";
import { href } from "@/config/routes";
import { planes, reserva } from "@/i18n";
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
  // D-060: `?oferta=<id>` — boka marknadsplatsens erbjudande till
  // erbjudandepris (betalning i salongen). Ogiltigt = sidan som vanligt.
  const rawMarketOffer = readParam(sp, "oferta");
  const marketOfferId = isMarketplaceOfferIdShape(rawMarketOffer)
    ? rawMarketOffer
    : undefined;
  const [rawData, offer, flash, reviews, activeMarketOffer] =
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
      const m = marketOfferId
        ? await findBookableMarketplaceOfferIn(q, {
            businessId: business.id,
            offerId: marketOfferId,
            now,
          })
        : undefined;
      return [d, o, f, r, m] as const;
    });
  const data =
    rawData && activeMarketOffer
      ? marketplaceOfferPageData(rawData, activeMarketOffer)
      : rawData;
  // Bara en skyddsnät mot en race (företaget togs bort mellan de två
  // frågorna ovan) — `resolveBusinessBySlug` hittade det just innan.
  if (!data) notFound();
  const account = await accountPromise;
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

  const boundOfferToken = offer ? offerToken : undefined;
  const initialSelection = flash
    ? flashSelection(data, flash)
    : activeMarketOffer
      ? marketplaceOfferSelection(data, activeMarketOffer.serviceId)
      : undefined;
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

  // Bara de här två closurerna är riktiga server actions (qa-granskning
  // WP-13, item 5 — gäller fortfarande): `slug` binds på servern (fri
  // variabel i closuren, aldrig ett klientkontrollerat argument).
  async function submitBooking(
    input: CustomerFormOutput,
  ): Promise<BookingActionResult> {
    "use server";
    // WP-31: token binds här på servern (krypterad closure-variabel), bara
    // när sidan själv godkände den — aldrig ur klientens formulär.
    // D-060: erbjudandets id binds likadant (bara när sidan godkände det).
    return createBooking(slug, input, {
      offerToken: boundOfferToken,
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
      ? `${queryString("resenas", reviews.items.length + PUBLIC_REVIEWS_PAGE * 4)}#resenas`
      : undefined;
  // WP-72: guidad visning, bara på demoföretaget (aldrig riktiga företag).
  const isDemo = slug === brand.demoSlug;
  const profileContent = p ? (
    <ProfileBrowse
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
        offerNotice={marketOfferNotice ?? offerNotice}
        data={data}
        initialSelection={initialSelection}
        submitBooking={submitBooking}
        joinWaitlist={submitWaitlist}
        initialMobileTab={reviews && reviewsExpanded ? "resenas" : undefined}
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
