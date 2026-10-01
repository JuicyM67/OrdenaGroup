import "server-only";

import type { LocalDate } from "@/lib/format/dates";
import type { E164 } from "@/lib/format/phone";
import { createIn } from "@/server/bookings/create";
import { emitBookingEvent } from "@/server/bookings/events";
import type { CreatedBooking } from "@/server/bookings/types";
import type { Queryable } from "@/server/db/pool";
import { withServiceTx } from "@/server/db/tx";
import { err, ok } from "@/server/scheduling/result";
import { runAs } from "@/server/scheduling/run";
import { ANY_STAFF } from "@/server/scheduling/types";

import { emitWaitlistEvents, type WaitlistEvent } from "./events";
import { waitlistSlotsIn, type SnapshotCache } from "./match";
import { hashWaitlistToken, isWaitlistTokenShape } from "./token";

/**
 * WP-23: kunden tar den erbjudna tiden (`/v/[token]`, "Ta tiden").
 *
 * - Token valideras (form, hash, status `offered`, `offer_expires_at > now`).
 * - Tiden räknas om på servern: första giltiga kundtiden samma dag för
 *   tjänsten (och profesionalen om posten har en) — klientens val finns inte.
 * - Bokningen skapas med `createIn` (`source = 'waitlist'`,
 *   `waitlist_entry_id`, status enligt företagets `auto_confirm_bookings`,
 *   `idempotency_key = entry.id` så att ett dubbelklick ger samma bokning).
 *   `no_overlap` avgör vem som vinner när flera tar samma lucka.
 * - Vinnaren → `booked`. Övriga `offered` samma dag som inte längre har
 *   någon tid → `expired` + `waitlist_taken` (broadcast).
 * - Förloraren/ingen tid kvar → posten `expired` (offer_expires_at lämnas,
 *   så att ett nytt klick fortfarande svarar `taken`, inte `expired`).
 */
export type ClaimWaitlistResult =
  | { ok: true; bookingId: string }
  | { ok: false; code: "taken" | "expired" | "invalid" };

type EntryRow = {
  id: string;
  business_id: string;
  service_id: string;
  staff_id: string | null;
  day: string;
  status: string;
  customer_id: string;
  expires_ms: number | null;
};

type CustomerRow = {
  phone_e164: string | null;
  name: string;
  email: string | null;
};

type Outcome =
  | { kind: "booked"; booking: CreatedBooking | null; bookingId: string }
  | { kind: "fail"; code: "taken" | "expired" | "invalid" };

/** Posten för token, låst. Bara `waitlist_entries` (token är global unik). */
async function lockEntryByToken(
  q: Queryable,
  token: string,
): Promise<EntryRow | undefined> {
  const r = await q.query<EntryRow>(
    `select id, business_id, service_id, staff_id, day::text as day,
            status::text as status, customer_id,
            extract(epoch from offer_expires_at)::float8 * 1000 as expires_ms
       from public.waitlist_entries
      where offer_token_hash = $1
      for update`,
    [hashWaitlistToken(token)],
  );
  return r.rows[0];
}

/** Statusen när posten inte (längre) är ett giltigt erbjudande. */
function closedCode(
  e: EntryRow,
  now: Date,
): "taken" | "expired" | "invalid" | null {
  const live = e.expires_ms !== null && e.expires_ms > now.getTime();
  if (e.status === "expired") return live ? "taken" : "expired";
  if (e.status !== "offered") return "invalid";
  return live ? null : "expired";
}

async function expireEntryIn(
  q: Queryable,
  businessId: string,
  entryId: string,
): Promise<void> {
  await q.query(
    `update public.waitlist_entries set status = 'expired'
      where business_id = $1 and id = $2 and status = 'offered'`,
    [businessId, entryId],
  );
}

/**
 * Efter en bokning: andra `offered` samma dag som inte längre har någon tid
 * (ögonblicksbilden laddas om, bokningen syns) → `expired` + `waitlist_taken`.
 */
