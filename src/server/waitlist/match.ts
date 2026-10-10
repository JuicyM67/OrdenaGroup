import "server-only";

import {
  parseTimeZone,
  toLocalDate,
  type LocalDate,
  type TimeZone,
} from "@/lib/format/dates";
import { can } from "@/config/plans";
import type { Queryable } from "@/server/db/pool";
import { staffOffersService } from "@/server/scheduling/availability";
import type { Interval } from "@/server/scheduling/core/intervals";
import {
  allSlotsForDay,
  needMs,
  type Candidate,
} from "@/server/scheduling/core/slots";
import { loadSnapshot } from "@/server/scheduling/load";
import { ANY_STAFF, type StaffChoice } from "@/server/scheduling/types";

import type { WaitlistEvent } from "./events";
import { createOfferToken } from "./token";

const MIN = 60_000;

/**
 * WP-23 (F8): matchningen mellan en frigjord tid och väntelistan.
 *
 * Allt här körs i ANROPARENS transaktion (avbokning, nekad/utgången
 * förfrågan, godkänd avbokning, flytt, svepet) så att frigörningen och
 * erbjudandet committas tillsammans. Händelserna (`waitlist_offer`)
 * returneras och köas av anroparen EFTER commit (`emitWaitlistEvents`).
 *
 * Skrivningar i `waitlist_entries` (erbjuda, utgå) är server-arbete
 * (service_role, se migrationen 20261001150000): i en ägartransaktion
 * (`authenticated` + RLS) byts rollen lokalt till `service_role` för just
 * väntelistans steg och tillbaka efteråt (`asService`). Behörigheten för
 * själva frigörningen är redan kontrollerad av anroparen.
 */

export type SlotFreedInput = {
  businessId: string;
  staffId: string;
  /** Det frigjorda intervallet (`blocked`, inkl. buffert), UTC. */
  start: Date | number;
  end: Date | number;
  /** Injicerad klocka (min_notice, hålltid). */
  now: Date;
};

type BusinessRow = {
  timezone: string;
  status: string;
  mode: string;
  hold: number;
  plan: string;
};

export type WaitlistBusiness = {
  tz: TimeZone;
  active: boolean;
  mode: "sequential" | "broadcast";
  holdMinutes: number;
};

export async function loadWaitlistBusiness(
  q: Queryable,
  businessId: string,
): Promise<WaitlistBusiness | undefined> {
  const r = await q.query<BusinessRow>(
    `select timezone, status::text as status, waitlist_mode::text as mode,
            waitlist_hold_minutes::int as hold, plan::text as plan
       from public.businesses where id = $1`,
    [businessId],
  );
  const row = r.rows[0];
  if (!row) return undefined;
  const tz = parseTimeZone(row.timezone);
  if (!tz.ok) return undefined;
  return {
    tz: tz.value,
    // WP-73 (D-048): väntelistan pausas (inga erbjudanden) när planen
    // saknar den; befintliga anmälningar ligger kvar.
    active: row.status === "active" && can(row.plan, "waitlist"),
    mode: row.mode === "broadcast" ? "broadcast" : "sequential",
    holdMinutes: row.hold,
  };
}

/**
 * Kör `fn` som `service_role` i den pågående transaktionen. Är rollen
 * `authenticated` (ägarens transaktion) byts den lokalt och återställs
 * efteråt; annars (service_role, eller postgres i tester) körs `fn` direkt.
 */
export async function asService<T>(
  q: Queryable,
  fn: () => Promise<T>,
): Promise<T> {
  const r = await q.query<{ role: string }>(
    `select current_user::text as role`,
  );
  if (r.rows[0]?.role !== "authenticated") return fn();
  await q.query("set local role service_role");
  try {
    return await fn();
  } finally {
    await q.query("set local role authenticated");
  }
}

/** Cache av ögonblicksbilder per (tjänst, dag) inom ett anrop. */
export type SnapshotCache = Map<
  string,
  Awaited<ReturnType<typeof loadSnapshot>>
>;

/**
 * Kundens giltiga starttider (notice, horisont, rutnät — samma som
 * `createBooking` godtar) för tjänsten på dagen, eventuellt bara de som
 * överlappar `freed` (den frigjorda luckan).
 */
export async function waitlistSlotsIn(
  q: Queryable,
  cache: SnapshotCache,
  input: {
    businessId: string;
    serviceId: string;
    day: LocalDate;
    staff: StaffChoice;
    now: Date;
    freed?: Interval | undefined;
  },
): Promise<Candidate[]> {
  const key = `${input.serviceId}|${input.day}`;
  let loaded = cache.get(key);
  if (!loaded) {
    loaded = await loadSnapshot(q, {
      businessId: input.businessId,
      serviceId: input.serviceId,
      range: { from: input.day, to: input.day },
    });
    cache.set(key, loaded);
  }
  if (!loaded.ok || !loaded.value.businessActive) return [];
  if (!staffOffersService(loaded.value, input.staff)) return [];
  const snapshot = loaded.value.snapshot;
  const need = needMs(snapshot);
  const all = allSlotsForDay({
    snapshot,
    date: input.day,
    staff: input.staff,
    audience: "customer",
    now: input.now,
  });
  const freed = input.freed;
  return freed
    ? all.filter((c) => c.start < freed.end && c.start + need > freed.start)
    : all;
}

