// "Comparte tu link" (WP-89, D-075): kanalerna ägaren lägger ut bokningslänken i och länken
// per kanal. Varje kanal får `?utm_source=<kanal>` så att källan syns i ett analysverktyg och
// kan sparas med bokningen om det byggs senare. I dag läser bokningssidan inte parametern
// (den ignoreras, sidan är densamma) och ingen statistik visas.

/** Ordningen i Ajustes → Comparte tu link (kanalerna salongerna i Chile använder mest först). */
export const SHARE_CHANNELS = [
  "instagram",
  "google",
  "whatsapp",
  "facebook",
  "tiktok",
] as const;

export type ShareChannel = (typeof SHARE_CHANNELS)[number];

/** Källan för QR-koden på disken/i skyltfönstret. */
export const QR_SOURCE = "qr";

/** `utm_source`-värdet per kanal: samma som kanalens id (gemener, utan mellanslag). */
export function shareLink(
  bookingUrl: string,
  source: ShareChannel | typeof QR_SOURCE,
): string {
  const url = new URL(bookingUrl);
  url.searchParams.set("utm_source", source);
  return url.toString();
}
