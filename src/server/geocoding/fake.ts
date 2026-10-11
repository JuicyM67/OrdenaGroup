import "server-only";

import { createHash } from "node:crypto";

import type { GeocodeHit, GeocodeQuery, Geocoder } from "./types";

/**
 * Lokal/e2e-geokodare (`GEOCODING_PROVIDER=fake`): inga nätverksanrop.
 * Deterministisk punkt inom ~3 km från stadens centrum, härledd ur adressen,
 * så att kartan och "närmast först" går att utveckla utan Nominatim.
 */
const CENTERS = {
  se: { lat: 59.3293, lng: 18.0686 },
  cl: { lat: -33.4263, lng: -70.611 },
} as const;

export const fakeGeocoder: Geocoder = {
  name: "fake",
  minIntervalMs: 0,
  async geocode(query: GeocodeQuery): Promise<GeocodeHit | null> {
    const h = createHash("sha256")
      .update(`${query.address}|${query.comuna}`)
      .digest();
    const dx = (h.readUInt16BE(0) / 0xffff - 0.5) * 0.05;
    const dy = (h.readUInt16BE(2) / 0xffff - 0.5) * 0.05;
    const c = CENTERS[query.country];
    return {
      lat: Math.round((c.lat + dy) * 1e5) / 1e5,
      lng: Math.round((c.lng + dx) * 1e5) / 1e5,
      areaName: query.comuna,
    };
  },
};
