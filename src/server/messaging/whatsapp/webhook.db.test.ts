import { randomBytes, randomUUID } from "node:crypto";

import {
  afterAll,
  afterEach,
  beforeAll,
  beforeEach,
  describe,
  expect,
  it,
  vi,
} from "vitest";

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

import { processWhatsAppWebhook } from "./webhook";

/**
 * D-063: WhatsApp-webhooken mot en riktig (lokal) databas — idempotens via
 * `inbound_events`, statusar mot utkorgen (delivered/failed → e-postreserv),
 * knappsvaren (Confirmo / Necesito cambiar / Sí, la quiero / No, gracias)
 * och att ingen kan svara åt någon annan. Väntelistans race: två "Sí" på
 * samma tid samtidigt → exakt en bokning, den andra får "ya fue tomada".
 *
 * Tiderna ligger i framtiden relativt den riktiga klockan (utkorgens
 * `now()` i databasen) och `NOW` injiceras i webhooken (motorns klocka).
 */

const at = (date: string, time: string) =>
  fromLocal(date as LocalDate, time as LocalTime, SANTIAGO).getTime();
const TUE = "2027-03-02";
const NOW = new Date(at("2027-02-25", "09:00"));
const START = at(TUE, "10:00");
const ALL_APPROVED =
  "reserva_confirmada,recordatorio_24h,reserva_cancelada,reserva_movida,lista_espera_oferta,lista_espera_tomada";

const createdBusinesses: TestBusiness[] = [];
const eventPrefix = `t${randomUUID().slice(0, 8)}`;

function wamid(label: string): string {
  return `wamid.${eventPrefix}.${label}.${randomUUID().slice(0, 8)}`;
}

function phone(): string {
  const n = Math.floor(10_000_000 + Math.random() * 89_999_999);
  return `+569${n}`;
}

async function business(
  opts: Parameters<typeof createTestBusiness>[0] = {},
  settings: { mode?: "sequential" | "broadcast" } = {},
): Promise<TestBusiness> {
  const biz = await createTestBusiness(opts);
  await adminQuery(
    `update public.businesses
        set plan = 'equipo', waitlist_mode = $2::public.waitlist_mode,
            auto_confirm_bookings = true
      where id = $1`,
    [biz.id, settings.mode ?? "broadcast"],
  );
  createdBusinesses.push(biz);
  return biz;
}

async function customer(
  biz: TestBusiness,
  opts: { email?: string | null; consent?: boolean } = {},
): Promise<{ id: string; phone: string }> {
  const p = phone();
  const r = await adminQuery<{ id: string }>(
    `insert into public.customers (business_id, phone_e164, name, email)
     values ($1, $2, 'Joaquín Pérez', $3) returning id`,
    [biz.id, p, opts.email === undefined ? "cliente@example.cl" : opts.email],
  );
  const id = r.rows[0]!.id;
  if (opts.consent !== false) {
    await adminQuery(
      `insert into public.consent_events
         (business_id, customer_id, subject, kind, version, channel, granted)
       values ($1, $2, 'customer', 'whatsapp', '2026-10', 'web', true)`,
      [biz.id, id],
    );
  }
  return { id, phone: p };
}

async function offeredEntry(
  biz: TestBusiness,
  customerId: string,
  status: "offered" | "waiting" = "offered",
  createdAt: Date = NOW,
): Promise<string> {
  const r = await adminQuery<{ id: string }>(
    `insert into public.waitlist_entries
       (business_id, customer_id, service_id, day, status, offered_at,
        offer_expires_at, offer_token_hash, created_at)
     values ($1, $2, $3, $4::date, $5::public.waitlist_status,
             case when $5 = 'offered' then $6::timestamptz end,
             case when $5 = 'offered' then $6::timestamptz + interval '15 minutes' end,
             case when $5 = 'offered' then $7::bytea end, $8)
     returning id`,
    [
      biz.id,
      customerId,
      biz.services.corte,
      TUE,
      status,
      NOW,
      randomBytes(32),
      createdAt,
    ],
  );
  return r.rows[0]!.id;
}

