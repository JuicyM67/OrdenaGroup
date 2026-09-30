import { afterAll, beforeAll, describe, expect, it } from "vitest";

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
  dropTestBusiness,
  insertTestBooking,
  type TestBusiness,
} from "@/server/db/testing";

import { anonymizeCustomer } from "@/server/privacy/customer";

import { confirmBooking, declineBooking, expireRequests } from "./confirm";
import { cancelBooking, createBooking } from "./__fixtures__/flat";

/** WP-45 steg 2 och 6: förfrågningar, bekräfta/neka och utgång. */

const H = 3_600_000;
const at = (date: string, time: string) =>
  fromLocal(date as LocalDate, time as LocalTime, SANTIAGO).getTime();
const iso = (ms: number) => new Date(ms).toISOString();
const TUE = "2026-10-06";
const NOW = new Date(at("2026-10-01", "09:00"));
const customer = { kind: "customer" as const };

let biz: TestBusiness;
let other: TestBusiness;
const owner = () => ({ kind: "owner" as const, userId: biz.ownerUserId });
const ctx = (now = NOW) => ({ businessId: biz.id, actor: owner(), now });

beforeAll(async () => {
  assertLocalDatabase();
  biz = await createTestBusiness({ staff: [{ key: "diego" }] });
  other = await createTestBusiness({ staff: [{ key: "ana" }] });
});

afterAll(async () => {
  await dropTestBusiness(biz);
  await dropTestBusiness(other);
  await closePool();
});

let phoneSeq = 0;
async function book(
  time: string,
  actor: typeof customer | ReturnType<typeof owner> = customer,
  date: string = TUE,
) {
  phoneSeq++;
  const r = await createBooking({
    businessId: biz.id,
    serviceId: biz.services.corte!,
    staffId: biz.staff.diego!,
    start: iso(at(date, time)),
    customer: { phone: `+5691234${String(5000 + phoneSeq)}`, name: "Cliente" },
    source: actor.kind === "owner" ? "manual" : "web",
    actor,
    now: NOW,
  });
  if (!r.ok) throw new Error(r.error);
  return r.value;
}

async function row(id: string) {
  const r = await adminQuery<{
    status: string;
    cancel_reason: string | null;
    cancelled_at: Date | null;
  }>(
    "select status::text as status, cancel_reason, cancelled_at from public.bookings where business_id = $1 and id = $2",
    [biz.id, id],
  );
  return r.rows[0]!;
}

async function setAutoConfirm(on: boolean) {
  await adminQuery(
    "update public.businesses set auto_confirm_bookings = $2 where id = $1",
    [biz.id, on],
  );
}

describe("createBooking (WP-45)", () => {
  it("kund: requested utan auto_confirm, confirmed med; ägaren alltid confirmed", async () => {
    const a = await book("10:00");
    expect(a.status).toBe("requested");
    expect((await row(a.id)).status).toBe("requested");

    await setAutoConfirm(true);
    try {
      const b = await book("11:00");
      expect(b.status).toBe("confirmed");
    } finally {
      await setAutoConfirm(false);
    }

    const c = await book("12:00", owner());
    expect(c.status).toBe("confirmed");
  });

  it("en förfrågan blockerar tiden (slot_taken för nästa kund)", async () => {
    await book("13:00");
    await expect(book("13:00")).rejects.toThrow("slot_taken");
  });
});

