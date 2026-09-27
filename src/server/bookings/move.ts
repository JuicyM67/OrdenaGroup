import "server-only";

import { isNoOverlapViolation } from "@/server/db/errors";
import type { Queryable } from "@/server/db/pool";
import { toTstzrange } from "@/server/db/tstzrange";
import { savepoint } from "@/server/db/tx";
import { staffOffersService } from "@/server/scheduling/availability";
import { checkStart } from "@/server/scheduling/core/validate";
import { loadSnapshot } from "@/server/scheduling/load";
import { err, ok, type Result } from "@/server/scheduling/result";
import { runAs } from "@/server/scheduling/run";
import {
  moveBookingInputSchema,
  type MoveBookingInput,
} from "@/server/scheduling/schemas";

import { CHANGEABLE, insideCancelWindow, lockBooking } from "./row";
import type { BookingError, Freed, MovedBooking } from "./types";

const MIN = 60_000;

/**
 * Flyttar en bokning. Behåller längd, buffert (upper − lower) och pris.
 * Tillgängligheten räknas om utan bokningen själv; `no_overlap` har sista
 * ordet (23P01 → nästa "any"-kandidat eller `slot_taken`).
 */
export async function moveBooking(
  raw: MoveBookingInput,
): Promise<Result<{ booking: MovedBooking; freed: Freed }, BookingError>> {
  const p = moveBookingInputSchema.safeParse(raw);
  if (!p.success) return err("invalid_input");
  const input = p.data;
  return runAs(input.actor, (q) => moveIn(q, input));
}

async function moveIn(
  q: Queryable,
  input: ReturnType<typeof moveBookingInputSchema.parse>,
): Promise<Result<{ booking: MovedBooking; freed: Freed }, BookingError>> {
  const b = await lockBooking(q, input.businessId, input.bookingId);
  if (!b) return err("not_found");
  if (!CHANGEABLE.includes(b.status)) return err("invalid_status");
  if (input.actor.kind === "customer" && !insideCancelWindow(b, input.now)) {
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
  const durationMin = (b.periodEnd - b.start) / MIN;
  const bufferMin = (b.blockedEnd - b.periodEnd) / MIN;
  const snapshot = {
    ...loaded.value.snapshot,
    service: { durationMin, bufferAfterMin: bufferMin },
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

  const periodEnd = start + (b.periodEnd - b.start);
  const blockedEnd = start + (b.blockedEnd - b.start);
  for (const staffId of check.value) {
    try {
      await savepoint(q, () =>
        q.query(
          `update public.bookings
              set staff_id = $3, period = $4::tstzrange, blocked = $5::tstzrange
            where business_id = $1 and id = $2`,
          [
            input.businessId,
            b.id,
            staffId,
            toTstzrange({ start, end: periodEnd }),
            toTstzrange({ start, end: blockedEnd }),
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