/** En utkorgsrad som redan skickats via WhatsApp (som workern lämnar den). */
async function sentWhatsAppRow(
  biz: TestBusiness,
  row: {
    template: string;
    bookingId?: string | null;
    entryId?: string | null;
    payload?: Record<string, unknown>;
    /** Starttiden i dedupe_key (som `enqueue.ts`); standard START. */
    startMs?: number;
  },
): Promise<{ id: string; wamid: string }> {
  const w = wamid(row.template);
  const r = await adminQuery<{ id: string }>(
    `insert into public.message_outbox
       (business_id, booking_id, waitlist_entry_id, channel, recipient_kind,
        template, payload, category, status, sent_at, attempts, dedupe_key,
        wa_message_id, provider_message_id)
     values ($1, $2, $3, 'whatsapp', 'customer', $4, $5::jsonb, 'utility',
             'sent', now(), 1, $6, $7, $7)
     returning id`,
    [
      biz.id,
      row.bookingId ?? null,
      row.entryId ?? null,
      row.template,
      JSON.stringify(row.payload ?? {}),
      `${row.template}:whatsapp:customer:${randomUUID()}:${Math.floor((row.startMs ?? START) / 1000)}`,
      w,
    ],
  );
  return { id: r.rows[0]!.id, wamid: w };
}

function buttonReply(input: {
  from: string;
  contextId: string;
  payload: string;
  id?: string;
}): unknown {
  return {
    object: "whatsapp_business_account",
    entry: [
      {
        id: "WABA",
        changes: [
          {
            field: "messages",
            value: {
              messaging_product: "whatsapp",
              metadata: { phone_number_id: "PNID" },
              contacts: [{ wa_id: input.from.replace(/^\+/, "") }],
              messages: [
                {
                  from: input.from.replace(/^\+/, ""),
                  id: input.id ?? wamid("in"),
                  timestamp: String(Math.floor(NOW.getTime() / 1000)),
                  type: "button",
                  context: { from: "56900000000", id: input.contextId },
                  button: { payload: input.payload, text: "x" },
                },
              ],
            },
          },
        ],
      },
    ],
  };
}

function statusEvent(input: {
  id: string;
  status: string;
  errorCode?: number;
}): unknown {
  return {
    object: "whatsapp_business_account",
    entry: [
      {
        changes: [
          {
            field: "messages",
            value: {
              metadata: { phone_number_id: "PNID" },
              statuses: [
                {
                  id: input.id,
                  status: input.status,
                  timestamp: String(Math.floor(Date.now() / 1000)),
                  recipient_id: "56912345678",
                  ...(input.errorCode
                    ? { errors: [{ code: input.errorCode, title: "x" }] }
                    : {}),
                },
              ],
            },
          },
        ],
      },
    ],
  };
}

const ENV = { WHATSAPP_PHONE_NUMBER_ID: "PNID" };
const si = (startMs: number, offeredMs: number) =>
  `si:${Math.floor(startMs / 1000)}:${Math.floor(offeredMs / 1000)}`;

async function outboxRows(biz: TestBusiness): Promise<
  {
    template: string;
    channel: string;
    status: string;
    recipient_kind: string;
    waitlist_entry_id: string | null;
    fallback_reason: string | null;
    payload: Record<string, unknown>;
    delivered_at: Date | null;
  }[]
> {
  const r = await adminQuery<{
    template: string;
    channel: string;
    status: string;
    recipient_kind: string;
    waitlist_entry_id: string | null;
    fallback_reason: string | null;
    payload: Record<string, unknown>;
    delivered_at: Date | null;
  }>(
    `select template, channel::text as channel, status::text as status,
            recipient_kind::text as recipient_kind, waitlist_entry_id,
            fallback_reason, payload, delivered_at
       from public.message_outbox where business_id = $1 order by created_at`,
    [biz.id],
  );
  return r.rows;
}

beforeAll(() => {
  assertLocalDatabase();
});