export async function expireTakenOffersIn(
  q: Queryable,
  input: { businessId: string; day: LocalDate; now: Date; exceptId?: string },
): Promise<WaitlistEvent[]> {
  const r = await q.query<{
    id: string;
    service_id: string;
    staff_id: string | null;
  }>(
    `select id, service_id, staff_id from public.waitlist_entries
      where business_id = $1 and day = $2::date and status = 'offered'
        and ($3::uuid is null or id <> $3::uuid)
      order by created_at
      for update skip locked`,
    [input.businessId, input.day, input.exceptId ?? null],
  );
  const cache: SnapshotCache = new Map();
  const events: WaitlistEvent[] = [];
  for (const o of r.rows) {
    const slots = await waitlistSlotsIn(q, cache, {
      businessId: input.businessId,
      serviceId: o.service_id,
      day: input.day,
      staff: o.staff_id ?? ANY_STAFF,
      now: input.now,
    });
    if (slots.length > 0) continue;
    await expireEntryIn(q, input.businessId, o.id);
    events.push({
      type: "waitlist_taken",
      businessId: input.businessId,
      entryId: o.id,
    });
  }
  return events;
}

async function claimIn(
  q: Queryable,
  token: string,
  now: Date,
  sink: WaitlistEvent[],
): Promise<Outcome> {
  sink.length = 0;
  const e = await lockEntryByToken(q, token);
  if (!e) return { kind: "fail", code: "invalid" };
  const businessId = e.business_id;

  if (e.status === "booked") {
    // Dubbelklick/omladdning: samma bokning, inget nytt.
    const b = await q.query<{ id: string }>(
      `select id from public.bookings
        where business_id = $1 and waitlist_entry_id = $2
        order by created_at desc limit 1`,
      [businessId, e.id],
    );
    const id = b.rows[0]?.id;
    return id
      ? { kind: "booked", booking: null, bookingId: id }
      : { kind: "fail", code: "invalid" };
  }
  const closed = closedCode(e, now);
  if (closed) return { kind: "fail", code: closed };

  const c = await q.query<CustomerRow>(
    `select phone_e164, name, email from public.customers
      where business_id = $1 and id = $2 and anonymized_at is null`,
    [businessId, e.customer_id],
  );
  const customer = c.rows[0];
  if (!customer?.phone_e164) return { kind: "fail", code: "invalid" };

  const day = e.day as LocalDate;
  const staff = e.staff_id ?? ANY_STAFF;
  const slots = await waitlistSlotsIn(q, new Map(), {
    businessId,
    serviceId: e.service_id,
    day,
    staff,
    now,
  });
  const slot = slots[0];
  if (!slot) {
    await expireEntryIn(q, businessId, e.id);
    return { kind: "fail", code: "taken" };
  }

  const created = await createIn(q, {
    businessId,
    serviceId: e.service_id,
    staffId: staff,
    start: new Date(slot.start),
    customer: {
      phone: customer.phone_e164 as E164,
      name: customer.name,
      ...(customer.email ? { email: customer.email } : {}),
    },
    source: "waitlist",
    actor: { kind: "customer" },
    now,
    idempotencyKey: e.id,
    waitlistEntryId: e.id,
  });
  if (!created.ok) {
    if (created.error === "business_unavailable") {
      return { kind: "fail", code: "invalid" };
    }
    await expireEntryIn(q, businessId, e.id);
    return { kind: "fail", code: "taken" };
  }

  await q.query(
    `update public.waitlist_entries set status = 'booked'
      where business_id = $1 and id = $2`,
    [businessId, e.id],
  );
  sink.push(
    ...(await expireTakenOffersIn(q, { businessId, day, now, exceptId: e.id })),
  );
  return {
    kind: "booked",
    booking: created.value.manageToken !== "" ? created.value : null,
    bookingId: created.value.id,
  };
}

