import "server-only";

import { DECLINE_REASON_MAX } from "@/lib/validation/requests";
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

import { actorMember, bookingPermOk, visibleButLocked } from "./authz";
import { emitBookingEvent } from "./events";
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
 * Väntelistan (WP-23) anropas inte här. Köar `cancelled` efter commit (WP-16).
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
  const result = await runAs(c.actor, (q) => cancelDetailedIn(q, input), {
    onForbidden: err("forbidden"),
  });
  if (!result.ok) return result;
  const { bookingId, freed, declined } = result.value;
  // WP-16: efter commit (enqueueBookingEvent kastar aldrig). En redan
  // avbokad bokning (`freed === null`) köar inget nytt. WP-45: ägarens
  // avbokning av en förfrågan är ett nekande → `declined`
  // (`solicitudRechazada`, motivet som `message`), aldrig "reserva cancelada".
  if (freed !== null) {
    if (declined) {
      const message = reason?.slice(0, DECLINE_REASON_MAX);
      await emitBookingEvent({
        type: "declined",
        bookingId,
        businessId: c.businessId,
        reason: "declined",
        ...(message ? { message } : {}),
      });
    } else {
      await emitBookingEvent({
        type: "cancelled",
        bookingId,
        businessId: c.businessId,
        by: c.actor.kind,
      });
    }
  }
  return ok({ bookingId, freed });
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
  const r = await cancelDetailedIn(q, input);
  return r.ok ? ok({ bookingId: r.value.bookingId, freed: r.value.freed }) : r;
}

/**
 * Som `cancelIn`, plus `declined`: ägaren avbokade en `requested` — det
 * sparas som ett nekande (`cancel_reason = 'declined'`, samma som
 * `declineIn`; ägarens fritext sparas inte utan följer bara händelsen).
 */
async function cancelDetailedIn(
  q: Queryable,
  input: CancelInput,
): Promise<
  Result<
    { bookingId: string; freed: Freed | null; declined: boolean },
    BookingError
  >
> {
  const member = await actorMember(q, input.actor, input.businessId);
  const b = await lockBooking(q, input.businessId, input.ref);
  if (!b) {
    return member !== undefined &&
      "bookingId" in input.ref &&
      (await visibleButLocked(q, input.businessId, input.ref.bookingId))
      ? err("forbidden")
      : err("not_found");
  }
  // WP-46: även "redan avbokad" kräver att medlemmen får röra bokningen.
  if (
    !bookingPermOk(member, {
      kind: "cancel",
      staffId: b.staffId,
      status: b.status === "cancelled" ? "requested" : b.status,
    })
  ) {
    return err("forbidden");
  }
  if (b.status === "cancelled") {
    return ok({ bookingId: b.id, freed: null, declined: false });
  }
  if (!CHANGEABLE.includes(b.status)) return err("invalid_status");
  if (input.actor.kind === "customer" && !insideCancelWindow(b, input.now)) {
    return err("outside_cancel_window");
  }
  const declined = input.actor.kind === "owner" && b.status === "requested";
  await q.query(
    `update public.bookings
        set status = 'cancelled', cancelled_at = $3, cancel_reason = $4,
            pending_expires_at = null
      where business_id = $1 and id = $2`,
    [
      input.businessId,
      b.id,
      input.now,
      declined ? "declined" : (input.reason ?? null),
    ],
  );
  return ok({
    bookingId: b.id,
    freed: {
      staffId: b.staffId,
      blocked: { start: b.start, end: b.blockedEnd },
    },
    declined,
  });
}
