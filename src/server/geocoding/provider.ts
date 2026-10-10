import "server-only";

import { fakeGeocoder } from "./fake";
import { nominatimGeocoder } from "./nominatim";
import type { Geocoder } from "./types";

/**
 * Vald geokodare (`GEOCODING_PROVIDER`): `nominatim`, `fake` eller `off`.
 * Standard: Nominatim bara på Vercel (staging/prod), annars av — lokalt och i
 * CI görs aldrig externa anrop av misstag.
 */
export function getGeocoder(): Geocoder | null {
  const p =
    process.env.GEOCODING_PROVIDER ??
    (process.env.VERCEL === "1" ? "nominatim" : "off");
  if (p === "nominatim") return nominatimGeocoder;
  if (p === "fake") return fakeGeocoder;
  return null;
}
