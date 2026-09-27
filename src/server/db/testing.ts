import "server-only";

import { randomUUID } from "node:crypto";

import pg from "pg";

import { getPool, type QueryResultLike } from "./pool";
import { toTstzrange } from "./tstzrange";

/**
 * Bara för integrationstester (`*.db.test.ts`). Allt körs som `postgres`
 * (förbigår RLS) direkt på poolen. Varje testfil skapar egna företag med
 * unik slug och städar efter sig; seed används aldrig.
 *
 * Hård regel 8: `assertLocalDatabase()` avbryter om DATABASE_URL inte pekar
 * på den lokala containern. Alla byggare anropar den först.
 */

const LOCAL_HOSTS = new Set(["127.0.0.1", "localhost", "[::1]", "::1"]);

export function assertLocalDatabase(): void {
  const cs = getPool().options.connectionString ?? "";
  let host = "";
  try {
    host = new URL(cs).hostname;
  } catch {
    host = "";
  }
  if (!LOCAL_HOSTS.has(host)) {
    throw new Error(
      "Integrationstester får bara köras mot den lokala databasen (127.0.0.1/localhost)",
    );
  }
}

/**
 * En egen anslutning utanför poolen (samtidighetstester: två riktiga
 * transaktioner). Samma URL som poolen; anroparen ansvarar för `end()`.
 */
export async function createTestClient(): Promise<pg.Client> {
  assertLocalDatabase();
  const client = new pg.Client({
    connectionString: getPool().options.connectionString,
  });
  await client.connect();
  return client;
}

export async function adminQuery<R extends object = Record<string, unknown>>(
  text: string,
  values?: readonly unknown[],
): Promise<QueryResultLike<R>> {
  assertLocalDatabase();
  const r = await getPool().query<R>(text, values as unknown[] | undefined);
  return { rows: r.rows, rowCount: r.rowCount };
}

// ---------------------------------------------------------------------------
// Fixturer
// ---------------------------------------------------------------------------

export type TestHours = { weekday: number; start: string; end: string };

export type TestStaff = {
  key: string;
  name?: string;
  sort?: number;
  active?: boolean;
  /** Utan rader följer profesionalen företagets öppettider. */
  hours?: TestHours[];
};

export type TestService = {
  key: string;
  name?: string;
  durationMin: number;
  priceClp: number;
  bufferAfterMin?: number;
  active?: boolean;
  /** Nycklar för profesionales som utför tjänsten (standard: alla). */
  staff?: string[];
};

export type TestSettings = {
  minNoticeMinutes?: number;
  maxDaysAhead?: number;
  cancelWindowHours?: number;
  slotIntervalMinutes?: number;
};

export type TestBusinessOptions = {
  settings?: TestSettings;
  /** Standard: mån–lör 10:00–19:00. */
  hours?: TestHours[];
  /** Standard: diego, matias, tomas (sort 1–3). */
  staff?: TestStaff[];
  /** Standard: corte (35 min), barba (20 min), corte_barba (50 min + 10 buffert). */
  services?: TestService[];
};

export type TestBusiness = {
  id: string;
  slug: string;
  ownerUserId: string;
  staff: Record<string, string>;
  services: Record<string, string>;
  /** En kund för råa bokningar (insertTestBooking). */
  customerId: string;
};

const MON_SAT_10_19: TestHours[] = [1, 2, 3, 4, 5, 6].map((weekday) => ({
  weekday,
  start: "10:00",
  end: "19:00",
}));

const DEFAULT_STAFF: TestStaff[] = [
  { key: "diego", name: "Diego", sort: 1 },
  { key: "matias", name: "Matías", sort: 2 },
  { key: "tomas", name: "Tomás", sort: 3 },
];

const DEFAULT_SERVICES: TestService[] = [
  { key: "corte", name: "Corte clásico", durationMin: 35, priceClp: 12000 },
  { key: "barba", name: "Barba", durationMin: 20, priceClp: 8000 },
  {
    key: "corte_barba",
    name: "Corte + barba",
    durationMin: 50,
    priceClp: 18000,
    bufferAfterMin: 10,
  },
];

/** Postgres `time`: "24:00" skrivs som "24:00:00" (tillåtet i `time`). */
function pgTime(t: string): string {
  return `${t}:00`;
}

function randomPhone(): string {
  // +569 + 8 siffror, unikt nog per testkörning.
  const n = Math.floor(10_000_000 + Math.random() * 89_999_999);
  return `+569${n}`;
}

export async function createTestUser(): Promise<string> {
  const id = randomUUID();
  await adminQuery(
    "insert into auth.users (id, email, role, aud) values ($1, $2, 'authenticated', 'authenticated')",
    [id, `${id}@test.invalid`],
  );
  return id;
}

export async function dropTestUser(id: string): Promise<void> {
  await adminQuery("delete from auth.users where id = $1", [id]);
}

