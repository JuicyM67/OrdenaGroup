import "server-only";

import { createManageToken, hashManageToken } from "@/server/bookings/token";

/**
 * Väntelistans erbjudandelänk (`/v/[token]`): samma form som bokningens
 * länk-token — 32 slumpbyte som base64url (43 tecken), bara SHA-256 sparas
 * i `waitlist_entries.offer_token_hash`. Klartexten finns bara i händelsen
 * `waitlist_offer` (och i meddelandet till kunden), loggas aldrig.
 */
export function createOfferToken(): { token: string; hash: Buffer } {
  return createManageToken();
}

export function hashWaitlistToken(token: string): Buffer {
  return hashManageToken(token);
}

const SHAPE = /^[A-Za-z0-9_-]{43}$/;

/** Formkontroll innan någon fråga körs (skräp slår aldrig mot DB). */
export function isWaitlistTokenShape(token: unknown): token is string {
  return typeof token === "string" && SHAPE.test(token);
}
