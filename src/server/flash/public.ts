import "server-only";

import type { BookingPageData } from "@/components/booking/types";
import type { BookingSelection } from "@/components/booking/flow-state";
import { can } from "@/config/plans";
import { memberDiscountMinor } from "@/server/bookings/member";
import type { Queryable } from "@/server/db/pool";

/**
 * WP-30 (F13): flash-tider på den publika sidan `/{slug}` (service role,
 * explicit `business_id`). Allt räknas på servern: märket och flashpriset
 * följer med i sidans data, klienten räknar aldrig ut något pris.
 */

export type PublicFlashSlot = {
  id: string;
  staffId: string;
  /** UTC ms. */
  start: number;
  end: number;
  /** `null` = alla tjänster. */
  serviceIds: readonly string[] | null;
  discountPct: number;
};

/** Aktiva flash-tider som inte är slut än (`ends_at > now`). */
export async function loadActiveFlashSlotsIn(
  q: Queryable,
  businessId: string,
  now: Date,
): Promise<PublicFlashSlot[]> {
  // WP-73 (D-048): blixttider visas bara när planen har dem.
  const plan = await q.query<{ plan: string }>(
    `select plan::text as plan from public.businesses where id = $1`,
    [businessId],
  );
  if (!can(plan.rows[0]?.plan ?? "free", "flash")) return [];
  const r = await q.query<{
    id: string;
    staff_id: string;
    s: number;
    e: number;
    service_ids: string[] | null;
    pct: number;
  }>(
    `select id, staff_id, service_ids, discount_pct::int as pct,
            extract(epoch from starts_at)::float8 * 1000 as s,
            extract(epoch from ends_at)::float8 * 1000 as e
       from public.flash_slots
      where business_id = $1 and status = 'active' and ends_at > $2
      order by starts_at`,
    [businessId, now],
  );
  return r.rows.map((x) => ({
    id: x.id,
    staffId: x.staff_id,
    start: Math.round(x.s),
    end: Math.round(x.e),
    serviceIds: x.service_ids,
    discountPct: x.pct,
  }));
}

/**
 * Flash-tiden som en kundtid träffar — samma regel som `createIn`
 * (profesionalen kan ta tiden, start i [start, end), tjänsten tillåten).
 */
export function flashForSlot(
  flashes: readonly PublicFlashSlot[],
  slot: { start: number; staffIds: readonly string[] },
  serviceId: string,
): PublicFlashSlot | undefined {
  return flashes.find(
    (f) =>
      f.start <= slot.start &&
      slot.start < f.end &&
      slot.staffIds.includes(f.staffId) &&
      (f.serviceIds === null || f.serviceIds.includes(serviceId)),
  );
}

/** Flashpriset (heltal, samma avrundning som rabatten i `createIn`). */
export function flashPrice(priceClp: number, pct: number): number {
  return priceClp - memberDiscountMinor(priceClp, pct);
}

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export function isFlashIdShape(v: unknown): v is string {
  return typeof v === "string" && UUID.test(v);
}

/**
 * `/{slug}?flash=<id>`: förvalet (tjänst, profesional, dag, tid) för
 * flash-tiden, ur den redan byggda sidans data — första tillåtna tjänsten
 * som har en flashprissatt tid i fönstret hos flash-profesionalen.
 * `undefined` = tiden finns inte (längre): sidan visas som vanligt.
 */
export function flashSelection(
  data: BookingPageData,
  flash: PublicFlashSlot,
): BookingSelection | undefined {
  for (const service of data.services) {
    if (flash.serviceIds !== null && !flash.serviceIds.includes(service.id)) {
      continue;
    }
    const days = data.availability[service.id]?.[flash.staffId] ?? [];
    for (const day of days) {
      for (const slot of day.slots) {
        const t = new Date(slot.start).getTime();
        if (
          slot.discountPct !== undefined &&
          flash.start <= t &&
          t < flash.end
        ) {
          return {
            serviceId: service.id,
            staffId: flash.staffId,
            date: day.date,
            slotId: slot.id,
          };
        }
      }
    }
  }
  return undefined;
}
