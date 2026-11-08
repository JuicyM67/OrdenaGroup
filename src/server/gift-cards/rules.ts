import "server-only";

import { createHash, randomBytes, randomInt } from "node:crypto";

// WP-87 (D-073): rena regler för tarjetas de regalo (koden, länkens token,
// datumformatet). Samma kodform som SE:s presentkort (WP-77, D-058).
import { GIFT_CARD_PREFIX } from "@/config/gift-cards";
import {
  APP_TZ,
  formatDate,
  parseTimeZone,
  toLocalDate,
  type TimeZone,
} from "@/lib/format/dates";

/** Crockford base32 (utan I, L, O, U): lätt att läsa upp och skriva av. */
export const GIFT_CARD_ALPHABET = "0123456789ABCDEFGHJKMNPQRSTVWXYZ";

/** `TR-XXXX-XXXX-XXXX`: 12 tecken Crockford base32 = 60 bitar. Koden ensam
 * ger åtkomst till pengar, därför lång. `rand` ger ett heltal i [0, n) —
 * `crypto.randomInt` i produktion. */
export function generateGiftCardCode(
  rand: (n: number) => number = randomInt,
): string {
  let body = "";
  for (let i = 0; i < 12; i++) {
    body += GIFT_CARD_ALPHABET[rand(GIFT_CARD_ALPHABET.length)];
  }
  return `${GIFT_CARD_PREFIX}-${body.slice(0, 4)}-${body.slice(4, 8)}-${body.slice(8)}`;
}

export const GIFT_CARD_CODE_RE =
  /^[A-Z]{2}-[0-9A-HJKMNP-TV-Z]{4}-[0-9A-HJKMNP-TV-Z]{4}-[0-9A-HJKMNP-TV-Z]{4}$/;

/** Samma normalisering som `private.gift_card_normalize_code` (versaler,
 * O→0, I/L→1, utan mellanslag/streck). `null` = fel form. */
export function normalizeGiftCardCode(raw: string): string | null {
  const x = raw
    .replace(/[^A-Za-z0-9]/g, "")
    .toUpperCase()
    .replace(/O/g, "0")
    .replace(/[IL]/g, "1");
  if (x.length !== 14) return null;
  const out = `${x.slice(0, 2)}-${x.slice(2, 6)}-${x.slice(6, 10)}-${x.slice(10)}`;
  return GIFT_CARD_CODE_RE.test(out) ? out : null;
}

/** Länkens engångstoken: 32 slumpbyte (base64url, 43 tecken). Databasen har
 * bara SHA-256 (D-029-mönstret). */
export function newGiftCardToken(): string {
  return randomBytes(32).toString("base64url");
}

export function hashGiftCardToken(token: string): Buffer {
  return createHash("sha256").update(token, "utf8").digest();
}

export function isGiftCardTokenShape(t: unknown): t is string {
  return typeof t === "string" && /^[A-Za-z0-9_-]{32,64}$/.test(t);
}

export type GiftCardStatus =
  "active" | "refunding" | "refunded" | "expired" | "disputed" | "depleted";

export function tzOrDefault(raw: string | null | undefined): TimeZone {
  const r = raw ? parseTimeZone(raw) : undefined;
  return r?.ok ? r.value : APP_TZ;
}

/** "7 de noviembre de 2027" (giltighet, försäljningsdag). */
export function formatGiftCardDate(instant: Date, tz: TimeZone): string {
  const year = toLocalDate(instant, tz).slice(0, 4);
  return `${formatDate(instant, tz, "dayMonthLong")} de ${year}`;
}