beforeEach(() => {
  vi.stubEnv("WHATSAPP_FAKE", "1");
  vi.stubEnv("WHATSAPP_ACCESS_TOKEN", "");
  vi.stubEnv("WHATSAPP_PHONE_NUMBER_ID", "");
  vi.stubEnv("VERCEL_ENV", "");
  vi.stubEnv("WHATSAPP_TEMPLATES_APPROVED", ALL_APPROVED);
});

afterEach(() => {
  vi.unstubAllEnvs();
});

afterAll(async () => {
  for (const b of createdBusinesses) await dropTestBusiness(b);
  await adminQuery(
    `delete from public.inbound_events
      where provider = 'whatsapp' and event_id like $1`,
    [`%${eventPrefix}%`],
  );
  await closePool();
});

describe("idempotens (inbound_events)", () => {
  it("samma händelse två gånger hanteras en gång", async () => {
    const biz = await business();
    const c = await customer(biz);
    const bookingId = await insertTestBooking(biz, {
      start: START,
      durationMin: 35,
      customerId: c.id,
    });
    const row = await sentWhatsAppRow(biz, {
      template: "recordatorio",
      bookingId,
    });
    const body = buttonReply({
      from: c.phone,
      contextId: row.wamid,
      payload: "cambiar",
      id: wamid("dup"),
    });
    const first = await processWhatsAppWebhook(body, NOW, ENV);
    const second = await processWhatsAppWebhook(body, NOW, ENV);
    expect(first).toMatchObject({ handled: 1, duplicates: 0, queued: true });
    expect(second).toMatchObject({ handled: 0, duplicates: 1, queued: false });
    const owner = (await outboxRows(biz)).filter(
      (r) => r.template === "clienteQuiereCambiar",
    );
    expect(owner).toHaveLength(1);
    // inbound_events bär bara typen — aldrig telefon eller text.
    const ev = await adminQuery<{ payload: unknown }>(
      `select payload from public.inbound_events
        where provider = 'whatsapp' and event_id like $1`,
      [`%${eventPrefix}.dup%`],
    );
    expect(ev.rows).toHaveLength(1);
    expect(JSON.stringify(ev.rows[0]!.payload)).not.toContain(c.phone.slice(1));
  });

  it("ett annat phone_number_id (inte vårt nummer) ignoreras", async () => {
    const r = await processWhatsAppWebhook(
      {
        entry: [
          {
            changes: [
              {
                field: "messages",
                value: { metadata: { phone_number_id: "ANNAT" }, statuses: [] },
              },
            ],
          },
        ],
      },
      NOW,
      ENV,
    );
    expect(r).toMatchObject({ handled: 0, ignored: 1 });
  });
});

