import "server-only";

import type { Queryable } from "@/server/db/pool";
import { withServiceTx } from "@/server/db/tx";
import { enqueueBookingEventIn } from "@/server/messaging/outbox";
import { err, ok, type Result } from "@/server/scheduling/result";
import { runAs } from "@/server/scheduling/run";
import {
  engineContextSchema,
  ownerDecisionRequestSchema,
  parseContext,
  type DecisionRequest,
  type EngineContext,
} from "@/server/scheduling/schemas";
import type { BookingStatus } from "@/server/scheduling/types";

import { REQUEST_LEAD_HOURS, REQUEST_TTL_HOURS } from "./deadline";
import { emitBookingEvent } from "./events";
import { createManageToken } from "./token";
import type { BookingError, Freed } from "./types";

/**
 * WP-45: ägaren bekräftar eller nekar en förfrågan (`requested`), och svepet
 * låter obesvarade förfrågningar gå ut.
 *
 * Övergångarna görs med en villkorad UPDATE `where status = 'requested'`:
 * dubbelklick, två flikar och kapplöpning med kundens avbokning (som låser
 * raden `for update` i `cancelIn`) serialiseras av radlåset, och den som
 * kommer sist ser inte längre `requested` och ändrar ingenting.
 *
 * Handpenning (Ägarens svar punkt 3: företaget bekräftar först, sedan
 * betalningslänken): TODO(WP-25) — handpenningsflödet finns inte i koden än
 * (`createBooking` skapar aldrig `pending_payment`, `services.deposit_kind`
 * läses inte). När WP-25 landar ska `confirmIn` för en tjänst med
 * handpenning gå `requested → pending_payment` (sätt `deposit_clp` och
 * `pending_expires_at`, `bookings_pending_expires_at_check`) i stället för
 * `confirmed`, och händelsen bära det.
 */

type ConfirmResult = Result<
  { bookingId: string; changed: boolean },
  BookingError
>;
type DeclineResult = Result<
  { bookingId: string; freed: Freed | null },
  BookingError
>;

function ownerOnly(ctx: EngineContext): asserts ctx is EngineContext & {
  actor: { kind: "owner"; userId: string };
} {
  // Kontexten sätts av servern: en kund här är ett programmeringsfel.
  if (ctx.actor.kind !== "owner") {
    throw new TypeError("confirm: bara ägaren bekräftar eller nekar");
  }
}

/**
 * Bekräftar en förfrågan: `requested → confirmed`. Idempotent (redan
 * bekräftad → ok, `changed: false`, ingen ny händelse). Nekad, avbokad
 * eller utgången (efter deadline, även om svepet inte hunnit köra) →
 * `invalid_status`; likaså om kunden har anonymiserats (Ley 21.719: ingen
 * bekräftelse till en raderad kund). Roterar kundens token (som flytten, D-029): `confirmed`
 * bär den nya, länken i "solicitud recibida" slutar gälla. Därför kan
 * kunden inte avboka med den gamla länken samtidigt som ägaren bekräftar —
 * exakt en av dem lyckas.
 */
export async function confirmBooking(
  request: DecisionRequest,
  ctx: EngineContext,
): Promise<ConfirmResult> {
  const c = parseContext(engineContextSchema, ctx);
  ownerOnly(c);
  const p = ownerDecisionRequestSchema.safeParse(request);
  if (!p.success) return err("invalid_input");
  const input = {
    businessId: c.businessId,
    bookingId: p.data.bookingId,
    now: c.now,
  };
  const r = await runAs(c.actor, (q) => confirmIn(q, input));
  if (!r.ok) return r;
  if (r.value.token !== null) {
    await emitBookingEvent({
      type: "confirmed",
      bookingId: r.value.bookingId,
      businessId: c.businessId,
      token: r.value.token,
      by: "owner",
    });
  }
  return ok({ bookingId: r.value.bookingId, changed: r.value.token !== null });
}

