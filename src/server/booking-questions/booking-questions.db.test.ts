import { randomUUID } from "node:crypto";

import { afterAll, beforeAll, describe, expect, it } from "vitest";

import {
  fromLocal,
  SANTIAGO,
  type LocalDate,
  type LocalTime,
} from "@/lib/format/dates";
import { createBooking } from "@/server/bookings/create";
import { closePool } from "@/server/db/pool";
import {
  adminQuery,
  assertLocalDatabase,
  createTestBusiness,
  dropTestBusiness,
  insertTestBooking,
  type TestBusiness,
} from "@/server/db/testing";
import {
  activatePreset,
  createCategory,
  createQuestion,
  deleteQuestion,
  loadBookingFormSettings,
  setQuestionActive,
  setQuestionTargets,
  setServiceCategory,
  updateQuestion,
} from "@/server/owner/booking-questions";

import { getBookingAnswers, getCustomerAnswers } from "./answers";
import {
  getQuestionsForService,
  getQuestionsForServiceAsOwner,
} from "./catalog";

const at = (date: string, time: string) =>
  fromLocal(date as LocalDate, time as LocalTime, SANTIAGO).getTime();
const iso = (ms: number) => new Date(ms).toISOString();
const TUE = "2026-10-06";
const NOW = new Date(at("2026-10-01", "09:00"));
let phoneSeq = 0;
const phone = () => `+5697${String(1_000_000 + ++phoneSeq).slice(-7)}`;

let biz: TestBusiness;
let other: TestBusiness;
let dam: string;
let qAll: string; // short_text, alla, sparas på kundkortet
let qCorte: string; // single_choice, obligatorisk, bara tjänsten "corte"
let qDam: string; // yes_no, kategorin Dam (corte ligger i Dam)
let qBarba: string; // bara "barba"
let qForeign: string; // annat företag

async function insertQuestion(
  b: TestBusiness,
  over: {
    label: string;
    kind?: string;
    options?: string[];
    required?: boolean;
    saveToCustomer?: boolean;
    appliesTo?: "all" | "targets";
    sort?: number;
  },
): Promise<string> {
  const r = await adminQuery<{ id: string }>(
    `insert into public.booking_questions
       (business_id, label, kind, options, required, save_to_customer, applies_to, sort)
     values ($1, $2, $3::public.question_kind, $4::jsonb, $5, $6,
             $7::public.booking_question_applies_to, $8) returning id`,
    [
      b.id,
      over.label,
      over.kind ?? "short_text",
      over.options ? JSON.stringify(over.options) : null,
      over.required ?? false,
      over.saveToCustomer ?? false,
      over.appliesTo ?? "targets",
      over.sort ?? 0,
    ],
  );
  return r.rows[0]!.id;
}

async function target(
  b: TestBusiness,
  questionId: string,
  t: { serviceId?: string; categoryId?: string },
) {
  await adminQuery(
    `insert into public.booking_question_targets (business_id, question_id, service_id, category_id)
     values ($1, $2, $3, $4)`,
    [b.id, questionId, t.serviceId ?? null, t.categoryId ?? null],
  );
}

beforeAll(async () => {
  assertLocalDatabase();
  biz = await createTestBusiness();
  other = await createTestBusiness();
  const c = await adminQuery<{ id: string }>(
    "insert into public.service_categories (business_id, name, sort) values ($1, 'Dam', 1) returning id",
    [biz.id],
  );
  dam = c.rows[0]!.id;
  await adminQuery(
    "update public.services set category_id = $2 where business_id = $1 and id = $3",
    [biz.id, dam, biz.services.corte],
  );
  qAll = await insertQuestion(biz, {
    label: "Alergias",
    appliesTo: "all",
    saveToCustomer: true,
    sort: 3,
  });
  qCorte = await insertQuestion(biz, {
    label: "Largo de pelo",
    kind: "single_choice",
    options: ["Corto", "Largo"],
    required: true,
    sort: 1,
  });
  await target(biz, qCorte, { serviceId: biz.services.corte });
  qDam = await insertQuestion(biz, {
    label: "¿Primera vez?",
    kind: "yes_no",
    sort: 2,
  });
  await target(biz, qDam, { categoryId: dam });
  // Dubbelträff: tjänst + kategori → en gång.
  await target(biz, qDam, { serviceId: biz.services.corte });
  qBarba = await insertQuestion(biz, { label: "Barba", sort: 4 });
  await target(biz, qBarba, { serviceId: biz.services.barba });
  qForeign = await insertQuestion(other, { label: "Otro", appliesTo: "all" });
});