describe("knappsvar på recordatorio_24h", () => {
  it("Confirmo → confirmed_by_customer_at; fel avsändare gör ingenting", async () => {
    const biz = await business();
    const c = await customer(biz);
    const other = await customer(biz);
    const bookingId = await insertTestBooking(biz, {
      start: START,
      durationMin: 35,
      customerId: c.id,
    });
    const row = await sentWhatsAppRow(biz, {
      template: "recordatorio",
      bookingId,
    });
    const confirmedAt = async () =>
      (
        await adminQuery<{ v: Date | null }>(
          `select confirmed_by_customer_at as v from public.bookings
            where business_id = $1 and id = $2`,
          [biz.id, bookingId],
        )
      ).rows[0]!.v;

    // Någon annan (annat nummer) svarar på kundens meddelande → inget.
    await processWhatsAppWebhook(
      buttonReply({
        from: other.phone,
        contextId: row.wamid,
        payload: "confirmo",
      }),
      NOW,
      ENV,
    );
    expect(await confirmedAt()).toBeNull();

    // Okänt context.id (inte vårt meddelande) → inget.
    await processWhatsAppWebhook(
      buttonReply({
        from: c.phone,
        contextId: "wamid.okant",
        payload: "confirmo",
      }),
      NOW,
      ENV,
    );
    expect(await confirmedAt()).toBeNull();

    await processWhatsAppWebhook(
      buttonReply({ from: c.phone, contextId: row.wamid, payload: "confirmo" }),
      NOW,
      ENV,
    );
    expect((await confirmedAt())?.getTime()).toBe(NOW.getTime());
    // Inget automatiskt mallmeddelande som svar.
    expect(
      (await outboxRows(biz)).filter((r) => r.template !== "recordatorio"),
    ).toEqual([]);
  });

  it("Confirmo på en påminnelse om en tid som sedan flyttats → bekräftar inte den nya tiden", async () => {
    const biz = await business();
    const c = await customer(biz);
    const bookingId = await insertTestBooking(biz, {
      start: START,
      durationMin: 35,
      customerId: c.id,
    });
    // Påminnelsen gällde 09:00 samma dag (bokningen är nu 10:00).
    const row = await sentWhatsAppRow(biz, {
      template: "recordatorio",
      bookingId,
      startMs: START - 3_600_000,
    });
    await processWhatsAppWebhook(
      buttonReply({ from: c.phone, contextId: row.wamid, payload: "confirmo" }),
      NOW,
      ENV,
    );
    const r = await adminQuery<{ v: Date | null }>(
      `select confirmed_by_customer_at as v from public.bookings
        where business_id = $1 and id = $2`,
      [biz.id, bookingId],
    );
    expect(r.rows[0]!.v).toBeNull();
  });

  it("Necesito cambiar → ägaren får e-post (en per påminnelse), kunden inget", async () => {
    const biz = await business();
    const c = await customer(biz);
    const bookingId = await insertTestBooking(biz, {
      start: START,
      durationMin: 35,
      customerId: c.id,
    });
    const row = await sentWhatsAppRow(biz, {
      template: "recordatorio",
      bookingId,
    });
    for (let i = 0; i < 2; i++) {
      await processWhatsAppWebhook(
        buttonReply({
          from: c.phone,
          contextId: row.wamid,
          payload: "cambiar",
        }),
        NOW,
        ENV,
      );
    }
    const rows = await outboxRows(biz);
    const owner = rows.filter((r) => r.template === "clienteQuiereCambiar");
    expect(owner).toHaveLength(1);
    expect(owner[0]).toMatchObject({
      channel: "email",
      recipient_kind: "owner",
      status: "queued",
    });
    expect(rows.filter((r) => r.recipient_kind === "customer")).toHaveLength(1);
  });

  it("en payload för väntelistan på en påminnelse gör ingenting", async () => {
    const biz = await business();
    const c = await customer(biz);
    const bookingId = await insertTestBooking(biz, {
      start: START,
      durationMin: 35,
      customerId: c.id,
    });
    const row = await sentWhatsAppRow(biz, {
      template: "recordatorio",
      bookingId,
    });
    const r = await processWhatsAppWebhook(
      buttonReply({
        from: c.phone,
        contextId: row.wamid,
        payload: si(START, NOW.getTime()),
      }),
      NOW,
      ENV,
    );
    expect(r.queued).toBe(false);
    const n = await adminQuery<{ n: number }>(
      `select count(*)::int as n from public.bookings where business_id = $1`,
      [biz.id],
    );
    expect(n.rows[0]!.n).toBe(1);
  });
});

