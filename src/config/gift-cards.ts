// Presentkort (WP-77, D-058): gränser och flaggor. Inga texter här — de finns i
// `src/i18n/*.regalo.ts`. Ruttsökvägarna finns i `routes.ts`.
import { market, type Market } from "./brand";

/** Förvalda belopp i hela kronor (ägarens beslut 2026-10-11). */
export const GIFT_CARD_PRESETS_SEK: readonly number[] = [300, 500, 1000];
/** Valfritt belopp, hela kronor. */
export const GIFT_CARD_MIN_SEK = 100;
export const GIFT_CARD_MAX_SEK = 5000;
/** Giltighet från köpdagen (t.o.m. samma kalenderdag, 23:59:59 lokal tid). */
export const GIFT_CARD_VALIDITY_MONTHS = 24;
/** Schemalagd leverans högst så här många dagar fram, kl. 08:00 lokal tid. */
export const GIFT_CARD_DELIVERY_MAX_DAYS = 90;
export const GIFT_CARD_DELIVERY_LOCAL_TIME = "08:00";
/** Hälsningen (fri text som plattformen skickar): max längd. */
export const GIFT_CARD_GREETING_MAX = 300;
export const GIFT_CARD_NAME_MAX = 80;
/** Kodens prefix (`PK-XXXX-XXXX-XXXX`). */
export const GIFT_CARD_PREFIX = "PK";

export const GIFT_CARD_THEMES = ["lime", "lilac", "photo"] as const;
export type GiftCardTheme = (typeof GIFT_CARD_THEMES)[number];

/** Bara SE (CL: dolt, Mercado Pago senare). Stripe-nyckeln kontrolleras på
 * servern (`giftCardsEnabled`). */
export function giftCardsMarket(m: Market = market): boolean {
  return m === "SE";
}
