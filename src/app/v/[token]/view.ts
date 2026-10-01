/**
 * Vy-modell för väntelistans erbjudandelänk `/v/[token]` (WP-23, D-029).
 * Rena funktioner: klockan injiceras, aldrig `new Date()` här — samma
 * mönster som `src/components/booking/manage-view.ts`.
 *
 * `WaitlistOfferView`/`ClaimWaitlistResult` importeras bara som TYP
 * (`import type`): `@/server/waitlist` har `import "server-only"` som
 * värde-import, men ett typ-only-import raderas helt vid kompilering och
 * drar aldrig in den koden i klientbunten (samma motivering som
 * `manage-view.ts`). Den här filen saknar "use client" och är den
 * godkända indirektionspunkten — `offer-screen.tsx` (klientkomponent)
 * importerar typerna härifrån i stället för direkt från `@/server/waitlist`.
 */
import { parseInstant } from "@/lib/format/dates";
import type {
  ClaimWaitlistResult,
  WaitlistOfferView,
} from "@/server/waitlist";

export type { ClaimWaitlistResult, WaitlistOfferView };

/** `page.tsx`s `claimOffer`-server action: samma koder som
 * `ClaimWaitlistResult`, plus `rate_limited` (pilotblockeraren, satt här —
 * `claimWaitlistOffer` i `@/server/waitlist` känner inte till IP-spärren). */
export type ClaimActionResult =
  | ClaimWaitlistResult
  | { ok: false; code: "rate_limited" };

/** ISO-sträng (med offset) → Date, kastar på ogiltig instant. Kommer alltid
 * från servern (`page.tsx`), så det här borde aldrig hända. */
export function mustParseInstant(iso: string, fn: string): Date {
  const r = parseInstant(iso);
  if (!r.ok) {
    throw new RangeError(`${fn}: instant ogiltig "${iso}" (${r.error})`);
  }
  return r.value;
}

/** Vad sidan visar (utöver ett giltigt, obesvarat erbjudande). `offer.ok ===
 * false` i `getWaitlistOffer` ger ingen erbjudandedata (`taken`/`expired`/
 * `booked`) — `invalid` är ett 404-läge (`notFound()` i `page.tsx`), inte
 * ett eget skärmläge här. */
export type OfferScreenState = "taken" | "expired" | "booked";

/** Minuter:sekunder kvar till `expiresAt`, aldrig negativt. */
export function remainingParts(
  expiresAt: string,
  now: Date,
): { minutos: number; segundos: number; done: boolean } {
  const ms = Math.max(
    0,
    mustParseInstant(expiresAt, "remainingParts").getTime() - now.getTime(),
  );
  const totalSeconds = Math.ceil(ms / 1000);
  return {
    minutos: Math.floor(totalSeconds / 60),
    segundos: totalSeconds % 60,
    done: ms <= 0,
  };
}
