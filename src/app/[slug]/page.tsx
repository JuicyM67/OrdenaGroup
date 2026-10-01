// Publik bokningssida (F5). Riktig data sedan WP-20 (D-020s grind för
// `/[slug]` togs bort i samma PR, se docs/decisions/DECISIONS.md).
import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { BookingScreen } from "@/components/booking/booking-screen";
import { SocialLinks } from "@/components/booking/social-icons";
import type {
  CustomerFormOutput,
  WaitlistFormOutput,
} from "@/components/booking/form-schema";
import type { BookingActionResult } from "@/components/booking/types";
import { reserva } from "@/i18n";
import { resolveBusinessBySlug } from "@/server/bookings/business";
import { findValidOfferIn, isOfferTokenShape } from "@/server/bookings/offer";
import {
  flashSelection,
  isFlashIdShape,
  loadActiveFlashSlotsIn,
} from "@/server/flash/public";
import { loadReservaPageData } from "@/server/bookings/page-data";
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
  const now = systemClock();
  const [data, offer, flash] = await withServiceTx(async (q) => {
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
    return [d, o, f] as const;
  });
  // Bara en skyddsnät mot en race (företaget togs bort mellan de två
  // frågorna ovan) — `resolveBusinessBySlug` hittade det just innan.
  if (!data) notFound();

  const boundOfferToken = offer ? offerToken : undefined;
  const initialSelection = flash ? flashSelection(data, flash) : undefined;
  const offerNotice = offer ? (
    <p
      role="note"
      className="flex flex-col gap-0.5 self-start rounded-control bg-lime px-3 py-2 text-13 font-semibold text-ink"
    >
      <span>{reserva.oferta.aviso({ pct: offer.pct })}</span>
      {offer.text ? <span className="font-normal">{offer.text}</span> : null}
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
    return createBooking(slug, input, { offerToken: boundOfferToken });
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
        chips: (
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

  return (
    <BookingScreen
      social={social}
      offerNotice={offerNotice}
      data={data}
      initialSelection={initialSelection}
      submitBooking={submitBooking}
      joinWaitlist={submitWaitlist}
    />
  );
}