/**
 * Nekar en förfrågan: `requested → cancelled`, `cancel_reason = 'declined'`,
 * `cancelled_at = now`. Tiden blir ledig direkt (`freed`, för väntelistan).
 * Idempotent: redan avbokad (nekad, utgången eller avbokad av kunden) → ok
 * med `freed = null`, ingen ny händelse. Bekräftad → `invalid_status`
 * (använd avbokning).
 *
 * `request.reason` (valfritt, ägarens fritextmotiv till kunden) sparas
 * ALDRIG i `bookings` — den bär bara med händelsen (`message`) till
 * `enqueueBookingEvent`/`solicitudRechazada` (e-post, `motivo`; SMS är utan
 * motiv). D-029: outbox-payloaden rensas efter sändning, så motivet lever
 * inte kvar i databasen längre än meddelandet behöver skickas.
 */
export async function declineBooking(
  request: DecisionRequest,
  ctx: EngineContext,
): Promise<DeclineResult> {
  const c = parseContext(engineContextSchema, ctx);
  ownerOnly(c);
  const p = ownerDecisionRequestSchema.safeParse(request);
  if (!p.success) return err("invalid_input");
  const input = {
    businessId: c.businessId,
    bookingId: p.data.bookingId,
    now: c.now,
  };
  const r = await runAs(c.actor, (q) => declineIn(q, input));
  if (r.ok && r.value.freed !== null) {
    await emitBookingEvent({
      type: "declined",
      bookingId: r.value.bookingId,
      businessId: c.businessId,
      reason: "declined",
      ...(p.data.reason ? { message: p.data.reason } : {}),
    });
  }
  return r;
}

export type DecisionInput = {
  businessId: string;
  bookingId: string;
  now: Date;
};

async function currentStatus(
  q: Queryable,
  businessId: string,
  bookingId: string,
): Promise<BookingStatus | undefined> {
  const r = await q.query<{ status: BookingStatus }>(
    `select status::text as status from public.bookings
      where business_id = $1 and id = $2`,
    [businessId, bookingId],
  );
  return r.rows[0]?.status;
}

/** Inre steg (för tester): kör i anroparens transaktion. `token` = null när
 * inget ändrades (redan bekräftad). */
export async function confirmIn(
  q: Queryable,
  input: DecisionInput,
): Promise<Result<{ bookingId: string; token: string | null }, BookingError>> {
  const { token, hash } = createManageToken();
  const r = await q.query<{ id: string }>(
    `update public.bookings
        set status = 'confirmed', manage_token_hash = $3
      where business_id = $1 and id = $2 and status = 'requested'
        and (case when lower(period) - $6 * interval '1 hour' > created_at
                  then least(created_at + $5 * interval '1 hour',
                             lower(period) - $6 * interval '1 hour')
                  else lower(period) end) > $4::timestamptz
        and not exists (
          select 1 from public.customers c
           where c.business_id = $1 and c.id = bookings.customer_id
             and c.anonymized_at is not null)
      returning id`,
    [
      input.businessId,
      input.bookingId,
      hash,
      input.now,
      REQUEST_TTL_HOURS,
      REQUEST_LEAD_HOURS,
    ],
  );
  if (r.rows[0]) return ok({ bookingId: input.bookingId, token });
  const status = await currentStatus(q, input.businessId, input.bookingId);
  if (status === undefined) return err("not_found");
  if (status === "confirmed")
    return ok({ bookingId: input.bookingId, token: null });
  return err("invalid_status");
}

type FreedRow = { id: string; staff_id: string; s: number; be: number };

const freedOf = (x: FreedRow): Freed => ({
  staffId: x.staff_id,
  blocked: { start: Math.round(x.s), end: Math.round(x.be) },
});