export async function createTestBusiness(
  opts: TestBusinessOptions = {},
): Promise<TestBusiness> {
  assertLocalDatabase();
  const id = randomUUID();
  const slug = `t-${id.slice(0, 8)}-${id.slice(9, 13)}`;
  const s = opts.settings ?? {};
  await adminQuery(
    `insert into public.businesses
       (id, slug, name, comuna, category, min_notice_minutes, max_days_ahead,
        cancel_window_hours, slot_interval_minutes)
     values ($1, $2, 'Barbería Test', 'Providencia', 'barberia', $3, $4, $5, $6)`,
    [
      id,
      slug,
      s.minNoticeMinutes ?? 60,
      s.maxDaysAhead ?? 30,
      s.cancelWindowHours ?? 3,
      s.slotIntervalMinutes ?? 15,
    ],
  );

  const ownerUserId = await createTestUser();
  await adminQuery(
    "insert into public.memberships (business_id, user_id, role) values ($1, $2, 'owner')",
    [id, ownerUserId],
  );

  for (const h of opts.hours ?? MON_SAT_10_19) {
    await adminQuery(
      "insert into public.business_hours (business_id, weekday, start_time, end_time) values ($1, $2, $3, $4)",
      [id, h.weekday, pgTime(h.start), pgTime(h.end)],
    );
  }

  const staff: Record<string, string> = {};
  const staffList = opts.staff ?? DEFAULT_STAFF;
  for (const [i, st] of staffList.entries()) {
    const r = await adminQuery<{ id: string }>(
      `insert into public.staff (business_id, name, color, active, sort)
       values ($1, $2, $3, $4, $5) returning id`,
      [
        id,
        st.name ?? st.key,
        `staff-${(i % 6) + 1}`,
        st.active ?? true,
        st.sort ?? i + 1,
      ],
    );
    staff[st.key] = r.rows[0]!.id;
    for (const h of st.hours ?? []) {
      await adminQuery(
        "insert into public.staff_hours (business_id, staff_id, weekday, start_time, end_time) values ($1, $2, $3, $4, $5)",
        [id, staff[st.key], h.weekday, pgTime(h.start), pgTime(h.end)],
      );
    }
  }

  const services: Record<string, string> = {};
  for (const [i, sv] of (opts.services ?? DEFAULT_SERVICES).entries()) {
    const r = await adminQuery<{ id: string }>(
      `insert into public.services
         (business_id, name, duration_min, price_clp, buffer_after_min, active, sort)
       values ($1, $2, $3, $4, $5, $6, $7) returning id`,
      [
        id,
        sv.name ?? sv.key,
        sv.durationMin,
        sv.priceClp,
        sv.bufferAfterMin ?? 0,
        sv.active ?? true,
        i + 1,
      ],
    );
    services[sv.key] = r.rows[0]!.id;
    for (const key of sv.staff ?? staffList.map((x) => x.key)) {
      await adminQuery(
        "insert into public.staff_services (business_id, staff_id, service_id) values ($1, $2, $3)",
        [id, staff[key], services[sv.key]],
      );
    }
  }

  const c = await adminQuery<{ id: string }>(
    "insert into public.customers (business_id, phone_e164, name) values ($1, $2, 'Cliente Test') returning id",
    [id, randomPhone()],
  );

  return { id, slug, ownerUserId, staff, services, customerId: c.rows[0]!.id };
}

export async function dropTestBusiness(biz: TestBusiness): Promise<void> {
  await adminQuery("delete from public.businesses where id = $1", [biz.id]);
  await dropTestUser(biz.ownerUserId);
}

export type TestBookingStatus =
  "pending_payment" | "confirmed" | "completed" | "no_show" | "cancelled";

/** Rå bokning som `postgres` (förbigår motorn). Returnerar id. */
export async function insertTestBooking(
  biz: TestBusiness,
  b: {
    start: number;
    durationMin: number;
    bufferMin?: number;
    staffKey?: string;
    serviceKey?: string;
    status?: TestBookingStatus;
    customerId?: string;
  },
): Promise<string> {
  const staffId = biz.staff[b.staffKey ?? Object.keys(biz.staff)[0]!];
  const serviceId = biz.services[b.serviceKey ?? Object.keys(biz.services)[0]!];
  const end = b.start + b.durationMin * 60_000;
  const blockedEnd = end + (b.bufferMin ?? 0) * 60_000;
  const status = b.status ?? "confirmed";
  const r = await adminQuery<{ id: string }>(
    `insert into public.bookings
       (business_id, staff_id, service_id, customer_id, period, blocked, status,
        source, price_clp, pending_expires_at, cancelled_at)
     values ($1, $2, $3, $4, $5::tstzrange, $6::tstzrange, $7::public.booking_status,
        'manual', 10000,
        case when $7 = 'pending_payment' then now() + interval '15 minutes' end,
        case when $7 = 'cancelled' then now() end)
     returning id`,
    [
      biz.id,
      staffId,
      serviceId,
      b.customerId ?? biz.customerId,
      toTstzrange({ start: b.start, end }),
      toTstzrange({ start: b.start, end: blockedEnd }),
      status,
    ],
  );
  return r.rows[0]!.id;
}

/** Frånvaro som `postgres`. `staffKey` null/utelämnad = hela företaget. */
export async function insertTestTimeOff(
  biz: TestBusiness,
  t: {
    start: number;
    end: number;
    staffKey?: string | null;
    kind?: "block" | "lunch" | "vacation" | "holiday";
  },
): Promise<string> {
  const r = await adminQuery<{ id: string }>(
    `insert into public.time_off (business_id, staff_id, period, kind)
     values ($1, $2, $3::tstzrange, $4::public.time_off_kind) returning id`,
    [
      biz.id,
      t.staffKey ? biz.staff[t.staffKey] : null,
      toTstzrange({ start: t.start, end: t.end }),
      t.kind ?? "block",
    ],
  );
  return r.rows[0]!.id;
}
