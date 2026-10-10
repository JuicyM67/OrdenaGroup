import "server-only";

/**
 * WP-67 (D-054): `private.my_bookings()`-rader → det kundkontot visar. Ren
 * funktion (testbar utan databas). Avbokningsreglerna är exakt desamma som
 * länken `/r/[token]` (`manage.ts`): fönstret och WP-56-förfrågan.
 */
import type { BookingStatus } from "@/server/scheduling/types";

import {
  CHANGEABLE,
  customerCancelNeedsApproval,
  insideCancelWindow,
  toCancelApproval,
} from "@/server/bookings/row";

/** En rad från `private.my_bookings()` (pg ger timestamptz som Date). */
export type MyBookingRow = {
  business_id: string;
  booking_id: string;
  business_name: string;
  slug: string;
  timezone: string;
  address: string | null;
  comuna: string;
  service_name: string;
  staff_name: string;
  starts_at: Date | string;
  ends_at: Date | string;
  status: string;
  price_clp: number;
  cancel_window_hours: number;
  cancel_approval: string;
  payment: string | null;
  review_rating: number | null;
  review_created_at: Date | string | null;
};

export type AccountPayment = "reserved" | "paid" | "refund";

export type AccountBooking = {
  bookingId: string;
  business: {
    name: string;
    slug: string;
    timezone: string;
    address: string | null;
    comuna: string;
  };
  serviceName: string;
  staffName: string;
  /** ISO UTC. */
  start: string;
  end: string;
  status: BookingStatus;
  priceClp: number;
  cancelWindowHours: number;
  upcoming: boolean;
  canCancel: boolean;
  cancelNeedsApproval: boolean;
  payment?: AccountPayment;
  /** Recensionen som finns (1–5), eller null. */
  reviewRating: number | null;
  /** Kan lämna (eller ändra) en recension från kontot nu (D-045). */
  reviewable: boolean;
};

const BOOKING_STATUSES: readonly BookingStatus[] = [
  "requested",
  "pending_payment",
  "confirmed",
  "completed",
  "no_show",
  "cancelled",
  "cancel_requested",
];

const DAY_MS = 24 * 60 * 60 * 1000;
/** Samma fönster som review-länken (D-045): 60 dagar, ändring i 7. */
const REVIEW_WINDOW_MS = 60 * DAY_MS;
const REVIEW_EDIT_MS = 7 * DAY_MS;

function toStatus(raw: string): BookingStatus {
  return BOOKING_STATUSES.find((s) => s === raw) ?? "cancelled";
}

function toPayment(
  raw: string | null,
  status: BookingStatus,
): AccountPayment | undefined {
  if (!raw) return undefined;
  if (raw === "voided" || raw === "refunded") return "refund";
  if (status === "cancelled") return "refund";
  return raw === "authorized" ? "reserved" : "paid";
}

function ms(v: Date | string): number {
  return v instanceof Date ? v.getTime() : new Date(v).getTime();
}

export function toAccountBooking(row: MyBookingRow, now: Date): AccountBooking {
  const status = toStatus(row.status);
  const start = ms(row.starts_at);
  const end = ms(row.ends_at);
  const cancelWindowHours = row.cancel_window_hours;
  const cancelNeedsApproval = customerCancelNeedsApproval(
    {
      start,
      cancelWindowHours,
      cancelApproval: toCancelApproval(row.cancel_approval),
      status,
    },
    now,
  );
  const canCancel =
    cancelNeedsApproval ||
    (CHANGEABLE.includes(status) &&
      insideCancelWindow({ start, cancelWindowHours }, now));
  const t = now.getTime();
  const done = status === "completed" || (status === "confirmed" && end <= t);
  const reviewOpen =
    row.review_created_at === null ||
    t - ms(row.review_created_at) <= REVIEW_EDIT_MS;
  const payment = toPayment(row.payment, status);
  return {
    bookingId: row.booking_id,
    business: {
      name: row.business_name,
      slug: row.slug,
      timezone: row.timezone,
      address: row.address,
      comuna: row.comuna,
    },
    serviceName: row.service_name,
    staffName: row.staff_name,
    start: new Date(start).toISOString(),
    end: new Date(end).toISOString(),
    status,
    priceClp: row.price_clp,
    cancelWindowHours,
    upcoming: end > t && status !== "cancelled" && status !== "no_show",
    canCancel,
    cancelNeedsApproval,
    ...(payment ? { payment } : {}),
    reviewRating: row.review_rating,
    reviewable: done && t - start <= REVIEW_WINDOW_MS && reviewOpen,
  };
}

/** Kommande först i tidsordning; tidigare senaste först. */
export function splitBookings(list: readonly AccountBooking[]): {
  upcoming: AccountBooking[];
  past: AccountBooking[];
} {
  const upcoming = list
    .filter((b) => b.upcoming)
    .sort((a, b) => a.start.localeCompare(b.start));
  const past = list
    .filter((b) => !b.upcoming)
    .sort((a, b) => b.start.localeCompare(a.start));
  return { upcoming, past };
}
