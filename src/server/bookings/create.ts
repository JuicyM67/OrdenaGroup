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
  createBookingInputSchema,
  type CreateBookingInput,
} from "@/server/scheduling/schemas";

import { findOrCreateCustomer } from "./customers";
import { createManageToken } from "./token";
import type { BookingError, CreatedBooking } from "./types";

const MIN = 60_000;

/**
 * Skapar en bokning (F4). Klientens val är bara en önskan (inv. 6): allt
 * räknas om här i en transaktion — tjänst och profesional i företaget,
 * notice/horisont (kund), öppettider, frånvaro, bokningar och buffert, och
 * priset från services.price_clp. Dubbelbokning stoppas till sist av
 * `no_overlap` (23P01 → nästa "any"-kandidat eller `slot_taken`).
 *
 * WP-10: alltid `confirmed`, `deposit_clp = 0`, `discount_clp = 0` (WP-25/30).
 */
export async function createBooking(
  raw: CreateBookingInput,
): Promise<Result<CreatedBooking, BookingError>> {
  const p = createBookingInputSchema.safeParse(raw);
  if (!p.success) return err("invalid_input");
  const input = p.data;
  // Kunden bokar via webben eller väntelistan; "manual" är ägarens.
  if (input.actor.kind === "customer" && input.source === "manual") {
    return err("invalid_input");
  }
  return runAs(input.actor, (q) => createIn(q, input));
}

async function createIn(
  q: Queryable,
  input: ReturnType<typeof createBookingInputSchema.parse>,
): Promise<Result<CreatedBooking, BookingError>> {
  const start = input.start.getTime();
  const loaded = await loadSnapshot(q, {
    businessId: input.businessId,
    serviceId: input.serviceId,
    range: { around: input.start },
  });
  if (!loaded.ok) return loaded;
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