export async function claimWaitlistOffer(
  token: string,
  now: Date,
): Promise<ClaimWaitlistResult> {
  if (!isWaitlistTokenShape(token)) return { ok: false, code: "invalid" };
  const events: WaitlistEvent[] = [];
  const r = await runAs(
    { kind: "customer" },
    async (q) => ok(await claimIn(q, token, now, events)),
    { onConflict: err("taken" as const) },
  );
  if (!r.ok) return { ok: false, code: "taken" };
  const outcome = r.value;
  if (outcome.kind === "fail") return { ok: false, code: outcome.code };
  // Efter commit (kastar aldrig): kundens bekräftelse/förfrågan som en
  // vanlig bokning, och "redan tagen" till dem som förlorade luckan.
  if (outcome.booking) {
    await emitBookingEvent({
      type: "created",
      bookingId: outcome.booking.id,
      businessId: outcome.booking.businessId,
      token: outcome.booking.manageToken,
      by: "customer",
      status: outcome.booking.status,
    });
  }
  await emitWaitlistEvents(events);
  return { ok: true, bookingId: outcome.bookingId };
}

/** Vyn för `/v/[token]` (integrations-engineer): vad som erbjuds. */
export type WaitlistOfferView = {
  entryId: string;
  businessId: string;
  businessName: string;
  slug: string;
  timezone: string;
  serviceName: string;
  durationMin: number;
  priceClp: number;
  /** Första lediga tiden just nu (ISO UTC) — samma som "Ta tiden" bokar
   * om ingen hinner före. */
  start: string;
  staffId: string;
  /** ISO UTC. */
  expiresAt: string;
};

export type GetWaitlistOfferResult =
  | { ok: true; offer: WaitlistOfferView }
  | { ok: false; code: "taken" | "expired" | "invalid" | "booked" };

/** Läser erbjudandet för token utan att ändra något. */
export async function getWaitlistOffer(
  token: string,
  now: Date,
): Promise<GetWaitlistOfferResult> {
  if (!isWaitlistTokenShape(token)) return { ok: false, code: "invalid" };
  return withServiceTx(async (q) => {
    const r = await q.query<EntryRow>(
      `select id, business_id, service_id, staff_id, day::text as day,
              status::text as status, customer_id,
              extract(epoch from offer_expires_at)::float8 * 1000 as expires_ms
         from public.waitlist_entries
        where offer_token_hash = $1`,
      [hashWaitlistToken(token)],
    );
    const e = r.rows[0];
    if (!e) return { ok: false, code: "invalid" } as const;
    if (e.status === "booked") return { ok: false, code: "booked" } as const;
    const closed = closedCode(e, now);
    if (closed) return { ok: false, code: closed } as const;
    const slots = await waitlistSlotsIn(q, new Map(), {
      businessId: e.business_id,
      serviceId: e.service_id,
      day: e.day as LocalDate,
      staff: e.staff_id ?? ANY_STAFF,
      now,
    });
    const slot = slots[0];
    if (!slot) return { ok: false, code: "taken" } as const;
    const info = await q.query<{
      business_name: string;
      slug: string;
      timezone: string;
      service_name: string;
      duration_min: number;
      price_clp: number;
    }>(
      `select b.name as business_name, b.slug, b.timezone,
              s.name as service_name, s.duration_min, s.price_clp
         from public.businesses b
         join public.services s on s.business_id = b.id
        where b.id = $1 and s.business_id = $1 and s.id = $2`,
      [e.business_id, e.service_id],
    );
    const x = info.rows[0];
    if (!x) return { ok: false, code: "invalid" } as const;
    return {
      ok: true,
      offer: {
        entryId: e.id,
        businessId: e.business_id,
        businessName: x.business_name,
        slug: x.slug,
        timezone: x.timezone,
        serviceName: x.service_name,
        durationMin: x.duration_min,
        priceClp: x.price_clp,
        start: new Date(slot.start).toISOString(),
        staffId: slot.staffIds[0]!,
        expiresAt: new Date(Math.round(e.expires_ms!)).toISOString(),
      },
    } as const;
  });
}
