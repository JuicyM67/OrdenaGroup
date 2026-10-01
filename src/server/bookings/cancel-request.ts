import "server-only";

import { z } from "zod";

import type { Queryable } from "@/server/db/pool";
import { err, ok, type Result } from "@/server/scheduling/result";
import { runAs } from "@/server/scheduling/run";
import {
  engineContextSchema,
  parseContext,
  type EngineContext,
} from "@/server/scheduling/schemas";

import {
  authorizeDecision,
  currentStatus,
  type DecisionInput,
} from "./confirm";
import {
  emitWaitlistEvents,
  type WaitlistEvent,
} from "@/server/waitlist/events";
import { collectFreed } from "@/server/waitlist/match";

import { emitBookingEvent } from "./events";
import type { BookingError, Freed } from "./types";

/**
 * WP-56: företaget svarar på kundens avbokningsförfrågan
 * (`status = 'cancel_requested'`, skapad av `cancelBooking` med
 * `actor: customer` när `businesses.cancel_approval` kräver det).
 *
 * - Godkänn: `cancel_requested → cancelled` (`cancel_reason = 'customer'`,
 *   `cancelled_at = now`), tiden blir ledig (`freed`), `cancelled` med
 *   `by: "customer"` köas (kunden får `reservaCancelada`, ägaren
 *   `cancelacionDueno` som vanligt).
 * - Neka: tillbaka till `status_before_cancel_request` (i praktiken
 *   `confirmed`), `cancel_declined` köas (kunden får "din avbokning
 *   godkändes inte").
 *
 * Behörighet som att bekräfta/neka en bokningsförfrågan (`authorizeDecision`
 * i `./confirm.ts`: skrivrätt på bokningens profesional). OBS: triggern
 * `bookings_guard_status` kräver i dag `can_cancel_bookings` för varje
 * övergång till `cancelled` som inte kommer från `requested` — personal utan
 * den flaggan får alltså `forbidden` (via `runAs({ onForbidden })`) när den
 * godkänner, tills triggern behandlar `cancel_requested` som `requested`.
 *
 * Båda är idempotenta: villkorad UPDATE `where status = 'cancel_requested'`
 * (radlåset serialiserar dubbelklick/två flikar). Redan godkänd (`cancelled`)
 * resp. redan nekad (`confirmed`) → ok utan ny händelse
 * (`changed: false`); annat → `invalid_status`.
 */

const cancelRequestDecisionSchema = z.strictObject({
  // `z.guid()` som `src/server/scheduling/schemas.ts` (se kommentaren där).
  bookingId: z.guid(),
});

export type CancelRequestDecision = z.input<typeof cancelRequestDecisionSchema>;

export type ApproveCancellationResult = Result<
  { bookingId: string; freed: Freed | null },
  BookingError
>;

export type DeclineCancellationResult = Result<
  { bookingId: string; changed: boolean },
  BookingError
>;

function ownerInput(
  input: CancelRequestDecision,
  ctx: EngineContext,
): DecisionInput | null {
  const c = parseContext(engineContextSchema, ctx);
  // Kontexten sätts av servern: en kund här är ett programmeringsfel.
  if (c.actor.kind !== "owner") {
    throw new TypeError("cancel-request: bara företaget svarar");
  }
  const p = cancelRequestDecisionSchema.safeParse(input);
  if (!p.success) return null;
  return {
    businessId: c.businessId,
    bookingId: p.data.bookingId,
    now: c.now,
    actor: c.actor,
  };
}

/** Godkänner kundens avbokningsförfrågan. `freed = null` = redan godkänd. */
export async function approveCancellation(
  input: CancelRequestDecision,
  ctx: EngineContext,
): Promise<ApproveCancellationResult> {
  const d = ownerInput(input, ctx);
  if (!d) return err("invalid_input");
  const waitlist: WaitlistEvent[] = [];
  const r = await runAs(
    d.actor,
    async (q) => {
      const x = await approveCancellationIn(q, d);
      if (x.ok) {
        await collectFreed(q, waitlist, {
          businessId: d.businessId,
          now: d.now,
          freed: x.value.freed,
        });
      }
      return x;
    },
    { onForbidden: err("forbidden") },
  );
  if (r.ok && r.value.freed !== null) {
    await emitBookingEvent({
      type: "cancelled",
      bookingId: r.value.bookingId,
      businessId: d.businessId,
      by: "customer",
    });
  }
  if (r.ok) await emitWaitlistEvents(waitlist);
  return r;
}

/** Nekar kundens avbokningsförfrågan; bokningen gäller igen. */
export async function declineCancellation(
  input: CancelRequestDecision,
  ctx: EngineContext,
): Promise<DeclineCancellationResult> {
  const d = ownerInput(input, ctx);
  if (!d) return err("invalid_input");
  const r = await runAs(d.actor, (q) => declineCancellationIn(q, d), {
    onForbidden: err("forbidden"),
  });
  if (r.ok && r.value.changed) {
    await emitBookingEvent({
      type: "cancel_declined",
      bookingId: r.value.bookingId,
      businessId: d.businessId,
    });
  }
  return r;
}

type FreedRow = { id: string; staff_id: string; s: number; be: number };

/** Inre steg: kör i anroparens transaktion. */
export async function approveCancellationIn(
  q: Queryable,
  input: DecisionInput,
): Promise<ApproveCancellationResult> {
  const denied = await authorizeDecision(q, input);
  if (denied) return err(denied);
  const r = await q.query<FreedRow>(
    `update public.bookings
        set status = 'cancelled', cancelled_at = $3, cancel_reason = 'customer',
            status_before_cancel_request = null, pending_expires_at = null
      where business_id = $1 and id = $2 and status = 'cancel_requested'
      returning id, staff_id,
                extract(epoch from lower(blocked))::float8 * 1000 as s,
                extract(epoch from upper(blocked))::float8 * 1000 as be`,
    [input.businessId, input.bookingId, input.now],
  );
  const x = r.rows[0];
  if (x) {
    return ok({
      bookingId: x.id,
      freed: {
        staffId: x.staff_id,
        blocked: { start: Math.round(x.s), end: Math.round(x.be) },
      },
    });
  }
  const status = await currentStatus(q, input.businessId, input.bookingId);
  if (status === undefined) return err("not_found");
  if (status === "cancelled") {
    return ok({ bookingId: input.bookingId, freed: null });
  }
  return err("invalid_status");
}

/** Inre steg: kör i anroparens transaktion. */
export async function declineCancellationIn(
  q: Queryable,
  input: DecisionInput,
): Promise<DeclineCancellationResult> {
  const denied = await authorizeDecision(q, input);
  if (denied) return err(denied);
  const r = await q.query<{ id: string }>(
    `update public.bookings
        set status = status_before_cancel_request,
            status_before_cancel_request = null
      where business_id = $1 and id = $2 and status = 'cancel_requested'
      returning id`,
    [input.businessId, input.bookingId],
  );
  if (r.rows[0]) return ok({ bookingId: input.bookingId, changed: true });
  const status = await currentStatus(q, input.businessId, input.bookingId);
  if (status === undefined) return err("not_found");
  if (status === "confirmed" || status === "pending_payment") {
    return ok({ bookingId: input.bookingId, changed: false });
  }
  return err("invalid_status");
}