type WaitingRow = {
  id: string;
  service_id: string;
  staff_id: string | null;
  day: string;
};

/**
 * Erbjuder posten: `waiting → offered`, ny token (bara hashen sparas),
 * `offer_expires_at = now + hålltid`. Villkorad på `waiting` (sista spärren).
 */
async function offerEntryIn(
  q: Queryable,
  businessId: string,
  entryId: string,
  now: Date,
  holdMinutes: number,
): Promise<WaitlistEvent | undefined> {
  const { token, hash } = createOfferToken();
  const r = await q.query(
    `update public.waitlist_entries
        set status = 'offered', offered_at = $3, offer_expires_at = $4,
            offer_token_hash = $5
      where business_id = $1 and id = $2 and status = 'waiting'`,
    [
      businessId,
      entryId,
      now,
      new Date(now.getTime() + holdMinutes * MIN),
      hash,
    ],
  );
  if ((r.rowCount ?? 0) !== 1) return undefined;
  return { type: "waitlist_offer", businessId, entryId, token };
}

/**
 * Erbjuder väntande poster för `days` i kö-ordning (`created_at`).
 * `freed` satt: bara poster vars tjänst ryms i den frigjorda luckan hos
 * `freed.staffId` (posten utan profesional eller med samma). Utan `freed`
 * (svepet efter ett utgånget erbjudande): någon giltig tid den dagen.
 * Sekventiellt: högst `max` (1); broadcast: alla som passar.
 */
export async function offerWaitingIn(
  q: Queryable,
  input: {
    businessId: string;
    days: readonly LocalDate[];
    now: Date;
    freed?: { staffId: string; interval: Interval } | undefined;
    business: WaitlistBusiness;
  },
): Promise<WaitlistEvent[]> {
  const { business } = input;
  if (!business.active || input.days.length === 0) return [];
  const r = await q.query<WaitingRow>(
    `select w.id, w.service_id, w.staff_id, w.day::text as day
       from public.waitlist_entries w
       join public.customers c
         on c.business_id = w.business_id and c.id = w.customer_id
      where w.business_id = $1 and w.status = 'waiting'
        and w.day = any($2::date[])
        and ($3::uuid is null or w.staff_id is null or w.staff_id = $3::uuid)
        and c.anonymized_at is null
      order by w.created_at, w.id
      for update of w skip locked`,
    [input.businessId, input.days, input.freed?.staffId ?? null],
  );
  const max = business.mode === "sequential" ? 1 : Number.POSITIVE_INFINITY;
  const cache: SnapshotCache = new Map();
  const events: WaitlistEvent[] = [];
  for (const w of r.rows) {
    if (events.length >= max) break;
    const slots = await waitlistSlotsIn(q, cache, {
      businessId: input.businessId,
      serviceId: w.service_id,
      day: w.day as LocalDate,
      staff: input.freed?.staffId ?? w.staff_id ?? ANY_STAFF,
      now: input.now,
      freed: input.freed?.interval,
    });
    if (slots.length === 0) continue;
    const e = await offerEntryIn(
      q,
      input.businessId,
      w.id,
      input.now,
      business.holdMinutes,
    );
    if (e) events.push(e);
  }
  return events;
}

/**
 * WP-23: anropas i samma transaktion efter varje frigörning (avbokning,
 * nekad/utgången förfrågan, godkänd avbokning, flytt). Returnerar
 * `waitlist_offer`-händelserna; anroparen köar dem efter commit.
 * En lucka som redan passerat (eller ett inaktivt företag) ger inget.
 */
export async function onSlotFreed(
  q: Queryable,
  input: SlotFreedInput,
): Promise<WaitlistEvent[]> {
  const start =
    typeof input.start === "number" ? input.start : input.start.getTime();
  const end = typeof input.end === "number" ? input.end : input.end.getTime();
  if (end <= input.now.getTime() || end <= start) return [];
  return asService(q, async () => {
    const business = await loadWaitlistBusiness(q, input.businessId);
    if (!business) return [];
    const first = toLocalDate(new Date(start), business.tz);
    const last = toLocalDate(new Date(end - 1), business.tz);
    const days = first === last ? [first] : [first, last];
    return offerWaitingIn(q, {
      businessId: input.businessId,
      days,
      now: input.now,
      freed: { staffId: input.staffId, interval: { start, end } },
      business,
    });
  });
}

/**
 * Hjälpare för bokningsflödena: kör `onSlotFreed` när `freed` finns och
 * samlar händelserna i `sink` (töms först — `runAs` kan köra om hela
 * transaktionen en gång vid 40P01/40001).
 */
export async function collectFreed(
  q: Queryable,
  sink: WaitlistEvent[],
  input: {
    businessId: string;
    now: Date;
    freed: { staffId: string; blocked: Interval } | null;
  },
): Promise<void> {
  sink.length = 0;
  if (!input.freed) return;
  sink.push(
    ...(await onSlotFreed(q, {
      businessId: input.businessId,
      staffId: input.freed.staffId,
      start: input.freed.blocked.start,
      end: input.freed.blocked.end,
      now: input.now,
    })),
  );
}