describe("confirmBooking / declineBooking", () => {
  it("bekräfta: requested → confirmed; dubbelt → ok utan ändring", async () => {
    const b = await book("14:00");
    expect(await confirmBooking({ bookingId: b.id }, ctx())).toEqual({
      ok: true,
      value: { bookingId: b.id, changed: true },
    });
    expect((await row(b.id)).status).toBe("confirmed");
    expect(await confirmBooking({ bookingId: b.id }, ctx())).toEqual({
      ok: true,
      value: { bookingId: b.id, changed: false },
    });
    // Nekad efter bekräftelse → invalid_status (avboka i stället).
    expect(await declineBooking({ bookingId: b.id }, ctx())).toEqual({
      ok: false,
      error: "invalid_status",
    });
  });

  it("neka: cancelled + declined, tiden ledig; dubbelt → freed null; bekräfta sedan → invalid_status", async () => {
    const b = await book("15:00");
    const when = new Date(at("2026-10-01", "10:15"));
    expect(await declineBooking({ bookingId: b.id }, ctx(when))).toEqual({
      ok: true,
      value: {
        bookingId: b.id,
        freed: {
          staffId: biz.staff.diego,
          blocked: { start: at(TUE, "15:00"), end: at(TUE, "15:35") },
        },
      },
    });
    expect(await row(b.id)).toEqual({
      status: "cancelled",
      cancel_reason: "declined",
      cancelled_at: when,
    });
    expect(await declineBooking({ bookingId: b.id }, ctx(when))).toEqual({
      ok: true,
      value: { bookingId: b.id, freed: null },
    });
    expect(await confirmBooking({ bookingId: b.id }, ctx())).toEqual({
      ok: false,
      error: "invalid_status",
    });
    // Tiden är ledig igen.
    expect((await book("15:00")).status).toBe("requested");
  });

  it("ägare i ett annat företag når inte bokningen (not_found)", async () => {
    const b = await book("16:00");
    const foreign = {
      businessId: biz.id,
      actor: { kind: "owner" as const, userId: other.ownerUserId },
      now: NOW,
    };
    expect(await confirmBooking({ bookingId: b.id }, foreign)).toEqual({
      ok: false,
      error: "not_found",
    });
    expect(await declineBooking({ bookingId: b.id }, foreign)).toEqual({
      ok: false,
      error: "not_found",
    });
    expect((await row(b.id)).status).toBe("requested");
  });

  it("efter deadline (svepet har inte kört) → invalid_status", async () => {
    const b = await book("16:45");
    const late = new Date(at(TUE, "16:45") - 2 * H);
    expect(await confirmBooking({ bookingId: b.id }, ctx(late))).toEqual({
      ok: false,
      error: "invalid_status",
    });
  });

  it("kapplöpning bekräfta ↔ kundens avbokning: exakt en lyckas", async () => {
    for (const time of ["17:30", "18:15"]) {
      const b = await book(time);
      const [conf, canc] = await Promise.all([
        confirmBooking({ bookingId: b.id }, ctx()),
        cancelBooking({
          businessId: biz.id,
          bookingId: b.id,
          actor: customer,
          now: NOW,
        }),
      ]);
      const confOk = conf.ok && conf.value.changed;
      expect([confOk, canc.ok]).toContainEqual(true);
      expect(confOk !== canc.ok).toBe(true);
      expect((await row(b.id)).status).toBe(confOk ? "confirmed" : "cancelled");
      // Förloraren får ett typat fel: bekräftelsen ser en avbokad rad, kunden
      // en roterad token.
      if (confOk) expect(canc).toEqual({ ok: false, error: "not_found" });
      else expect(conf).toEqual({ ok: false, error: "invalid_status" });
    }
  });
});

