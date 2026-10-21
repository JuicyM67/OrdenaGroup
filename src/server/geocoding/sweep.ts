import "server-only";

import { createHash } from "node:crypto";

import { marketplaceEnabled } from "@/config/marketplace";
import { APP_TZ } from "@/lib/format/dates";
import { hitRateLimit } from "@/server/db/rate-limit";
import { withServiceTx } from "@/server/db/tx";

import { areaSlug } from "./area";
import { getGeocoder } from "./provider";
import type { Geocoder } from "./types";

/**
 * WP-68 (D-055): geokodningssvepet i `/api/cron/outbox`. Tar några få
 * företag med `geocode_status = 'pending'` och en adress, ett i taget med
 * minst `minIntervalMs` emellan (Nominatim: 1 anrop/s) och en global
 * räknare i `private.hit_rate_limit` (flera instanser/marknader delar inte
 * process). Ett nätverksfel avbryter passet (raden förblir `pending`).
 * `manual` (ägaren/seed satt nålen) rörs aldrig.
 *
 * Bara aktiva företag utan begärd radering som har ett publicerat
 * erbjudande eller visar blixttider i Upptäck (S5) geokodas. Varje
 * skrivning sker per `id`.
 */

export const GEOCODE_SWEEP_LIMIT = 20;
/** Standardbudget per pass (cron-routen skickar en kortare). */
const SWEEP_BUDGET_MS = 25_000;

export type GeocodeSweepResult = {
  ok: number;
  notFound: number;
  skipped: number;
};

function addressHash(address: string, comuna: string): string {
  return createHash("sha256")
    .update(`${address.trim()}|${comuna.trim()}`, "utf8")
    .digest("hex");
}

const sleep = (ms: number): Promise<void> =>
  new Promise((resolve) => setTimeout(resolve, ms));

async function waitForSlot(geocoder: Geocoder): Promise<boolean> {
  if (geocoder.minIntervalMs === 0) return true;
  for (let i = 0; i < 3; i += 1) {
    const allowed = await hitRateLimit({
      scope: `geocode:${geocoder.name}`,
      subject: "global",
      windowSeconds: Math.ceil(geocoder.minIntervalMs / 1000),
      max: 1,
    });
    if (allowed) return true;
    await sleep(geocoder.minIntervalMs);
  }
  return false;
}

export async function runGeocodeSweep(
  opts: { limit?: number; geocoder?: Geocoder | null; budgetMs?: number } = {},
): Promise<GeocodeSweepResult> {
  const result: GeocodeSweepResult = { ok: 0, notFound: 0, skipped: 0 };
  // Marknadsplatsen avstängd (nödbromsen) — inga anrop i onödan.
  if (!marketplaceEnabled()) return result;
  const geocoder = opts.geocoder === undefined ? getGeocoder() : opts.geocoder;
  if (!geocoder) return result;
  const limit = Math.min(
    opts.limit ?? GEOCODE_SWEEP_LIMIT,
    GEOCODE_SWEEP_LIMIT,
  );
  const tz = APP_TZ;

  const pending = await withServiceTx(async (q) => {
    const r = await q.query<{ id: string; address: string; comuna: string }>(
      `select id, address, comuna from public.businesses
        where geocode_status = 'pending' and address is not null
          and status = 'active' and timezone = $1
          and deletion_requested_at is null
          and ((marketplace_flash_visible
                and private.plan_has_feature(plan::text, 'flash'))
               or exists (select 1 from public.offers o
                           where o.business_id = businesses.id
                             and o.status = 'published'))
        order by updated_at
        limit $2`,
      [tz, limit],
    );
    return r.rows;
  });

  const started = Date.now();
  let first = true;
  for (const row of pending) {
    // Nästa anrop (intervall + nätverk) ska rymmas i budgeten.
    if (
      Date.now() - started + geocoder.minIntervalMs >
      (opts.budgetMs ?? SWEEP_BUDGET_MS)
    ) {
      break;
    }
    // Alltid minst `minIntervalMs` mellan två anrop från den här processen,
    // även när den globala räknaren är avstängd (E2E_DISABLE_RATE_LIMITS).
    if (!first) await sleep(geocoder.minIntervalMs);
    first = false;
    const hash = addressHash(row.address, row.comuna);
    if (!(await waitForSlot(geocoder))) {
      result.skipped += 1;
      break;
    }
    const hit = await geocoder.geocode({
      address: row.address,
      comuna: row.comuna,
      country: "cl",
    });
    await withServiceTx(async (q) => {
      // Bara om raden fortfarande väntar (ägaren kan ha satt nålen under tiden).
      if (hit) {
        await q.query(
          `update public.businesses
              set lat = $2, lng = $3, area_name = $4, area_slug = $5,
                  geocode_status = 'ok', geocoded_at = now(),
                  geocode_address_hash = $6
            where id = $1 and geocode_status = 'pending'`,
          [
            row.id,
            hit.lat,
            hit.lng,
            hit.areaName,
            areaSlug(hit.areaName),
            hash,
          ],
        );
      } else {
        await q.query(
          `update public.businesses
              set geocode_status = 'not_found', geocoded_at = now(),
                  geocode_address_hash = $2
            where id = $1 and geocode_status = 'pending'`,
          [row.id, hash],
        );
      }
    });
    if (hit) result.ok += 1;
    else result.notFound += 1;
  }
  return result;
}
