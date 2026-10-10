import "server-only";

import { z } from "zod";

import { brand } from "@/config/brand";

import { pickAreaName } from "./area";
import type { GeocodeHit, GeocodeQuery, Geocoder } from "./types";

/**
 * Nominatim/OpenStreetMap (D-056). Användarpolicyn: högst 1 anrop/s, en
 * identifierande `User-Agent` med kontaktadress, inga massanrop — svepet
 * (`sweep.ts`) tar några få `pending` per cron-pass och håller avståndet
 * globalt via `hitRateLimit`. Resultaten får lagras permanent (ODbL) med
 * attribution "© OpenStreetMap" (kartan och erbjudandesidan visar den).
 * Bara adressen skickas — ingen persondata.
 */

const ENDPOINT =
  process.env.NOMINATIM_URL ?? "https://nominatim.openstreetmap.org/search";

const hitSchema = z.object({
  lat: z.string(),
  lon: z.string(),
  address: z.record(z.string(), z.string()).optional(),
});

const responseSchema = z.array(hitSchema);

function userAgent(): string {
  const contact =
    process.env.NOMINATIM_CONTACT_EMAIL ?? brand.legal.contactEmail;
  return `${brand.name.replace(/\s+/g, "")}-geocoder/1.0 (${contact})`;
}

/** Nominatims svar → träff (exporterad för test). */
export function parseNominatim(
  body: unknown,
  fallbackArea: string,
): GeocodeHit | null {
  const parsed = responseSchema.safeParse(body);
  if (!parsed.success) throw new Error("nominatim: oväntat svar");
  const first = parsed.data[0];
  if (!first) return null;
  const lat = Number(first.lat);
  const lng = Number(first.lon);
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null;
  return {
    lat: Math.round(lat * 1e5) / 1e5,
    lng: Math.round(lng * 1e5) / 1e5,
    areaName: pickAreaName(first.address ?? {}) ?? fallbackArea,
  };
}

export const nominatimGeocoder: Geocoder = {
  name: "nominatim",
  minIntervalMs: 1100,
  async geocode(query: GeocodeQuery): Promise<GeocodeHit | null> {
    const url = new URL(ENDPOINT);
    url.searchParams.set("format", "jsonv2");
    url.searchParams.set("addressdetails", "1");
    url.searchParams.set("limit", "1");
    url.searchParams.set("countrycodes", query.country);
    url.searchParams.set("q", `${query.address}, ${query.comuna}`);
    const res = await fetch(url, {
      headers: {
        "User-Agent": userAgent(),
        "Accept-Language": query.country === "se" ? "sv" : "es",
      },
      signal: AbortSignal.timeout(8000),
      cache: "no-store",
    });
    if (!res.ok) throw new Error(`nominatim: HTTP ${res.status}`);
    return parseNominatim(await res.json(), query.comuna);
  },
};
