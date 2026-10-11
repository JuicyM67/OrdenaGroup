// Upptäck (WP-68): visningsformat för avstånd, betyg och tider i installationens
// språk. Pengar via `formatMoney` (heltal i minsta enheten), tid via `dates.ts` (D-018).
import { marketConfig } from "@/config/market";
import { APP_TZ, formatTime } from "@/lib/format/dates";

const oneDecimal = new Intl.NumberFormat(marketConfig.locale, {
  minimumFractionDigits: 1,
  maximumFractionDigits: 1,
});

/** "0,4" / "12,0" (km, en decimal). */
export function formatKm(km: number): string {
  return oneDecimal.format(km);
}

/** "4,9" (snittbetyg, en decimal). */
export function formatRating(avg: number): string {
  return oneDecimal.format(avg);
}

/** "17:15" i installationens tidszon. */
export function formatClock(ms: number): string {
  return formatTime(new Date(ms), APP_TZ);
}