/** Inre steg (för tester): kör i anroparens transaktion. */
export async function declineIn(
  q: Queryable,
  input: DecisionInput,
): Promise<DeclineResult> {
  const r = await q.query<FreedRow>(
    `update public.bookings
        set status = 'cancelled', cancelled_at = $3, cancel_reason = 'declined',
            pending_expires_at = null
      where business_id = $1 and id = $2 and status = 'requested'
      returning id, staff_id,
                extract(epoch from lower(blocked))::float8 * 1000 as s,
                extract(epoch from upper(blocked))::float8 * 1000 as be`,
    [input.businessId, input.bookingId, input.now],
  );
  const x = r.rows[0];
  if (x) return ok({ bookingId: x.id, freed: freedOf(x) });
  const status = await currentStatus(q, input.businessId, input.bookingId);
  if (status === undefined) return err("not_found");
  if (status === "cancelled")
    return ok({ bookingId: input.bookingId, freed: null });
  return err("invalid_status");
}

export type ExpiredRequest = {
  bookingId: string;
  businessId: string;
  freed: Freed;
};

/** Högst så många per körning (cron var 5:e min, D-030); resten nästa gång.
 * Varje träff köar 1–2 utkorgsrader i samma transaktion, så batchen hålls
 * liten nog att rymmas i `statement_timeout`. */
const EXPIRE_BATCH = 100;

/**
 * Svepet (WP-45 steg 6), anropas från `/api/cron/outbox` med `systemClock()`.
 * Varje `requested` vars deadline (`requestDeadline`: 24 h efter
 * `created_at`, dock senast 2 h före start) är ≤ `now` blir `cancelled`
 * med `cancel_reason = 'expired'`, `cancelled_at = now`, och
 * `declined` (`reason: "expired"`, → `solicitudVencida`) köas i SAMMA
 * transaktion (säkerhetsgranskning WP-45): antingen går förfrågan ut OCH
 * beskedet ligger i utkorgen, eller ingetdera — en timeout mitt i kan inte
 * tappa ett besked. Kastar vid DB-fel (anroparen fångar). Idempotent och säker att
 * köra parallellt (`for update skip locked`, villkorad på `requested`); en
 * rad som ägaren bekräftar i samma stund hoppas över och bekräftelsen
 * nekas själv efter deadline (`confirmIn`).
 */
export async function expireRequests(now: Date): Promise<ExpiredRequest[]> {
  return withServiceTx(async (q) => {
    const expired = await expireRequestsIn(q, now);
    for (const e of expired) {
      await enqueueBookingEventIn(q, {
        type: "declined",
        bookingId: e.bookingId,
        businessId: e.businessId,
        reason: "expired",
      });
    }
    return expired;
  });
}

/**
 * Inre steg (för tester). Medvetet svep över alla företag (service role,
 * som lagringsjobbet i WP-26): det finns inget givet `business_id`, varje
 * träff returneras med sitt `business_id` och händelsen köas per företag.
 */
export async function expireRequestsIn(
  q: Queryable,
  now: Date,
): Promise<ExpiredRequest[]> {
  const r = await q.query<FreedRow & { business_id: string }>(
    `update public.bookings
        set status = 'cancelled', cancelled_at = $1, cancel_reason = 'expired',
            pending_expires_at = null
      where status = 'requested'
        and id in (
          select id from public.bookings
           where status = 'requested'
             and (created_at <= $1::timestamptz - $2 * interval '1 hour'
                  or (lower(period) - $3 * interval '1 hour' > created_at
                      and lower(period) <= $1::timestamptz + $3 * interval '1 hour')
                  or lower(period) <= $1::timestamptz)
           order by created_at
           limit $4
           for update skip locked)
      returning id, business_id, staff_id,
                extract(epoch from lower(blocked))::float8 * 1000 as s,
                extract(epoch from upper(blocked))::float8 * 1000 as be`,
    [now, REQUEST_TTL_HOURS, REQUEST_LEAD_HOURS, EXPIRE_BATCH],
  );
  return r.rows.map((x) => ({
    bookingId: x.id,
    businessId: x.business_id,
    freed: freedOf(x),
  }));
}
