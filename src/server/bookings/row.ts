import "server-only";

import type { Queryable } from "@/server/db/pool";
import type { BookingStatus } from "@/server/scheduling/types";

import { hashManageToken } from "./token";

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
  businessActive: boolean;
};

/**
 * Vilken bokning: ägaren anger id (RLS gäller), kunden bara länkens token.
 * Kunden kan alltså aldrig nå en bokning genom att gissa ett id.
 */
export type BookingRef = { bookingId: string } | { manageToken: string };

type Row = {
  id: string;
  staff_id: string;
  service_id: string;
  status: BookingStatus;
  s: number;
  pe: number;
  be: number;
  price_clp: number;
  cancel_window_hours: number;
  business_status: string;
};

/**
 * Låser bokningsraden (`for update`) i företaget. `business_id = $1` filtrerar
 * bort andra företag även med service role; med ägarens roll gör RLS det också.
 */
export async function lockBooking(
  q: Queryable,
  businessId: string,
  ref: BookingRef,
): Promise<LockedBooking | undefined> {
  const [column, value] =
    "manageToken" in ref
      ? (["manage_token_hash", hashManageToken(ref.manageToken)] as const)
      : (["id", ref.bookingId] as const);
  const r = await q.query<Row>(
    `select bk.id, bk.staff_id, bk.service_id, bk.status::text as status,
            bk.price_clp,
            extract(epoch from lower(bk.period))::float8 * 1000 as s,
            extract(epoch from upper(bk.period))::float8 * 1000 as pe,
            extract(epoch from upper(bk.blocked))::float8 * 1000 as be,
            b.cancel_window_hours, b.status::text as business_status
       from public.bookings bk
       join public.businesses b on b.id = bk.business_id
      where bk.business_id = $1 and b.id = $1 and bk.${column} = $2
      for update of bk`,
    [businessId, value],
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
    businessActive: x.business_status === "active",
  };
}

/** Kunden får flytta/avboka fram till start − cancel_window_hours. */
export function insideCancelWindow(
  b: Pick<LockedBooking, "start" | "cancelWindowHours">,
  now: Date,
): boolean {
  return now.getTime() <= b.start - b.cancelWindowHours * 3_600_000;
}

/** Kund och ägare får flytta/avboka (WP-45: även en väntande förfrågan). */
export const CHANGEABLE: readonly BookingStatus[] = [
  "requested",
  "confirmed",
  "pending_payment",
];