describe("knappsvar på lista_espera_oferta", () => {
  it("race: två 'Sí' på samma tid samtidigt → exakt en bokning, den andra får lista_espera_tomada", async () => {
    // En enda möjlig tid: tisdag 10:00–10:35, en profesional, 35 min.
    const biz = await business(
      {
        hours: [{ weekday: 2, start: "10:00", end: "10:35" }],
        staff: [{ key: "diego" }],
      },
      { mode: "broadcast" },
    );
    const a = await customer(biz);
    const b = await customer(biz);
    const entryA = await offeredEntry(biz, a.id);
    const entryB = await offeredEntry(biz, b.id);
    const rowA = await sentWhatsAppRow(biz, {
      template: "listaEsperaCupo",
      entryId: entryA,
    });
    const rowB = await sentWhatsAppRow(biz, {
      template: "listaEsperaCupo",
      entryId: entryB,
    });
    const payload = si(START, NOW.getTime());

    const results = await Promise.all([
      processWhatsAppWebhook(
        buttonReply({ from: a.phone, contextId: rowA.wamid, payload }),
        NOW,
        ENV,
      ),
      processWhatsAppWebhook(
        buttonReply({ from: b.phone, contextId: rowB.wamid, payload }),
        NOW,
        ENV,
      ),
    ]);
    expect(results.every((r) => r.handled === 1)).toBe(true);

    const bookings = await adminQuery<{
      waitlist_entry_id: string;
      source: string;
    }>(
      `select waitlist_entry_id, source::text as source from public.bookings
        where business_id = $1 and status <> 'cancelled'`,
      [biz.id],
    );
    expect(bookings.rows).toHaveLength(1);
    expect(bookings.rows[0]!.source).toBe("waitlist");
    const winner = bookings.rows[0]!.waitlist_entry_id;
    expect([entryA, entryB]).toContain(winner);
    const loser = winner === entryA ? entryB : entryA;

    const entries = await adminQuery<{ id: string; status: string }>(
      `select id, status::text as status from public.waitlist_entries
        where business_id = $1`,
      [biz.id],
    );
    const status = Object.fromEntries(
      entries.rows.map((e) => [e.id, e.status]),
    );
    expect(status[winner]).toBe("booked");
    expect(status[loser]).toBe("expired");

    const rows = await outboxRows(biz);
    const tomada = rows.filter((r) => r.template === "listaEsperaTomada");
    expect(tomada).toHaveLength(1);
    expect(tomada[0]!.waitlist_entry_id).toBe(loser);
    // Förloraren har samtyckt → "ya fue tomada" på WhatsApp.
    expect(tomada[0]!.channel).toBe("whatsapp");
    // Vinnaren får sin bekräftelse via bokningsmotorn.
    expect(rows.some((r) => r.template === "reservaConfirmada")).toBe(true);

    // Ett nytt "Sí" från vinnaren (dubbeltryck) ger ingen ny bokning.
    await processWhatsAppWebhook(
      buttonReply({
        from: winner === entryA ? a.phone : b.phone,
        contextId: winner === entryA ? rowA.wamid : rowB.wamid,
        payload,
      }),
      NOW,
      ENV,
    );
    const again = await adminQuery<{ n: number }>(
      `select count(*)::int as n from public.bookings where business_id = $1`,
      [biz.id],
    );
    expect(again.rows[0]!.n).toBe(1);
  });

  it("'Sí' från fel nummer eller på ett äldre erbjudande tar ingen tid", async () => {
    const biz = await business({ staff: [{ key: "diego" }] });
    const a = await customer(biz);
    const intruder = await customer(biz);
    const entry = await offeredEntry(biz, a.id);
    const row = await sentWhatsAppRow(biz, {
      template: "listaEsperaCupo",
      entryId: entry,
    });
    // Fel avsändare.
    await processWhatsAppWebhook(
      buttonReply({
        from: intruder.phone,
        contextId: row.wamid,
        payload: si(START, NOW.getTime()),
      }),
      NOW,
      ENV,
    );
    // Rätt avsändare men ett annat (äldre) erbjudande.
    await processWhatsAppWebhook(
      buttonReply({
        from: a.phone,
        contextId: row.wamid,
        payload: si(START, NOW.getTime() - 3_600_000),
      }),
      NOW,
      ENV,
    );
    const n = await adminQuery<{ n: number }>(
      `select count(*)::int as n from public.bookings where business_id = $1`,
      [biz.id],
    );
    expect(n.rows[0]!.n).toBe(0);
    const e = await adminQuery<{ status: string }>(
      `select status::text as status from public.waitlist_entries
        where business_id = $1 and id = $2`,
      [biz.id, entry],
    );
    expect(e.rows[0]!.status).toBe("offered");
  });

  it("'No, gracias' (sekventiellt) → posten släpps och nästa i kön erbjuds", async () => {
    const biz = await business(
      { staff: [{ key: "diego" }] },
      { mode: "sequential" },
    );
    const a = await customer(biz);
    const next = await customer(biz);
    const entryA = await offeredEntry(biz, a.id);
    const entryNext = await offeredEntry(
      biz,
      next.id,
      "waiting",
      new Date(NOW.getTime() + 1000),
    );
    const row = await sentWhatsAppRow(biz, {
      template: "listaEsperaCupo",
      entryId: entryA,
    });
    const r = await processWhatsAppWebhook(
      buttonReply({
        from: a.phone,
        contextId: row.wamid,
        payload: `no:${Math.floor(NOW.getTime() / 1000)}`,
      }),
      NOW,
      ENV,
    );
    expect(r.queued).toBe(true);
    const entries = await adminQuery<{ id: string; status: string }>(
      `select id, status::text as status from public.waitlist_entries
        where business_id = $1`,
      [biz.id],
    );
    const status = Object.fromEntries(
      entries.rows.map((e) => [e.id, e.status]),
    );
    expect(status[entryA]).toBe("expired");
    expect(status[entryNext]).toBe("offered");
    const cupo = (await outboxRows(biz)).filter(
      (x) =>
        x.template === "listaEsperaCupo" && x.waitlist_entry_id === entryNext,
    );
    expect(cupo).toHaveLength(1);
  });
});

