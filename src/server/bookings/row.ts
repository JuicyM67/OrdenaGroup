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
  /** WP-56: `businesses.cancel_approval`. */
  cancelApproval: CancelApproval;
  businessActive: boolean;
};

/** WP-56: när kundens avbokning kräver företagets godkännande. */
export type CancelApproval = "none" | "late" | "all";

export function toCancelApproval(v: string): CancelApproval {
  return v === "late" || v === "all" ? v : "none";
}

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
  cancel_approval: string;
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
            b.cancel_window_hours, b.cancel_approval,
            b.status::text as business_status
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
    cancelApproval: toCancelApproval(x.cancel_approval),
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

/** WP-56: statusar kunden kan begära avbokning från. En förfrågan
 * (`requested`) avbokas som förut utan godkännande. `pending_payment` är
 * medvetet utanför: `bookings_pending_expires_at_check` kräver att
 * `pending_expires_at` nollas när statusen lämnar `pending_payment`, och
 * handpenningen (WP-25) finns inte än — tas med när den landar. */
export const CANCEL_REQUESTABLE: readonly BookingStatus[] = ["confirmed"];

/**
 * WP-56: blir kundens avbokning NU en förfrågan (`cancel_requested`) i
 * stället för en direkt avbokning? `all` = alltid; `late` = när
 * start − now < cancel_window_hours (alltså utanför det vanliga fönstret).
 * Aldrig efter start (då finns inget att avboka) och bara från
 * `CANCEL_REQUESTABLE`. Ren funktion.
 */
export function customerCancelNeedsApproval(
  b: Pick<
    LockedBooking,
    "start" | "cancelWindowHours" | "cancelApproval" | "status"
  >,
  now: Date,
): boolean {
  if (!CANCEL_REQUESTABLE.includes(b.status)) return false;
  if (now.getTime() >= b.start) return false;
  if (b.cancelApproval === "all") return true;
  return b.cancelApproval === "late" && !insideCancelWindow(b, now);
}
