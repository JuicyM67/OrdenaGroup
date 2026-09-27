import "server-only";

import type { Queryable } from "@/server/db/pool";

import type { BookingStatus } from "@/server/scheduling/types";

export type LockedBooking = {
  id: string;
  staffId: string;
  serviceId: string;
  status: BookingStatus;
  start: number;
  periodEnd: number;
  blockedEnd: number;
  priceClp: number;
  cancelWindowHours: number;
};

/**
 * Låser bokningsraden (`for update`) i företaget. Med service role filtrerar
 * `business_id = $1` bort andra företag; med ägarens roll gör RLS det också.
 */
export async function lockBooking(
  q: Queryable,
  businessId: string,
  bookingId: string,
): Promise<LockedBooking | undefined> {
  const r = await q.query<{
    id: string;
    staff_id: string;
    service_id: string;
    status: BookingStatus;
    s: number;
    pe: number;
    be: number;
    price_clp: number;
    cancel_window_hours: number;
  }>(
    `select bk.id, bk.staff_id, bk.service_id, bk.status::text as status,
            bk.price_clp,
            extract(epoch from lower(bk.period))::float8 * 1000 as s,
            extract(epoch from upper(bk.period))::float8 * 1000 as pe,
            extract(epoch from upper(bk.blocked))::float8 * 1000 as be,
            (select b.cancel_window_hours from public.businesses b
              where b.id = $1) as cancel_window_hours
       from public.bookings bk
      where bk.business_id = $1 and bk.id = $2
      for update of bk`,
    [businessId, bookingId],
  );
  const x = r.rows[0];
  if (!x) return undefined;
  return {
    id: x.id,
    staffId: x.staff_id,
    serviceId: x.service_id,
    status: x.status,
    start: Math.round(x.s),
    periodEnd: Math.round(x.pe),
    blockedEnd: Math.round(x.be),
    priceClp: x.price_clp,
    cancelWindowHours: x.cancel_window_hours,
  };
}

/** Kunden får flytta/avboka fram till start − cancel_window_hours. */
export function insideCancelWindow(
  b: Pick<LockedBooking, "start" | "cancelWindowHours">,
  now: Date,
): boolean {
  return now.getTime() <= b.start - b.cancelWindowHours * 3_600_000;
}

export const CHANGEABLE: readonly BookingStatus[] = [
  "confirmed",
  "pending_payment",
];
