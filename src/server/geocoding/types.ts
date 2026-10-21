import "server-only";

/**
 * WP-68 (D-055): geokodning bakom ett litet gränssnitt, så att byte av
 * leverantör (Nominatim → LocationIQ/Mapbox/Google) är en fil.
 */

export type GeocodeQuery = {
  /** Gatuadress som ägaren skrivit (`businesses.address`). */
  address: string;
  /** Kommun/stadsdel/comuna (`businesses.comuna`). */
  comuna: string;
  /** ISO 3166-1 alfa-2, gemener (bara Chile). */
  country: "cl";
};

export type GeocodeHit = {
  lat: number;
  lng: number;
  /** Stadsdel/ort att visa ("Providencia"). */
  areaName: string;
};

/** `null` = adressen hittades inte (→ `not_found`, ägaren kan sätta nålen
 * manuellt). Nätverks-/kvotfel kastas (raden förblir `pending`). */
export interface Geocoder {
  readonly name: string;
  /** Minsta tid mellan två anrop (ms), t.ex. 1 000 för Nominatim. */
  readonly minIntervalMs: number;
  geocode(query: GeocodeQuery): Promise<GeocodeHit | null>;
}
