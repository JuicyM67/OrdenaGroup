import "server-only";

import type { E164 } from "@/lib/format/phone";
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
  createBookingRequestSchema,
  createContextSchema,
  parseContext,
  type CreateBookingRequest,
  type CreateContext,
} from "@/server/scheduling/schemas";
import type { Actor, StaffChoice } from "@/server/scheduling/types";

import { findOrCreateCustomer } from "./customers";
import { createManageToken } from "./token";
import type { BookingError, CreatedBooking } from "./types";

const MIN = 60_000;

type BookingSource = "web" | "manual" | "waitlist";

/** Källan sätts av servern: kund = web, ägare = manual, väntelista via ctx. */
function sourceFor(
  actor: Actor,
  ctxSource: "waitlist" | undefined,
): BookingSource {
  if (ctxSource) return ctxSource;
  return actor.kind === "owner" ? "manual" : "web";
}

/**
 * Skapar en bokning (F4). Klientens val är bara en önskan (inv. 6): allt
 * räknas om här i en transaktion — tjänst och profesional i företaget,
 * företagets status (kund), notice/horisont (kund), öppettider, frånvaro,
 * bokningar och buffert, och priset från services.price_clp.
 *
 * Samtidighet: kandidaterna låses per profesional (advisory lock, sorterad
 * ordning) före insert, så att två krockande inserts serialiseras och ger
 * 23P01 i stället för deadlock. `no_overlap` har sista ordet (23P01 → nästa
 * "any"-kandidat eller `slot_taken`). 40P01/40001 kör om hela transaktionen
 * en gång och ger sedan `slot_taken`.
 *
 * WP-10: alltid `confirmed`, `deposit_clp = 0`, `discount_clp = 0` (WP-25/30).
 */
export async function createBooking(
  request: CreateBookingRequest,
  ctx: CreateContext,
): Promise<Result<CreatedBooking, BookingError>> {
  const c = parseContext(createContextSchema, ctx);
  const p = createBookingRequestSchema.safeParse(request);
  if (!p.success) return err("invalid_input");
  const input = {
    ...p.data,
    businessId: c.businessId,
    actor: c.actor,
    now: c.now,
    source: sourceFor(c.actor, c.source),
  };
  return runAs(input.actor, (q) => createIn(q, input), {
    onConflict: err("slot_taken"),
  });
}

export type CreateInput = {
  businessId: string;
  serviceId: string;
  staffId: StaffChoice;
  start: Date;
  customer: { phone: E164; name: string; email?: string | undefined };
  notes?: string | undefined;
  source: BookingSource;
  actor: Actor;
  now: Date;
};

/** Inre steg (för tester): kör i anroparens transaktion. */
export async function createIn(
  q: Queryable,
  input: CreateInput,
): Promise<Result<CreatedBooking, BookingError>> {
  const start = input.start.getTime();
  const loaded = await loadSnapshot(q, {
    businessId: input.businessId,
    serviceId: input.serviceId,
    range: { around: input.start },
  });
  if (!loaded.ok) return loaded;
  if (input.actor.kind === "customer" && !loaded.value.businessActive) {
    return err("business_unavailable");
  }
  if (!staffOffersService(loaded.value, input.staffId)) {
    return err("service_not_offered");
  }
  const { snapshot, priceClp } = loaded.value;

  const check = checkStart(
    {
      snapshot,
      staff: input.staffId,
      audience: input.actor.kind,
      now: input.now,
    },
    start,
  );
  if (!check.ok) return check;

  await lockStaffForBooking(q, input.businessId, check.value);

  const customerId = await findOrCreateCustomer(
    q,
    input.businessId,
    input.customer,
  );
  const { token, hash } = createManageToken();
  const periodEnd = start + snapshot.service.durationMin * MIN;
  const blockedEnd = periodEnd + snapshot.service.bufferAfterMin * MIN;

  for (const staffId of check.value) {
    try {
      const id = await savepoint(q, async () => {
        const r = await q.query<{ id: string }>(
          `insert into public.bookings
             (business_id, staff_id, service_id, customer_id, period, blocked,
              status, source, price_clp, discount_clp, deposit_clp,
              manage_token_hash, notes)
           values ($1, $2, $3, $4, $5::tstzrange, $6::tstzrange,
                   'confirmed', $7::public.booking_source, $8, 0, 0, $9, $10)
           returning id`,
          [
            input.businessId,
            staffId,
            input.serviceId,
            customerId,
            toTstzrange({ start, end: periodEnd }),
            toTstzrange({ start, end: blockedEnd }),
            input.source,
            priceClp,
            hash,
            input.notes ?? null,
          ],
        );
        return r.rows[0]!.id;
      });
      return ok({
        id,
        businessId: input.businessId,
        staffId,
        serviceId: input.serviceId,
        customerId,
        start: new Date(start).toISOString(),
        end: new Date(periodEnd).toISOString(),
        priceClp,
        discountClp: 0,
        depositClp: 0,
        status: "confirmed",
        manageToken: token,
      });
    } catch (e) {
      if (!isNoOverlapViolation(e)) throw e;
      // Någon hann före: prova nästa profesional ("Cualquiera").
    }
  }
  return err("slot_taken");
}
