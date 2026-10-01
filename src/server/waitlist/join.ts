import "server-only";

import { z } from "zod";

import { market } from "@/config/brand";
import { reserva } from "@/i18n";
import type { LocalDate } from "@/lib/format/dates";
import { e164Schema, localDateSchema } from "@/lib/format/schemas";
import { resolveBusinessBySlug } from "@/server/bookings/business";
import { findOrCreateCustomer } from "@/server/bookings/customers";
import { customerEmailRequired } from "@/server/bookings/submit";
import type { Queryable } from "@/server/db/pool";
import { getClientIp, hitRateLimit } from "@/server/db/rate-limit";
import { recordConsent } from "@/server/privacy/consent";
import { staffOffersService } from "@/server/scheduling/availability";
import { systemClock } from "@/server/scheduling/clock";
import { dayStatus } from "@/server/scheduling/core/slots";
import { loadSnapshot } from "@/server/scheduling/load";
import { err, ok, type Result } from "@/server/scheduling/result";
import { runAs } from "@/server/scheduling/run";
import { ANY_STAFF } from "@/server/scheduling/types";

/**
 * WP-23 (F8): kunden går med i väntelistan från `/{slug}` när dagen är full.
 *
 * - Rate limit per IP (`waitlist:ip`) före allt annat, och högst
 *   `MAX_ACTIVE_PER_CUSTOMER` aktiva poster (waiting/offered) per kund och
 *   företag (telefonen är inte verifierad).
 * - Servern kontrollerar att dagen verkligen är full för tjänsten (och
 *   profesionalen) i schemamotorn — annars `not_full` (boka i stället).
 * - Kunden skapas/återanvänds på (business_id, telefon) i samma transaktion
 *   som posten; samtycket `waitlist` loggas (`consent_events`) där också.
 * - Redan med för samma tjänst och dag → `waitlist_duplicate`, utom vid ett
 *   omförsök med samma `idempotencyKey` (då `ok`).
 */

const uuid = z.guid();

const joinWaitlistSchema = z.strictObject({
  serviceId: uuid,
  day: localDateSchema,
  staffId: uuid.nullable().optional(),
  name: z.string().trim().min(1).max(120),
  phone: e164Schema,
  email: z.email().max(254).optional(),
  consentWaitlist: z.literal(true),
  idempotencyKey: uuid,
});

export type JoinWaitlistInput = z.input<typeof joinWaitlistSchema>;

export type JoinWaitlistCode =
  | "invalid_input"
  | "rate_limited"
  | "not_found"
  | "business_unavailable"
  | "service_not_offered"
  | "not_full"
  | "waitlist_duplicate";

export type JoinWaitlistResult =
  { ok: true } | { ok: false; code: JoinWaitlistCode };

const IP_WINDOW_SECONDS = 10 * 60;
const IP_MAX = 10;
const MAX_ACTIVE_PER_CUSTOMER = 3;

type Parsed = z.output<typeof joinWaitlistSchema>;

async function joinIn(
  q: Queryable,
  input: Parsed & { businessId: string; now: Date; firstAttempt: boolean },
): Promise<Result<true, JoinWaitlistCode>> {
  const day = input.day as LocalDate;
  const loaded = await loadSnapshot(q, {
    businessId: input.businessId,
    serviceId: input.serviceId,
    range: { from: day, to: day },
  });
  if (!loaded.ok) return err("service_not_offered");
  if (!loaded.value.businessActive) return err("business_unavailable");
  const staff = input.staffId ?? ANY_STAFF;
  if (!staffOffersService(loaded.value, staff)) {
    return err("service_not_offered");
  }
  const status = dayStatus({
    snapshot: loaded.value.snapshot,
    date: day,
    staff,
    audience: "customer",
    now: input.now,
  });
  if (status !== "full") return err("not_full");

  const customerId = await findOrCreateCustomer(q, input.businessId, {
    phone: input.phone,
    name: input.name,
    email: input.email,
  });

  const existing = await q.query<{ same: boolean }>(
    `select (service_id = $3 and day = $4::date) as same
       from public.waitlist_entries
      where business_id = $1 and customer_id = $2
        and status in ('waiting', 'offered')`,
    [input.businessId, customerId, input.serviceId, day],
  );
  if (existing.rows.some((r) => r.same)) {
    return input.firstAttempt ? err("waitlist_duplicate") : ok(true);
  }
  if (existing.rows.length >= MAX_ACTIVE_PER_CUSTOMER) {
    return err("rate_limited");
  }

  await q.query(
    `insert into public.waitlist_entries
       (business_id, customer_id, service_id, staff_id, day, created_at)
     values ($1, $2, $3, $4, $5::date, $6)`,
    [
      input.businessId,
      customerId,
      input.serviceId,
      input.staffId ?? null,
      day,
      input.now,
    ],
  );
  // Serverns egen version av väntelistans samtyckestext (aldrig klientens).
  await recordConsent(q, {
    businessId: input.businessId,
    customerId,
    subject: "customer",
    kind: "waitlist",
    version: reserva.waitlist.consentimientoVersion,
    channel: "web",
    granted: true,
  });
  return ok(true);
}

export async function joinWaitlist(
  slug: string,
  input: JoinWaitlistInput,
  now: Date = systemClock(),
): Promise<JoinWaitlistResult> {
  const p = joinWaitlistSchema.safeParse(input);
  if (!p.success) return { ok: false, code: "invalid_input" };
  if (customerEmailRequired(market) && !p.data.email) {
    return { ok: false, code: "invalid_input" };
  }

  const ip = await getClientIp();
  const ipAllowed = await hitRateLimit({
    scope: "waitlist:ip",
    subject: ip,
    windowSeconds: IP_WINDOW_SECONDS,
    max: IP_MAX,
  });
  if (!ipAllowed) return { ok: false, code: "rate_limited" };

  const business = await resolveBusinessBySlug(slug);
  if (!business) return { ok: false, code: "not_found" };

  // Första gången nyckeln ses → en ny anmälan; annars ett omförsök (svaret
  // tappades) som ska få samma `ok` i stället för `waitlist_duplicate`.
  const firstAttempt = await hitRateLimit({
    scope: "waitlist:idem",
    subject: p.data.idempotencyKey,
    windowSeconds: 24 * 60 * 60,
    max: 1,
  });

  const r = await runAs({ kind: "customer" }, (q) =>
    joinIn(q, { ...p.data, businessId: business.id, now, firstAttempt }),
  );
  return r.ok ? { ok: true } : { ok: false, code: r.error };
}