describe("expireRequests", () => {
  /** Rå förfrågan: `created_at` och start styrs exakt. */
  async function request(
    startMs: number,
    createdAtMs: number,
    b: TestBusiness = biz,
    staffKey = "diego",
  ) {
    const id = await insertTestBooking(b, {
      start: startMs,
      durationMin: 30,
      staffKey,
      serviceKey: "corte",
    });
    await adminQuery(
      "update public.bookings set status = 'requested', created_at = $3 where business_id = $1 and id = $2",
      [b.id, id, new Date(createdAtMs)],
    );
    return id;
  }
  const mine = (xs: { bookingId: string }[]) =>
    xs.map((x) => x.bookingId).filter((id) => ids.has(id));
  const ids = new Set<string>();

  it("24 h-gränsen: exakt 24 h efter created_at går ut, 1 ms före inte", async () => {
    const created = at("2026-11-02", "09:00");
    const id = await request(at("2026-11-10", "11:00"), created);
    ids.add(id);
    expect(mine(await expireRequests(new Date(created + 24 * H - 1)))).toEqual(
      [],
    );
    expect((await row(id)).status).toBe("requested");
    const now = new Date(created + 24 * H);
    expect(mine(await expireRequests(now))).toEqual([id]);
    expect(await row(id)).toEqual({
      status: "cancelled",
      cancel_reason: "expired",
      cancelled_at: now,
    });
    // Idempotent: redan utgången rörs inte igen.
    expect(mine(await expireRequests(now))).toEqual([]);
  });

  it("2 h-gränsen vid sommartidsbytet (CL 2026-09-06): går ut 22:00 lokal dagen före, inte 23:00", async () => {
    const start = at("2026-09-06", "01:00");
    const id = await request(start, start - 10 * H);
    ids.add(id);
    expect(
      mine(await expireRequests(new Date(at("2026-09-05", "22:00") - 1))),
    ).toEqual([]);
    expect(
      mine(await expireRequests(new Date(at("2026-09-05", "22:00")))),
    ).toEqual([id]);
  });

  it("rör bara requested (confirmed med samma tider ligger kvar)", async () => {
    const created = at("2026-11-03", "09:00");
    const start = at("2026-11-12", "11:00");
    const confirmed = await insertTestBooking(biz, {
      start,
      durationMin: 30,
      staffKey: "diego",
    });
    await adminQuery(
      "update public.bookings set created_at = $3 where business_id = $1 and id = $2",
      [biz.id, confirmed, new Date(created)],
    );
    ids.add(confirmed);
    expect(mine(await expireRequests(new Date(start)))).toEqual([]);
    expect((await row(confirmed)).status).toBe("confirmed");
  });

  it("två företag: varje träff bär rätt businessId, beskedet köas i samma transaktion, andra företagets bekräftade orörda", async () => {
    for (const b of [biz, other]) {
      await adminQuery(
        "update public.customers set email = 'kund@example.com' where business_id = $1 and id = $2",
        [b.id, b.customerId],
      );
    }
    const created = at("2026-11-04", "09:00");
    const a = await request(at("2026-11-13", "11:00"), created);
    const o = await request(at("2026-11-13", "11:00"), created, other, "ana");
    const oConfirmed = await insertTestBooking(other, {
      start: at("2026-11-13", "12:00"),
      durationMin: 30,
      staffKey: "ana",
    });
    await adminQuery(
      "update public.bookings set created_at = $3 where business_id = $1 and id = $2",
      [other.id, oConfirmed, new Date(created)],
    );
    ids.add(a).add(o).add(oConfirmed);

    const expired = (await expireRequests(new Date(created + 24 * H))).filter(
      (x) => ids.has(x.bookingId),
    );
    expect(expired.map((x) => [x.bookingId, x.businessId]).sort()).toEqual(
      [
        [a, biz.id],
        [o, other.id],
      ].sort(),
    );
    const st = await adminQuery<{ id: string; status: string }>(
      "select id, status::text as status from public.bookings where business_id = $1 and id = any($2::uuid[])",
      [other.id, [o, oConfirmed]],
    );
    expect(Object.fromEntries(st.rows.map((r) => [r.id, r.status]))).toEqual({
      [o]: "cancelled",
      [oConfirmed]: "confirmed",
    });
    for (const [b, id] of [
      [biz, a],
      [other, o],
    ] as const) {
      const m = await adminQuery<{ template: string }>(
        "select template from public.message_outbox where business_id = $1 and booking_id = $2",
        [b.id, id],
      );
      expect(m.rows.map((r) => r.template)).toContain("solicitudVencida");
    }
  });
});

describe("säkerhetsgranskning WP-45", () => {
  it("confirmIn vägrar när kunden är anonymiserad (invalid_status, förblir requested)", async () => {
    const b = await book("10:15", customer, "2026-10-07");
    await adminQuery(
      "update public.customers set anonymized_at = now() where business_id = $1 and id = $2",
      [biz.id, b.customerId],
    );
    expect(await confirmBooking({ bookingId: b.id }, ctx())).toEqual({
      ok: false,
      error: "invalid_status",
    });
    expect((await row(b.id)).status).toBe("requested");
  });

  it("anonymizeCustomer avbokar kundens requested utan utskick", async () => {
    const b = await book("12:45", customer, "2026-10-07");
    const r = await anonymizeCustomer(biz.ownerUserId, biz.id, b.customerId);
    expect(r).toEqual({ ok: true });
    expect((await row(b.id)).status).toBe("cancelled");
    const m = await adminQuery<{ status: string }>(
      "select status from public.message_outbox where business_id = $1 and booking_id = $2 and status in ('queued', 'failed', 'sending')",
      [biz.id, b.id],
    );
    expect(m.rows).toEqual([]);
  });

  it("ägarens avbokning av en requested blir ett nekande (declined, solicitudRechazada, inte reservaCancelada)", async () => {
    const b = await book("15:45", customer, "2026-10-07");
    await adminQuery(
      "update public.customers set email = 'kund2@example.com' where business_id = $1 and id = $2",
      [biz.id, b.customerId],
    );
    const r = await cancelBooking({
      businessId: biz.id,
      bookingId: b.id,
      reason: "No hay hora",
      actor: owner(),
      now: NOW,
    });
    expect(r.ok).toBe(true);
    expect((await row(b.id)).cancel_reason).toBe("declined");
    const m = await adminQuery<{ template: string }>(
      "select template from public.message_outbox where business_id = $1 and booking_id = $2",
      [biz.id, b.id],
    );
    const templates = m.rows.map((x) => x.template);
    expect(templates).toContain("solicitudRechazada");
    expect(templates).not.toContain("reservaCancelada");
  });
});
