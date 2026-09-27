import { afterAll, beforeAll, describe, expect, it } from "vitest";

import type pg from "pg";

import {
  fromLocal,
  SANTIAGO,
  type LocalDate,
  type LocalTime,
} from "@/lib/format/dates";
import { closePool } from "@/server/db/pool";
import {
  adminQuery,
  assertLocalDatabase,
  createTestBusiness,
  createTestClient,
  dropTestBusiness,
  type TestBusiness,
} from "@/server/db/testing";
import { toTstzrange } from "@/server/db/tstzrange";
import { createBooking } from "./__fixtures__/flat";

/**
 * F4 "klart när": två samtidiga bokningar av samma tid ger en lyckad och en
 * med ett tydligt fel. Ersätter supabase/tests/042_bookings_concurrency (skip,
 * dblink nekas lokalt). Test 1–2 väntar uttryckligen på låsväntan (R2).
 */

const at = (date: string, time: string) =>
  fromLocal(date as LocalDate, time as LocalTime, SANTIAGO).getTime();
const iso = (ms: number) => new Date(ms).toISOString();
const NOW = new Date(at("2026-10-01", "09:00"));
const MIN = 60_000;

let biz: TestBusiness;
let duo: TestBusiness;
let phoneSeq = 0;
const phone = () => `+5696${String(1_000_000 + ++phoneSeq).slice(-7)}`;

beforeAll(async () => {
  assertLocalDatabase();
  biz = await createTestBusiness({
    services: [
      { key: "corte", durationMin: 35, priceClp: 12000, bufferAfterMin: 10 },
      { key: "barba", durationMin: 20, priceClp: 8000 },
    ],
  });
  duo = await createTestBusiness({
    staff: [
      { key: "diego", sort: 1 },
      { key: "matias", sort: 2 },
    ],
  });
});

afterAll(async () => {
  await dropTestBusiness(biz);
  await dropTestBusiness(duo);
  await closePool();
});

function insertSql(
  b: TestBusiness,
  staffKey: string,
  start: number,
  minutes: number,
) {
  return {
    text: `insert into public.bookings
             (business_id, staff_id, service_id, customer_id, period, blocked,
              status, source, price_clp)
           values ($1, $2, $3, $4, $5::tstzrange, $5::tstzrange, 'confirmed', 'manual', 12000)
           returning id`,
    values: [
      b.id,
      b.staff[staffKey],
      b.services.corte,
      b.customerId,
      toTstzrange({ start, end: start + minutes * MIN }),
    ],
  };
}

async function waitForLock(pid: number): Promise<void> {
  const deadline = process.hrtime.bigint() + 5_000_000_000n;
  while (process.hrtime.bigint() < deadline) {
    const r = await adminQuery<{ w: string | null }>(
      "select wait_event_type as w from pg_stat_activity where pid = $1",
      [pid],
    );
    if (r.rows[0]?.w === "Lock") return;
    await new Promise((res) => setTimeout(res, 20));
  }
  throw new Error("klient 2 väntade aldrig på låset");
}

async function countAt(
  b: TestBusiness,
  staffKey: string,
  start: number,
): Promise<number> {
  const r = await adminQuery<{ n: number }>(
    `select count(*)::int as n from public.bookings
      where business_id = $1 and staff_id = $2
        and blocked && tstzrange($3::timestamptz, $3::timestamptz + interval '1 hour')
        and status = 'confirmed'`,
    [b.id, b.staff[staffKey], iso(start)],
  );
  return r.rows[0]!.n;
}

