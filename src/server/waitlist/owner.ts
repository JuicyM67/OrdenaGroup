import "server-only";

import { z } from "zod";

import type { LocalDate } from "@/lib/format/dates";
import { localDateSchema } from "@/lib/format/schemas";
import { hasPerm, loadMember } from "@/server/db/permissions";
import { withOwnerTx } from "@/server/db/tx";
import { systemClock } from "@/server/scheduling/clock";

import { emitWaitlistEvents, type WaitlistEvent } from "./events";
import { asService, loadWaitlistBusiness, offerWaitingIn } from "./match";

/**
 * WP-23: ägarens vy av väntelistan (Agenda/Hoy) och "ta bort". Körs som
 * `authenticated` + RLS (`withOwnerTx`): medlemmar läser, bara owner/
 * `can_manage_all_bookings` får byta status till `removed`.
 */

export type WaitlistEntryStatus = "waiting" | "offered";

export type WaitlistItem = {
  id: string;
  day: LocalDate;
  status: WaitlistEntryStatus;
  serviceId: string;
  serviceName: string;
  /** `null` = vem som helst. */
  staffId: string | null;
  staffName: string | null;
  customerId: string;
  customerName: string;
  /** E.164. */
  customerPhone: string | null;
  /** ISO UTC. */
  createdAt: string;
  /** ISO UTC, bara när `status = "offered"`. */
  offerExpiresAt: string | null;
};

type Row = {
  id: string;
  day: string;
  status: WaitlistEntryStatus;
  service_id: string;
  service_name: string;
  staff_id: string | null;
  staff_name: string | null;
  customer_id: string;
  customer_name: string;
  phone_e164: string | null;
  created_ms: number;
  expires_ms: number | null;
};

const uuid = z.guid();

/**
 * Aktiva poster (waiting/offered), i kö-ordning per dag. `day` satt: bara
 * den dagen; annars från idag (företagets tidszon) och framåt.
 */
export async function listWaitlist(
  userId: string,
  businessId: string,
  day?: string,
  now: Date = systemClock(),
): Promise<WaitlistItem[]> {
  if (!uuid.safeParse(businessId).success) return [];
  const d = day === undefined ? undefined : localDateSchema.safeParse(day);
  if (d && !d.success) return [];
  return withOwnerTx(userId, async (q) => {
    const r = await q.query<Row>(
      `select w.id, w.day::text as day, w.status::text as status,
              w.service_id, s.name as service_name,
              w.staff_id, st.name as staff_name,
              w.customer_id, c.name as customer_name, c.phone_e164,
              extract(epoch from w.created_at)::float8 * 1000 as created_ms,
              extract(epoch from w.offer_expires_at)::float8 * 1000 as expires_ms
         from public.waitlist_entries w
         join public.businesses b on b.id = w.business_id
         join public.services s
           on s.business_id = w.business_id and s.id = w.service_id
         join public.customers c
           on c.business_id = w.business_id and c.id = w.customer_id
         left join public.staff st
           on st.business_id = w.business_id and st.id = w.staff_id
        where w.business_id = $1
          and w.status in ('waiting', 'offered')
          and c.anonymized_at is null
          and (case when $2::date is null
                    then w.day >= ($3::timestamptz at time zone b.timezone)::date
                    else w.day = $2::date end)
        order by w.day, w.created_at, w.id`,
      [businessId, d?.success ? d.data : null, now],
    );
    return r.rows.map((x) => ({
      id: x.id,
      day: x.day as LocalDate,
      status: x.status,
      serviceId: x.service_id,
      serviceName: x.service_name,
      staffId: x.staff_id,
      staffName: x.staff_name,
      customerId: x.customer_id,
      customerName: x.customer_name,
      customerPhone: x.phone_e164,
      createdAt: new Date(Math.round(x.created_ms)).toISOString(),
      offerExpiresAt:
        x.expires_ms === null
          ? null
          : new Date(Math.round(x.expires_ms)).toISOString(),
    }));
  });
}

export type RemoveWaitlistResult =
  | { ok: true }
  | { ok: false; code: "invalid_input" | "not_found" | "forbidden" };

/**
 * Ägaren tar bort en kund ur kön (`removed`). Idempotent (redan borttagen
 * → ok). Var posten `offered` i sekventiellt läge erbjuds nästa i kön
 * (luckan är fortfarande ledig), i samma transaktion.
 */
export async function removeWaitlistEntry(
  userId: string,
  businessId: string,
  entryId: string,
  now: Date = systemClock(),
): Promise<RemoveWaitlistResult> {
  if (!uuid.safeParse(businessId).success || !uuid.safeParse(entryId).success) {
    return { ok: false, code: "invalid_input" };
  }
  const events: WaitlistEvent[] = [];
  const result = await withOwnerTx(
    userId,
    async (q): Promise<RemoveWaitlistResult> => {
      events.length = 0;
      const member = await loadMember(q, userId, businessId);
      if (!member) return { ok: false, code: "not_found" };
      if (!hasPerm(member, "can_manage_all_bookings")) {
        return { ok: false, code: "forbidden" };
      }
      const cur = await q.query<{ status: string; day: string }>(
        `select status::text as status, day::text as day
           from public.waitlist_entries
          where business_id = $1 and id = $2
          for update`,
        [businessId, entryId],
      );
      const row = cur.rows[0];
      if (!row) return { ok: false, code: "not_found" };
      if (row.status === "removed") return { ok: true };
      if (row.status !== "waiting" && row.status !== "offered") {
        return { ok: false, code: "not_found" };
      }
      await q.query(
        `update public.waitlist_entries set status = 'removed'
          where business_id = $1 and id = $2`,
        [businessId, entryId],
      );
      if (row.status === "offered") {
        events.push(
          ...(await asService(q, async () => {
            const business = await loadWaitlistBusiness(q, businessId);
            if (!business || business.mode !== "sequential") return [];
            return offerWaitingIn(q, {
              businessId,
              days: [row.day as LocalDate],
              now,
              business,
            });
          })),
        );
      }
      return { ok: true };
    },
  );
  if (result.ok) await emitWaitlistEvents(events);
  return result;
}