describe("statusar mot utkorgen", () => {
  it("delivered → delivered_at och payload (token) tömd", async () => {
    const biz = await business();
    const c = await customer(biz);
    const bookingId = await insertTestBooking(biz, {
      start: START,
      durationMin: 35,
      customerId: c.id,
    });
    const row = await sentWhatsAppRow(biz, {
      template: "reservaConfirmada",
      bookingId,
      payload: { token: "T".repeat(43) },
    });
    await processWhatsAppWebhook(
      statusEvent({ id: row.wamid, status: "delivered" }),
      NOW,
      ENV,
    );
    const [r] = await outboxRows(biz);
    expect(r!.delivered_at).not.toBeNull();
    expect(r!.payload).toEqual({});
    expect(r!.status).toBe("sent");
  });

  it("failed (permanent, 131026) → samma rad blir e-post (reserv), token kvar", async () => {
    const biz = await business();
    const c = await customer(biz);
    const bookingId = await insertTestBooking(biz, {
      start: START,
      durationMin: 35,
      customerId: c.id,
    });
    const row = await sentWhatsAppRow(biz, {
      template: "reservaConfirmada",
      bookingId,
      payload: { token: "T".repeat(43) },
    });
    const res = await processWhatsAppWebhook(
      statusEvent({ id: row.wamid, status: "failed", errorCode: 131026 }),
      NOW,
      ENV,
    );
    expect(res.queued).toBe(true);
    const [r] = await outboxRows(biz);
    expect(r).toMatchObject({
      channel: "email",
      status: "queued",
      fallback_reason: "wa_131026",
      payload: { token: "T".repeat(43) },
    });
  });

  it("failed för en kund utan e-post → dead", async () => {
    const biz = await business();
    const c = await customer(biz, { email: null });
    const bookingId = await insertTestBooking(biz, {
      start: START,
      durationMin: 35,
      customerId: c.id,
    });
    const row = await sentWhatsAppRow(biz, {
      template: "recordatorio",
      bookingId,
      payload: { token: "T".repeat(43) },
    });
    await processWhatsAppWebhook(
      statusEvent({ id: row.wamid, status: "failed", errorCode: 131026 }),
      NOW,
      ENV,
    );
    const [r] = await outboxRows(biz);
    expect(r).toMatchObject({ status: "dead", payload: {} });
  });

  it("failed efter delivered ignoreras (ordningen är inte garanterad)", async () => {
    const biz = await business();
    const c = await customer(biz);
    const bookingId = await insertTestBooking(biz, {
      start: START,
      durationMin: 35,
      customerId: c.id,
    });
    const row = await sentWhatsAppRow(biz, {
      template: "recordatorio",
      bookingId,
    });
    await processWhatsAppWebhook(
      statusEvent({ id: row.wamid, status: "read" }),
      NOW,
      ENV,
    );
    await processWhatsAppWebhook(
      statusEvent({ id: row.wamid, status: "failed", errorCode: 131026 }),
      NOW,
      ENV,
    );
    const [r] = await outboxRows(biz);
    expect(r).toMatchObject({ channel: "whatsapp", status: "sent" });
  });
});
