// Tarjetas de regalo (WP-87, D-073): gränser och standardval. Inga texter här —
// de finns i `src/i18n/es-CL.regalo.ts`. Ruttsökvägarna finns i `routes.ts`.
// Databasen (`private.gift_card_issue_in_store`) kontrollerar samma gränser.

/** Förvalda belopp i pesos (snabbval i Caja). */
export const GIFT_CARD_PRESETS_CLP: readonly number[] = [
  10000, 20000, 30000, 50000,
];
/** Valfritt belopp, hela pesos. */
export const GIFT_CARD_MIN_CLP = 1000;
export const GIFT_CARD_MAX_CLP = 1000000;
/**
 * Giltighet från köpdagen (t.o.m. samma kalenderdag, 23:59:59 lokal tid).
 * D-073: 12 månader (SE: 24, D-058). Databasen accepterar 6–36.
 */
export const GIFT_CARD_VALIDITY_MONTHS = 12;
/** Hälsningen (fri text som plattformen skickar): max längd. */
export const GIFT_CARD_GREETING_MAX = 300;
export const GIFT_CARD_NAME_MAX = 80;
/** Kodens prefix (`TR-XXXX-XXXX-XXXX`, "tarjeta de regalo"). */
export const GIFT_CARD_PREFIX = "TR";

/** Designerna i salongen (SE:s "Foto" kräver omslagsbild, inte i v1). */
export const GIFT_CARD_THEMES = ["lilac", "lime"] as const;
export type GiftCardTheme = (typeof GIFT_CARD_THEMES)[number];

/** Samma värden som kassans manuella metoder (`MANUAL_METHODS`). */
export const GIFT_CARD_SALE_METHODS = [
  "cash",
  "card_terminal",
  "transfer",
] as const;
export type GiftCardSaleMethod = (typeof GIFT_CARD_SALE_METHODS)[number];