afterAll(async () => {
  for (const b of [biz, other]) await dropTestBusiness(b);
  await closePool();
});

function book(
  b: TestBusiness,
  over: {
    time?: string;
    answers?: Record<string, unknown>;
    phone?: string;
    idempotencyKey?: string;
    serviceKey?: string;
  } = {},
) {
  return createBooking(
    {
      serviceId: b.services[over.serviceKey ?? "corte"]!,
      staffId: b.staff.diego!,
      start: iso(at(TUE, over.time ?? "11:00")),
      customer: { phone: over.phone ?? phone(), name: "Camila Rojas" },
      ...(over.answers !== undefined ? { answers: over.answers } : {}),
      ...(over.idempotencyKey ? { idempotencyKey: over.idempotencyKey } : {}),
    },
    { businessId: b.id, actor: { kind: "customer" }, now: NOW },
  );
}

async function answerRows(bookingId: string) {
  const r = await adminQuery<{
    question_id: string | null;
    label_snapshot: string;
    value: unknown;
  }>(
    "select question_id, label_snapshot, value from public.booking_answers where booking_id = $1",
    [bookingId],
  );
  return r.rows.sort((a, b) => (a.label_snapshot < b.label_snapshot ? -1 : 1));
}

describe("getQuestionsForService", () => {
  it("all + tjänst + kategori, en gång, sorterat", async () => {
    const qs = await getQuestionsForService(biz.id, biz.services.corte!);
    expect(qs.map((x) => x.id)).toEqual([qCorte, qDam, qAll]);
    const barba = await getQuestionsForService(biz.id, biz.services.barba!);
    expect(barba.map((x) => x.id)).toEqual([qAll, qBarba]);
  });

  it("tjänst från ett annat företag → tom lista", async () => {
    expect(await getQuestionsForService(biz.id, other.services.corte!)).toEqual(
      [],
    );
    expect(await getQuestionsForService(biz.id, "nope")).toEqual([]);
  });

  it("ägarens förhandsvisning via RLS; en annan ägare ser inget", async () => {
    const own = await getQuestionsForServiceAsOwner(
      biz.ownerUserId,
      biz.id,
      biz.services.corte!,
    );
    expect(own).toHaveLength(3);
    const foreign = await getQuestionsForServiceAsOwner(
      other.ownerUserId,
      biz.id,
      biz.services.corte!,
    );
    expect(foreign).toEqual([]);
  });
});