describe("råa anslutningar (no_overlap under verklig samtidighet)", () => {
  let c1: pg.Client;
  let c2: pg.Client;

  beforeAll(async () => {
    c1 = await createTestClient();
    c2 = await createTestClient();
  });
  afterAll(async () => {
    await c1.end();
    await c2.end();
  });

  it("klient 1 committar → klient 2 får 23P01 (no_overlap), exakt en rad", async () => {
    const x = at("2026-10-06", "11:30");
    const y = at("2026-10-06", "11:45");
    const pid2 = (
      await c2.query<{ pid: number }>("select pg_backend_pid() as pid")
    ).rows[0]!.pid;
    await c1.query("begin");
    await c1.query(insertSql(biz, "diego", x, 35));
    await c2.query("begin");
    const pending = c2.query(insertSql(biz, "diego", y, 35)).then(
      () => ({ ok: true as const }),
      (e: unknown) => ({ ok: false as const, e }),
    );
    await waitForLock(pid2);
    await c1.query("commit");
    const outcome = await pending;
    await c2.query("rollback");
    expect(outcome.ok).toBe(false);
    expect(outcome.ok ? null : outcome.e).toMatchObject({
      code: "23P01",
      constraint: "no_overlap",
    });
    expect(await countAt(biz, "diego", x)).toBe(1);
  });

  it("klient 1 rullar tillbaka → klient 2 lyckas, exakt en rad (Y)", async () => {
    const x = at("2026-10-07", "11:30");
    const y = at("2026-10-07", "11:45");
    const pid2 = (
      await c2.query<{ pid: number }>("select pg_backend_pid() as pid")
    ).rows[0]!.pid;
    await c1.query("begin");
    await c1.query(insertSql(biz, "diego", x, 35));
    await c2.query("begin");
    const pending = c2.query(insertSql(biz, "diego", y, 35));
    await waitForLock(pid2);
    await c1.query("rollback");
    const r = await pending;
    await c2.query("commit");
    expect(r.rowCount).toBe(1);
    const rows = await adminQuery<{ s: number }>(
      `select extract(epoch from lower(period))::float8 * 1000 as s from public.bookings
        where business_id = $1 and staff_id = $2 and lower(period) >= $3::timestamptz
          and lower(period) < $3::timestamptz + interval '1 hour'`,
      [biz.id, biz.staff.diego, iso(x)],
    );
    expect(rows.rows.map((z) => z.s)).toEqual([y]);
  });
});

function book(b: TestBusiness, over: Record<string, unknown>) {
  return createBooking({
    businessId: b.id,
    serviceId: b.services.corte!,
    staffId: b.staff.diego!,
    start: iso(at("2026-10-08", "10:00")),
    customer: { phone: phone(), name: "Cliente" },
    source: "web",
    actor: { kind: "customer" },
    now: NOW,
    ...over,
  });
}

describe("via motorn", () => {
  it("två parallella createBooking för samma profesional och tid → exakt en ok och en slot_taken, 20 av 20 varv", async () => {
    const outcomes: string[] = [];
    for (let round = 0; round < 20; round++) {
      // 20 olika tider: fyra dagar (tors–mån utom sön) × fem tider.
      const date = ["2026-10-08", "2026-10-09", "2026-10-10", "2026-10-12"][
        Math.floor(round / 5)
      ]!;
      const time = ["10:00", "11:00", "12:00", "15:00", "16:00"][round % 5]!;
      const start = iso(at(date, time));
      const [r1, r2] = await Promise.all([
        book(biz, { start }),
        book(biz, { start }),
      ]);
      const oks = [r1, r2].filter((r) => r.ok).length;
      const errors = [r1, r2].flatMap((r) => (r.ok ? [] : [r.error]));
      outcomes.push(`${oks}+${errors.join(",")}`);
      expect(await countAt(biz, "diego", at(date, time))).toBe(1);
    }
    expect(outcomes).toEqual(Array(20).fill("1+slot_taken"));
  });

  it("Cualquiera samtidigt: två lediga, tre parallella → två ok på olika profesionales och en slot_taken", async () => {
    const start = iso(at("2026-10-13", "11:00"));
    const results = await Promise.all(
      [1, 2, 3].map(() => book(duo, { staffId: "any", start })),
    );
    const oks = results.flatMap((r) => (r.ok ? [r.value.staffId] : []));
    const errors = results.flatMap((r) => (r.ok ? [] : [r.error]));
    expect(oks).toHaveLength(2);
    expect(new Set(oks)).toEqual(new Set([duo.staff.diego, duo.staff.matias]));
    expect(errors).toEqual(["slot_taken"]);
  });

  it("buffert samtidigt: A (35 + 10) 10:00 och B 10:40 → exakt en lyckas, 10 av 10 varv", async () => {
    const owner = { kind: "owner" as const, userId: biz.ownerUserId };
    for (const date of [
      "2026-10-14",
      "2026-10-15",
      "2026-10-16",
      "2026-10-17",
      "2026-10-19",
      "2026-10-20",
      "2026-10-21",
      "2026-10-22",
      "2026-10-23",
      "2026-10-24",
    ]) {
      const [a, b] = await Promise.all([
        book(biz, {
          start: iso(at(date, "10:00")),
          actor: owner,
          source: "manual",
        }),
        book(biz, {
          serviceId: biz.services.barba,
          start: iso(at(date, "10:40")),
          actor: owner,
          source: "manual",
        }),
      ]);
      expect([a, b].filter((r) => r.ok)).toHaveLength(1);
      expect([a, b].flatMap((r) => (r.ok ? [] : [r.error]))).toEqual([
        "slot_taken",
      ]);
    }
  });
});
