import "server-only";

import { isNoOverlapViolation } from "@/server/db/errors";
import { lockStaffForBooking } from "@/server/db/locks";
import type { Queryable } from "@/server/db/pool";
import { toTstzrange } from "@/server/db/tstzrange";
import { savepoint } from "@/server/db/tx";
import { staffOffersService } from "@/server/scheduling/availability";
import { checkStart } from "@/server/scheduling/core/validate";
import { loadSnapshot } from "@/server/scheduling/load";
import { err, ok, type Result } from "@/server/scheduling/result";
import { runAs } from "@/server/scheduling/run";
import {
  customerMoveRequestSchema,
  engineContextSchema,
  ownerMoveRequestSchema,
  parseContext,
  type EngineContext,
  type MoveBookingRequest,
} from "@/server/scheduling/schemas";
import type { Actor, StaffChoice } from "@/server/scheduling/types";

import { emitBookingEvent } from "./events";
import {
  CHANGEABLE,
  insideCancelWindow,
  lockBooking,
  type BookingRef,
} from "./row";
import { createManageToken } from "./token";
import type { BookingError, Freed, MovedBooking } from "./types";

const MIN = 60_000;

type MoveResult = Result<{ booking: MovedBooking; freed: Freed }, BookingError>;

/**
 * Flyttar en bokning. Kunden identifierar bokningen med länkens token,
 * ägaren med id. Behåller längd, buffert (upper − lower) och pris.
 * Tillgängligheten räknas om utan bokningen själv; målprofesionalerna låses
 * (advisory lock) före update och `no_overlap` har sista ordet.
 * Roterar kundens token (D-029) och köar `moved` efter commit (WP-16).
 */
export async function moveBooking(
  request: MoveBookingRequest,
  ctx: EngineContext,
): Promise<MoveResult> {
  const c = parseContext(engineContextSchema, ctx);
  let ref: BookingRef;
  let newStart: Date;
  let newStaffId: StaffChoice | undefined;
  if (c.actor.kind === "customer") {
    const p = customerMoveRequestSchema.safeParse(request);
    if (!p.success) return err("invalid_input");
    ref = { manageToken: p.data.manageToken };
    ({ newStart, newStaffId } = p.data);
  } else {
    const p = ownerMoveRequestSchema.safeParse(request);
    if (!p.success) return err("invalid_input");
    ref = { bookingId: p.data.bookingId };
    ({ newStart, newStaffId } = p.data);
  }
  const input = { ...c, ref, newStart, newStaffId };
  const result = await runAs(c.actor, (q) => moveIn(q, input), {
    onConflict: err("slot_taken"),
  });
  // WP-16: efter commit (enqueueBookingEvent kastar aldrig). Den nya token
  // går bara till meddelandet; den gamla länken gäller inte längre (D-029).
  if (result.ok) {
    await emitBookingEvent({
      type: "moved",
      bookingId: result.value.booking.id,
      businessId: c.businessId,
      token: result.value.booking.manageToken,
      by: c.actor.kind,
      status: result.value.booking.status,
    });
  }
  return result;
}

export type MoveInput = {
  businessId: string;
  ref: BookingRef;
  newStart: Date;
  newStaffId?: StaffChoice | undefined;
  actor: Actor;
  now: Date;
};

/** Inre steg (för tester): kör i anroparens transaktion. */
export async function moveIn(
  q: Queryable,
  input: MoveInput,
): Promise<MoveResult> {
  const b = await lockBooking(q, input.businessId, input.ref);
  if (!b) return err("not_found");
  const isCustomer = input.actor.kind === "customer";
  if (isCustomer && !b.businessActive) return err("business_unavailable");
  if (!CHANGEABLE.includes(b.status)) return err("invalid_status");
  if (isCustomer && !insideCancelWindow(b, input.now)) {
    return err("outside_cancel_window");
  }

  const loaded = await loadSnapshot(q, {
    businessId: input.businessId,
    serviceId: b.serviceId,
    range: { around: input.newStart },
    includeInactiveService: true,
  });
  if (!loaded.ok) return loaded;
  const staffChoice = input.newStaffId ?? b.staffId;
  if (!staffOffersService(loaded.value, staffChoice)) {
    return err("service_not_offered");
  }
  const snapshot = {
    ...loaded.value.snapshot,
    service: {
      durationMin: (b.periodEnd - b.start) / MIN,
      bufferAfterMin: (b.blockedEnd - b.periodEnd) / MIN,
    },
  };

  const start = input.newStart.getTime();
  const check = checkStart(
    {
      snapshot,
      staff: staffChoice,
      audience: input.actor.kind,
      now: input.now,
      excludeBookingId: b.id,
    },
    start,
  );
  if (!check.ok) return check;

  await lockStaffForBooking(q, input.businessId, check.value);

  const periodEnd = start + (b.periodEnd - b.start);
  const blockedEnd = start + (b.blockedEnd - b.start);
  // D-029: en flytt roterar kundens token — gamla länkar slutar gälla och
  // `moved`-meddelandet bär den nya. Bara hashen sparas.
  const { token, hash } = createManageToken();
  for (const staffId of check.value) {
    try {
      await savepoint(q, () =>
        q.query(
          `update public.bookings
              set staff_id = $3, period = $4::tstzrange, blocked = $5::tstzrange,
                  manage_token_hash = $6
            where business_id = $1 and id = $2`,
          [
            input.businessId,
            b.id,
            staffId,
            toTstzrange({ start, end: periodEnd }),
            toTstzrange({ start, end: blockedEnd }),
            hash,
          ],
        ),
      );
      return ok({
        booking: {
          id: b.id,
          businessId: input.businessId,
          staffId,
          serviceId: b.serviceId,
          start: new Date(start).toISOString(),
          end: new Date(periodEnd).toISOString(),
          priceClp: b.priceClp,
          status: b.status as MovedBooking["status"],
          manageToken: token,
        },
        freed: {
          staffId: b.staffId,
          blocked: { start: b.start, end: b.blockedEnd },
        },
      });
    } catch (e) {
      if (!isNoOverlapViolation(e)) throw e;
    }
  }
  return err("slot_taken");
}