describe("createBooking med svar", () => {
  it("sparar booking_answers (kopia) och customer_answers (bara save_to_customer) i samma transaktion", async () => {
    const p = phone();
    const r = await book(biz, {
      phone: p,
      answers: { [qCorte]: "Largo", [qDam]: false, [qAll]: "Tinturas" },
    });
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(await answerRows(r.value.id)).toEqual(
      [
        { question_id: qAll, label_snapshot: "Alergias", value: "Tinturas" },
        {
          question_id: qCorte,
          label_snapshot: "Largo de pelo",
          value: "Largo",
        },
        { question_id: qDam, label_snapshot: "¿Primera vez?", value: false },
      ].sort((a, b) => (a.label_snapshot < b.label_snapshot ? -1 : 1)),
    );
    const ca = await adminQuery<{ question_id: string; value: unknown }>(
      "select question_id, value from public.customer_answers where customer_id = $1",
      [r.value.customerId],
    );
    expect(ca.rows).toEqual([{ question_id: qAll, value: "Tinturas" }]);

    // Nästa bokning från samma kund: senaste värdet vinner, en rad.
    const r2 = await book(biz, {
      phone: p,
      time: "15:00",
      answers: { [qCorte]: "Corto", [qAll]: "Ninguna" },
    });
    expect(r2.ok).toBe(true);
    const ca2 = await adminQuery<{ value: unknown }>(
      "select value from public.customer_answers where customer_id = $1",
      [r.value.customerId],
    );
    expect(ca2.rows).toEqual([{ value: "Ninguna" }]);

    // Läsfunktioner för agenda/Hoy och kundkortet.
    const view = await getBookingAnswers(biz.ownerUserId, biz.id, r.value.id);
    expect(view.map((x) => x.label)).toEqual([
      "Largo de pelo",
      "¿Primera vez?",
      "Alergias",
    ]);
    const card = await getCustomerAnswers(
      biz.ownerUserId,
      biz.id,
      r.value.customerId,
    );
    expect(card.latest).toMatchObject([{ questionId: qAll, value: "Ninguna" }]);
    expect(card.history.map((h) => h.bookingId)).toEqual([
      r2.ok ? r2.value.id : "",
      r.value.id,
    ]);
    // Tenant: en annan ägare ser inga svar.
    expect(
      await getBookingAnswers(other.ownerUserId, biz.id, r.value.id),
    ).toEqual([]);
    expect(
      (await getCustomerAnswers(other.ownerUserId, biz.id, r.value.customerId))
        .latest,
    ).toEqual([]);
  });

  it("obligatorisk fråga saknas → invalid_input, ingen bokning", async () => {
    const r = await book(biz, { time: "12:00", answers: {} });
    expect(r).toEqual({ ok: false, error: "invalid_input" });
    const r2 = await book(biz, { time: "12:00" });
    expect(r2).toEqual({ ok: false, error: "invalid_input" });
  });

  it("fråga från ett annat företag eller en annan tjänst avvisas", async () => {
    for (const extra of [qForeign, qBarba]) {
      const r = await book(biz, {
        time: "12:00",
        answers: { [qCorte]: "Corto", [extra]: "x" },
      });
      expect(r).toEqual({ ok: false, error: "invalid_input" });
    }
  });

  it("23P01 (tiden tagen): varken bokning, kund eller svar sparas", async () => {
    const start = at(TUE, "16:00");
    await insertTestBooking(biz, { start, durationMin: 60, staffKey: "diego" });
    const p = phone();
    const before = await adminQuery<{ n: number }>(
      "select count(*)::int as n from public.booking_answers where business_id = $1",
      [biz.id],
    );
    const r = await book(biz, {
      time: "16:00",
      phone: p,
      answers: { [qCorte]: "Corto", [qAll]: "Látex" },
    });
    // checkStart ser konflikten (outside_hours/slot_taken) före insert, eller
    // no_overlap ger slot_taken — i båda fallen rullas allt tillbaka.
    expect(r.ok).toBe(false);
    const after = await adminQuery<{ n: number }>(
      "select count(*)::int as n from public.booking_answers where business_id = $1",
      [biz.id],
    );
    expect(after.rows[0]!.n).toBe(before.rows[0]!.n);
    const cust = await adminQuery(
      "select 1 from public.customers where business_id = $1 and phone_e164 = $2",
      [biz.id, p],
    );
    expect(cust.rowCount).toBe(0);
  });

  it("23P01 i själva insert (samtidig bokning) sparar inga svar", async () => {
    // Två samtidiga anrop mot samma tid och profesional: ett lyckas, det andra
    // får slot_taken via no_overlap/låset. Bara vinnarens svar finns.
    const answers = { [qCorte]: "Corto" };
    const [a, b] = await Promise.all([
      book(biz, { time: "17:00", answers }),
      book(biz, { time: "17:00", answers }),
    ]);
    const winners = [a, b].filter((x) => x.ok);
    expect(winners).toHaveLength(1);
    expect([a, b].find((x) => !x.ok)).toEqual({
      ok: false,
      error: "slot_taken",
    });
    const rows = await adminQuery<{ booking_id: string }>(
      `select ba.booking_id from public.booking_answers ba
         join public.bookings b on b.business_id = ba.business_id and b.id = ba.booking_id
        where ba.business_id = $1 and lower(b.period) = $2::timestamptz`,
      [biz.id, iso(at(TUE, "17:00"))],
    );
    expect(rows.rows.map((x) => x.booking_id)).toEqual([
      winners[0]!.ok ? winners[0]!.value.id : "",
    ]);
  });

  it("idempotens: omförsök med samma nyckel dubblerar inte svaren", async () => {
    const key = randomUUID();
    const p = phone();
    const answers = { [qCorte]: "Largo" };
    const r1 = await book(biz, {
      time: "13:00",
      phone: p,
      answers,
      idempotencyKey: key,
    });
    const r2 = await book(biz, {
      time: "13:00",
      phone: p,
      answers,
      idempotencyKey: key,
    });
    expect(r1.ok && r2.ok).toBe(true);
    if (!r1.ok || !r2.ok) return;
    expect(r2.value.id).toBe(r1.value.id);
    expect(await answerRows(r1.value.id)).toHaveLength(1);
  });

  it("ägarens manuella bokning utan svar hoppar över frågorna", async () => {
    const r = await createBooking(
      {
        serviceId: biz.services.corte!,
        staffId: biz.staff.matias!,
        start: iso(at(TUE, "11:00")),
        customer: { phone: phone(), name: "Manual" },
      },
      {
        businessId: biz.id,
        actor: { kind: "owner", userId: biz.ownerUserId },
        now: NOW,
      },
    );
    expect(r.ok).toBe(true);
    if (r.ok) expect(await answerRows(r.value.id)).toEqual([]);
  });
});

