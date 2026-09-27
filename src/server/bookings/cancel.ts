import "server-only";

import type { Queryable } from "@/server/db/pool";
import { err, ok, type Result } from "@/server/scheduling/result";
import { runAs } from "@/server/scheduling/run";
import {
  cancelBookingInputSchema,
  type CancelBookingInput,
} from "@/server/scheduling/schemas";

import { CHANGEABLE, insideCancelWindow, lockBooking } from "./row";
import type { BookingError, Freed } from "./types";

/**
 * Avbokar. Idempotent: redan avbokad → ok med `freed = null`. Kunden bara
 * fram till start − cancel_window_hours; ägaren alltid. `cancelled_at` är den
 * injicerade klockan. Väntelistan (WP-23) anropas inte här.
 */
export async function cancelBooking(
  raw: CancelBookingInput,
): Promise<Result<{ bookingId: string; freed: Freed | null }, BookingError>> {
  const p = cancelBookingInputSchema.safeParse(raw);
  if (!p.success) return err("invalid_input");
  const input = p.data;
  return runAs(input.actor, (q) => cancelIn(q, input));
}

async function cancelIn(
  q: Queryable,
  input: ReturnType<typeof cancelBookingInputSchema.parse>,
): Promise<Result<{ bookingId: string; freed: Freed | null }, BookingError>> {
  const b = await lockBooking(q, input.businessId, input.bookingId);
  if (!b) return err("not_found");
  if (b.status === "cancelled") return ok({ bookingId: b.id, freed: null });
  if (!CHANGEABLE.includes(b.status)) return err("invalid_status");
  if (input.by === "customer" && !insideCancelWindow(b, input.now)) {
    return err("outside_cancel_window");
  }
  await q.query(
    `update public.bookings
        set status = 'cancelled', cancelled_at = $3, cancel_reason = $4,
            pending_expires_at = null
      where business_id = $1 and id = $2`,
    [input.businessId, b.id, input.now, input.reason ?? null],
  );
  return ok({
    bookingId: b.id,
    freed: {
      staffId: b.staffId,
      blocked: { start: b.start, end: b.blockedEnd },
    },
  });
}
