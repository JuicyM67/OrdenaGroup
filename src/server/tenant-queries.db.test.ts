import { afterAll, beforeAll, describe, expect, it } from "vitest";

import {
  fromLocal,
  SANTIAGO,
  type LocalDate,
  type LocalTime,
} from "@/lib/format/dates";
import type { E164 } from "@/lib/format/phone";
import { cancelIn } from "@/server/bookings/cancel";
import { createIn } from "@/server/bookings/create";
import { moveIn } from "@/server/bookings/move";
import { closePool, type Queryable } from "@/server/db/pool";
import {
  assertLocalDatabase,
  createTestBusiness,
  dropTestBusiness,
  type TestBusiness,
} from "@/server/db/testing";
import { withServiceTx } from "@/server/db/tx";
import {
  availableDaysIn,
  availableSlotsIn,
} from "@/server/scheduling/availability";

/**
 * Säkerhet R6 (dynamiskt): i service-vägen (förbigår RLS) ska VARJE fråga
 * mot en tenant-tabell ha `$1` = rätt business_id och filtrera på det.
 * Frågorna fångas med en Queryable runt transaktionen.
 */

const at = (date: string, time: string) =>
  fromLocal(date as LocalDate, time as LocalTime, SANTIAGO).getTime();
const TUE = "2026-10-06";
const NOW = new Date(at("2026-10-01", "09:00"));
const customer = { kind: "customer" as const };

const TENANT =
  /\b(?:from|join|into|update)\s+(?:public\.)?(bookings|customers|staff|services|staff_services|business_hours|staff_hours|time_off|businesses)\b/gi;

type Captured = { text: string; values: readonly unknown[] };

let biz: TestBusiness;
let other: TestBusiness;

beforeAll(async () => {
  assertLocalDatabase();
  biz = await createTestBusiness();
  other = await createTestBusiness();
});

afterAll(async () => {
  await dropTestBusiness(biz);
  await dropTestBusiness(other);
  await closePool();
});

async function capture<T>(
  fn: (q: Queryable) => Promise<T>,
): Promise<{ value: T; queries: Captured[] }> {
  const queries: Captured[] = [];
  const value = await withServiceTx((q) =>
    fn({
      query: (text, values) => {
        queries.push({ text, values: values ?? [] });
        return q.query(text, values);
      },
    }),
  );
  return { value, queries };
}

function assertScoped(queries: Captured[], businessId: string): number {
  let checked = 0;
  for (const { text, values } of queries) {
    const tables = [...text.matchAll(TENANT)].map((m) => m[1]!.toLowerCase());
    const locks = /pg_advisory_xact_lock/.test(text);
    if (tables.length === 0 && !locks) continue;
    checked++;
    expect(values[0], text).toBe(businessId);
    if (/^\s*insert\s+into\b/i.test(text)) {
      // Insert: business_id är första kolumnen och får värdet $1.
      expect(text, text).toMatch(/into\s+\S+\s*\(\s*business_id\b/i);
      expect(text, text).toMatch(/values\s*\(\s*\$1\b/i);
    } else if (tables.some((t) => t !== "businesses")) {
      expect(text, text).toMatch(/business_id\s*=\s*\$1\b/);
    } else if (!locks) {
      expect(text, text).toMatch(/\b(?:b\.)?id\s*=\s*\$1\b/);
    }
  }
  return checked;
}

describe("varje fråga i service-vägen bär rätt business_id", () => {
  it("availableDaysIn / availableSlotsIn", async () => {
    const common = {
      businessId: biz.id,
      serviceId: biz.services.corte!,
      staffId: "any",
      audience: "customer" as const,
      now: NOW,
    };
    const days = await capture((q) =>
      availableDaysIn(q, {
        ...common,
        from: TUE as LocalDate,
        to: "2026-10-31" as LocalDate,
      }),
    );
    const slots = await capture((q) =>
      availableSlotsIn(q, { ...common, date: TUE as LocalDate }),
    );
    expect(days.value.ok && slots.value.ok).toBe(true);
    expect(assertScoped(days.queries, biz.id)).toBe(6);
    expect(assertScoped(slots.queries, biz.id)).toBe(6);
  });

  it("createIn, moveIn och cancelIn", async () => {
    const created = await capture((q) =>
      createIn(q, {
        businessId: biz.id,
        serviceId: biz.services.corte!,
        staffId: "any",
        start: new Date(at(TUE, "11:00")),
        customer: { phone: "+56944440001" as E164, name: "Cliente" },
        source: "web",
        actor: customer,
        now: NOW,
      }),
    );
    if (!created.value.ok) throw new Error(created.value.error);
    expect(assertScoped(created.queries, biz.id)).toBeGreaterThanOrEqual(9);

    const token = created.value.value.manageToken;
    const moved = await capture((q) =>
      moveIn(q, {
        businessId: biz.id,
        ref: { manageToken: token },
        newStart: new Date(at(TUE, "12:00")),
        actor: customer,
        now: NOW,
      }),
    );
    if (!moved.value.ok) throw new Error(moved.value.error);
    expect(assertScoped(moved.queries, biz.id)).toBeGreaterThanOrEqual(8);
    // D-029: flytten roterade token.
    const newToken = moved.value.value.booking.manageToken;

    const cancelled = await capture((q) =>
      cancelIn(q, {
        businessId: biz.id,
        ref: { manageToken: newToken },
        actor: customer,
        now: NOW,
      }),
    );
    expect(cancelled.value.ok).toBe(true);
    expect(assertScoped(cancelled.queries, biz.id)).toBe(2);
  });

  it("med ett annat företags id rör frågorna bara det företaget", async () => {
    const r = await capture((q) =>
      createIn(q, {
        businessId: other.id,
        serviceId: biz.services.corte!,
        staffId: "any",
        start: new Date(at(TUE, "11:00")),
        customer: { phone: "+56944440002" as E164, name: "Cliente" },
        source: "web",
        actor: customer,
        now: NOW,
      }),
    );
    expect(r.value).toEqual({ ok: false, error: "service_not_offered" });
    expect(assertScoped(r.queries, other.id)).toBeGreaterThan(0);
  });
});
