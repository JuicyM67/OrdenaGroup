// Kundens väntelisteerbjudande `/v/[token]` (WP-23, D-029): "Se liberó una
// hora" → "Ta tiden". `token` läses ur URL:en och binds på servern i
// closuren `claimOffer` (samma mönster som `/r/[token]`:s
// `cancelReservation`, qa-granskning WP-13 item 5) — en riktig server action
// som tog `token` som ett klientkontrollerat argument skulle låta vem som
// helst ta en annan kunds erbjudande. Token loggas aldrig.
import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { vOferta } from "@/i18n";
import { getClientIp, hitRateLimit } from "@/server/db/rate-limit";
import { kickOutbox } from "@/server/messaging/outbox";
import { systemClock } from "@/server/scheduling/clock";
import { claimWaitlistOffer, getWaitlistOffer } from "@/server/waitlist";

import { loadStaffName } from "./data";
import { OfferScreen, type OfferScreenProps } from "./offer-screen";
import type { ClaimActionResult } from "./view";

// Pilotblockerare (samma princip som `/r/[token]`): en IP kan svara på
// erbjudanden högst `CLAIM_IP_MAX` gånger per `CLAIM_IP_WINDOW_SECONDS`.
const CLAIM_IP_WINDOW_SECONDS = 10 * 60;
const CLAIM_IP_MAX = 20;

// Erbjudandet går ut minut för minut — samma skäl som `/r/[token]`.
export const dynamic = "force-dynamic";

type Params = Promise<{ token: string }>;

export async function generateMetadata({
  params,
}: {
  params: Params;
}): Promise<Metadata> {
  const { token } = await params;
  const result = await getWaitlistOffer(token, systemClock());
  return {
    title: result.ok
      ? `${vOferta.titulo} · ${result.offer.businessName}`
      : undefined,
    // Länken är personlig (en gång-erbjudande) — aldrig indexerad.
    robots: { index: false, follow: false },
  };
}

export default async function WaitlistOfferPage({
  params,
}: {
  params: Params;
}) {
  const { token } = await params;
  const now = systemClock();
  const result = await getWaitlistOffer(token, now);

  if (!result.ok) {
    if (result.code === "invalid") notFound();
    const screen: OfferScreenProps = { kind: result.code };
    return <OfferScreen {...screen} />;
  }

  const { offer } = result;
  // Säkerhetsgranskning: tiden kunden ser binds här på servern; claimIn
  // bokar bara exakt den (annars `taken`).
  const shownStart = offer.start;
  const staffName =
    (await loadStaffName(offer.businessId, offer.staffId)) ?? "";

  async function claimOffer(): Promise<ClaimActionResult> {
    "use server";
    const ip = await getClientIp();
    const allowed = await hitRateLimit({
      scope: "waitlist-claim:ip",
      subject: ip,
      windowSeconds: CLAIM_IP_WINDOW_SECONDS,
      max: CLAIM_IP_MAX,
    });
    if (!allowed) return { ok: false, code: "rate_limited" };
    const claimResult = await claimWaitlistOffer(
      token,
      shownStart,
      systemClock(),
    );
    if (claimResult.ok) {
      // Bekräftelsen (reservaConfirmada/solicitudRecibida) går ut inom 1 min
      // oberoende av cronen — samma mönster som `/r/[token]`:s
      // `cancelReservation` och `[slug]/actions.ts`:s `createBooking`.
      void kickOutbox();
    }
    return claimResult;
  }

  return (
    <OfferScreen
      kind="offer"
      offer={offer}
      staffName={staffName}
      now={now.toISOString()}
      onClaim={claimOffer}
    />
  );
}
