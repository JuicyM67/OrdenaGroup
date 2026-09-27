import "server-only";

import type { Queryable } from "@/server/db/pool";
import { err, ok, type Result } from "@/server/scheduling/result";
import { runAs } from "@/server/scheduling/run";
import {
  customerCancelRequestSchema,
  engineContextSchema,
  ownerCancelRequestSchema,
  parseContext,
  type CancelBookingRequest,
  type EngineContext,
} from "@/server/scheduling/schemas";
import type { Actor } from "@/server/scheduling/types";

import {
  CHANGEABLE,
  insideCancelWindow,
  lockBooking,
  type BookingRef,
} from "./row";
import type { BookingError, Freed } from "./types";

type CancelResult = Result<
  { bookingId: string; freed: Freed | null },
  BookingError
>;

/**
 * Avbokar. Kunden identifierar bokningen med länkens token, ägaren med id
 * (`by` följer aktören). Idempotent: redan avbokad → ok med `freed = null`.
 * Kunden bara fram till start − cancel_window_hours (även om företaget är
 * fryst); ägaren alltid. `cancelled_at` är den injicerade klockan.
 * Väntelistan (WP-23) anropas inte här.
 */
export async function cancelBooking(
  request: CancelBookingRequest,
  ctx: EngineContext,
): Promise<CancelResult> {
  const c = parseContext(engineContextSchema, ctx);
  let ref: BookingRef;
  let reason: string | undefined;
  if (c.actor.kind === "customer") {
    const p = customerCancelRequestSchema.safeParse(request);
    if (!p.success) return err("invalid_input");
    ref = { manageToken: p.data.manageToken };
    reason = p.data.reason;
  } else {
    const p = ownerCancelRequestSchema.safeParse(request);
    if (!p.success) return err("invalid_input");
    ref = { bookingId: p.data.bookingId };
    reason = p.data.reason;
  }
  const input = { ...c, ref, reason };
  return runAs(c.actor, (q) => cancelIn(q, input));
}

export type CancelInput = {
  businessId: string;
  ref: BookingRef;
  reason?: string | undefined;
  actor: Actor;
  now: Date;
};

/** Inre steg (för tester): kör i anroparens transaktion. */
export async function cancelIn(
  q: Queryable,
  input: CancelInput,
): Promise<CancelResult> {
  const b = await lockBooking(q, input.businessId, input.ref);
  if (!b) return err("not_found");
  if (b.status === "cancelled") return ok({ bookingId: b.id, freed: null });
  if (!CHANGEABLE.includes(b.status)) return err("invalid_status");
  if (input.actor.kind === "customer" && !insideCancelWindow(b, input.now)) {
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