describe("ägarens CRUD", () => {
  let fresh: TestBusiness;
  beforeAll(async () => {
    fresh = await createTestBusiness();
  });
  afterAll(async () => {
    await dropTestBusiness(fresh);
  });
  const owner = () => fresh.ownerUserId;

  it("kategorier: skapa, dubblettnamn, sätt tjänstens kategori; annat företags kategori avvisas", async () => {
    const c = await createCategory(owner(), fresh.id, { name: " Herr " });
    expect(c.ok).toBe(true);
    expect(await createCategory(owner(), fresh.id, { name: "Herr" })).toEqual({
      ok: false,
      code: "category.name_taken",
    });
    expect(await createCategory(owner(), fresh.id, { name: "  " })).toEqual({
      ok: false,
      code: "category.name_empty",
    });
    if (!c.ok) return;
    expect(
      await setServiceCategory(owner(), fresh.id, fresh.services.corte!, c.id),
    ).toEqual({ ok: true });
    expect(
      await setServiceCategory(owner(), fresh.id, fresh.services.barba!, dam),
    ).toEqual({ ok: false, code: "invalid_target" });
    // En annan ägare kan inte ändra företagets tjänst.
    expect(
      await setServiceCategory(
        other.ownerUserId,
        fresh.id,
        fresh.services.corte!,
        null,
      ),
    ).toEqual({ ok: false, code: "not_found" });
  });

  it("frågor: skapa, mål i annat företag avvisas, max 5 ger too_many_questions", async () => {
    const make = (n: number, targets: unknown) =>
      createQuestion(owner(), fresh.id, {
        question: { label: `P${n}`, kind: "short_text" },
        targets,
      });
    expect(
      await make(0, {
        appliesTo: "targets",
        serviceIds: [other.services.corte],
      }),
    ).toEqual({ ok: false, code: "invalid_target" });
    for (let n = 1; n <= 4; n++) {
      expect((await make(n, { appliesTo: "all" })).ok).toBe(true);
    }
    const fifth = await make(5, {
      appliesTo: "targets",
      serviceIds: [fresh.services.corte],
    });
    expect(fifth.ok).toBe(true);
    const sixth = await make(6, {
      appliesTo: "targets",
      serviceIds: [fresh.services.corte, fresh.services.barba],
    });
    expect(sixth).toMatchObject({
      ok: false,
      code: "too_many_questions",
      violations: { all: false, serviceIds: [fresh.services.corte] },
    });
    // Rullades tillbaka: frågan finns inte.
    const s = await loadBookingFormSettings(owner(), fresh.id);
    expect(s.questions.map((x) => x.label)).not.toContain("P6");
    expect(
      s.services.find((x) => x.id === fresh.services.corte)?.questionCount,
    ).toBe(5);

    // Inaktiv fråga kan skapas; att aktivera den spärras.
    const off = await createQuestion(owner(), fresh.id, {
      question: { label: "Off", kind: "yes_no" },
      targets: { appliesTo: "targets", serviceIds: [fresh.services.corte] },
      active: false,
    });
    expect(off.ok).toBe(true);
    if (!off.ok || !fifth.ok) return;
    expect(
      await setQuestionActive(owner(), fresh.id, off.id, true),
    ).toMatchObject({
      ok: false,
      code: "too_many_questions",
    });
    // Flytta den femte till barba → corte har 4, off kan aktiveras.
    expect(
      await setQuestionTargets(owner(), fresh.id, fifth.id, {
        appliesTo: "targets",
        serviceIds: [fresh.services.barba],
      }),
    ).toEqual({ ok: true });
    expect(await setQuestionActive(owner(), fresh.id, off.id, true)).toEqual({
      ok: true,
    });
  });

  it("förslag: aktiveras från presets, andra gången samma fråga", async () => {
    const b2 = await createTestBusiness();
    try {
      const input = { industry: "barberias", presetKey: "estilo_barba" };
      const a = await activatePreset(b2.ownerUserId, b2.id, input, {
        market: "CL",
      });
      expect(a.ok).toBe(true);
      if (!a.ok) return;
      expect(
        await setQuestionActive(b2.ownerUserId, b2.id, a.id, false),
      ).toEqual({
        ok: true,
      });
      const again = await activatePreset(b2.ownerUserId, b2.id, input, {
        market: "CL",
      });
      expect(again).toEqual({ ok: true, id: a.id });
      const qs = await getQuestionsForService(b2.id, b2.services.corte!);
      expect(qs).toMatchObject([{ id: a.id, kind: "single_choice" }]);
      expect(
        await activatePreset(b2.ownerUserId, b2.id, {
          industry: "barberias",
          presetKey: "nope",
        }),
      ).toEqual({ ok: false, code: "preset_not_found" });
    } finally {
      await dropTestBusiness(b2);
    }
  });

  it("redigering och borttagning: svaren finns kvar med kopian; tenant-avvisning", async () => {
    const q = await createQuestion(owner(), fresh.id, {
      question: {
        label: "Color",
        kind: "single_choice",
        options: ["Rojo", "Azul"],
      },
      targets: {
        appliesTo: "targets",
        serviceIds: [fresh.services.corte_barba],
      },
    });
    expect(q.ok).toBe(true);
    if (!q.ok) return;
    const r = await book(fresh, {
      serviceKey: "corte_barba",
      time: "10:00",
      answers: { [q.id]: "Azul" },
    });
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(
      await updateQuestion(other.ownerUserId, fresh.id, q.id, {
        label: "Hack",
        kind: "short_text",
      }),
    ).toEqual({ ok: false, code: "not_found" });
    expect(await deleteQuestion(other.ownerUserId, fresh.id, q.id)).toEqual({
      ok: false,
      code: "not_found",
    });
    expect(
      await updateQuestion(owner(), fresh.id, q.id, {
        label: "Tono",
        kind: "single_choice",
        options: [],
      }),
    ).toEqual({ ok: false, code: "question.options_required" });
    expect(await deleteQuestion(owner(), fresh.id, q.id)).toEqual({ ok: true });
    expect(await getBookingAnswers(owner(), fresh.id, r.value.id)).toEqual([
      {
        questionId: null,
        label: "Color",
        kind: "single_choice",
        value: "Azul",
      },
    ]);
  });
});
