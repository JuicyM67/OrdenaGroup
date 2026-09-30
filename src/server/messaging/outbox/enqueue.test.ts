import { afterEach, describe, expect, it, vi } from "vitest";

import type { Queryable } from "@/server/db/pool";

import { customerChannelsFor, enqueueBookingEventIn } from "./enqueue";

/**
 * WP-16 steg 2: kanalplan CL/SE (med/utan e-post), och att
 * `enqueueBookingEventIn` köar rätt mallar/kanaler för varje händelse, utan
 * en riktig databas (fejkad `Queryable`, samma mönster som `Queryable` i
 * `src/server/db/pool.ts`).
 */

type Call = { text: string; values: readonly unknown[] };

type InsertedRow = {
  businessId: string;
  bookingId: string;
  channel: string;
  recipientKind: string;
  template: string;
  category: string;
  payload: Record<string, unknown>;
  dedupeKey: string;
  nextAttemptAt: Date | null;
};

class FakeDb implements Queryable {
  readonly calls: Call[] = [];
  constructor(
    private readonly context:
      { start_ms: number; has_email: boolean } | undefined,
  ) {}

  async query<R extends object = Record<string, unknown>>(
    text: string,
    values: readonly unknown[] = [],
  ) {
    this.calls.push({ text, values });
    if (/from public\.bookings bk\s+join public\.customers/.test(text)) {
      const rows = this.context ? [this.context] : [];
      return { rows: rows as R[], rowCount: rows.length };
    }
    return { rows: [] as R[], rowCount: 0 };
  }

  /** Alla `insert into message_outbox`-anrop, uppackade till läsbar form. */
  inserted(): InsertedRow[] {
    return this.calls
      .filter((c) => /insert into public\.message_outbox/.test(c.text))
      .map((c) => ({
        businessId: c.values[0] as string,
        bookingId: c.values[1] as string,
        channel: c.values[2] as string,
        recipientKind: c.values[3] as string,
        template: c.values[4] as string,
        payload: JSON.parse(c.values[5] as string) as Record<string, unknown>,
        dedupeKey: c.values[6] as string,
        nextAttemptAt: c.values[7] as Date | null,
        category: "utility",
      }));
  }

  /** `update ... set status = 'cancelled' ... template = 'recordatorio'`-anrop. */
  reminderCancellations(): Call[] {
    return this.calls.filter(
      (c) =>
        /update public\.message_outbox/.test(c.text) &&
        /template = 'recordatorio'/.test(c.text),
    );
  }
}

const BIZ = "b0000000-0000-4000-8000-000000000001";
const BOOKING = "b0000000-0000-4000-8000-0000000000aa";
const TOKEN = "A".repeat(43);
// `enqueueBookingEventIn` jämför mot den verkliga klockan (Date.now(), inte
// injicerad — den här filen ligger utanför scheduling/bookings, se
// boundaries.test.ts), så testtiderna räknas relativt riktig "nu".
const NOW = Date.now();
const FAR_START = NOW + 3 * 24 * 60 * 60 * 1000; // 3 dagar bort: får en påminnelse
const SOON_START = NOW + 60 * 60 * 1000; // 1 h bort: ingen påminnelse (redan för sent)

describe("customerChannelsFor (kanalplan CL/SE)", () => {
  it("CL: e-post om kunden har en, annars ingen kanal", () => {
    expect(customerChannelsFor("CL", true)).toEqual(["email"]);
    expect(customerChannelsFor("CL", false)).toEqual([]);
  });

  it("SE: sms alltid, e-post också om kunden har en", () => {
    expect(customerChannelsFor("SE", true)).toEqual(["email", "sms"]);
    expect(customerChannelsFor("SE", false)).toEqual(["sms"]);
  });
});

describe("enqueueBookingEventIn: created", () => {
  it("kund: reservaConfirmada (e-post) + recordatorio, inget ägarmejl", async () => {
    const db = new FakeDb({ start_ms: FAR_START, has_email: true });
    await enqueueBookingEventIn(db, {
      type: "created",
      bookingId: BOOKING,
      businessId: BIZ,
      token: TOKEN,
      by: "customer",
      status: "confirmed",
    });
    const rows = db.inserted();
    const templates = rows.map((r) => `${r.template}:${r.recipientKind}`);
    expect(templates).toEqual(
      expect.arrayContaining([
        "reservaConfirmada:customer",
        "recordatorio:customer",
      ]),
    );
    // Ingen ägarrad när `by` inte är satt av kund? Nej — created av kunden
    // KÖAR ägarmejlet (testas separat nedan). Här kollar vi bara att
    // token hamnar i payload för båda kundraderna.
    for (const r of rows.filter((x) => x.recipientKind === "customer")) {
      expect(r.payload).toEqual({ token: TOKEN });
      expect(r.channel).toBe("email");
    }
  });

  it("by=customer: köar också nuevaReservaDueno (e-post, ingen token)", async () => {
    const db = new FakeDb({ start_ms: FAR_START, has_email: true });
    await enqueueBookingEventIn(db, {
      type: "created",
      bookingId: BOOKING,
      businessId: BIZ,
      token: TOKEN,
      by: "customer",
      status: "confirmed",
    });
    const owner = db
      .inserted()
      .find(
        (r) =>
          r.recipientKind === "owner" && r.template === "nuevaReservaDueno",
      );
    expect(owner).toBeDefined();
    expect(owner?.channel).toBe("email");
    expect(owner?.payload).toEqual({});
  });

  it("by=owner: inget ägarmejl (ägaren skapade själv bokningen)", async () => {
    const db = new FakeDb({ start_ms: FAR_START, has_email: true });
    await enqueueBookingEventIn(db, {
      type: "created",
      bookingId: BOOKING,
      businessId: BIZ,
      token: TOKEN,
      by: "owner",
      status: "confirmed",
    });
    expect(db.inserted().some((r) => r.recipientKind === "owner")).toBe(false);
  });

  it("ingen e-post hos kunden (CL): ingen rad alls för reservaConfirmada/recordatorio", async () => {
    const db = new FakeDb({ start_ms: FAR_START, has_email: false });
    await enqueueBookingEventIn(db, {
      type: "created",
      bookingId: BOOKING,
      businessId: BIZ,
      token: TOKEN,
      by: "owner",
      status: "confirmed",
    });
    expect(db.inserted()).toEqual([]);
  });

  it("start < 24 h bort: ingen recordatorio-rad köas", async () => {
    const db = new FakeDb({ start_ms: SOON_START, has_email: true });
    await enqueueBookingEventIn(db, {
      type: "created",
      bookingId: BOOKING,
      businessId: BIZ,
      token: TOKEN,
      by: "owner",
      status: "confirmed",
    });
    expect(db.inserted().some((r) => r.template === "recordatorio")).toBe(
      false,
    );
    expect(db.inserted().some((r) => r.template === "reservaConfirmada")).toBe(
      true,
    );
  });

  it("recordatorio: next_attempt_at = start − 24 h", async () => {
    const db = new FakeDb({ start_ms: FAR_START, has_email: true });
    await enqueueBookingEventIn(db, {
      type: "created",
      bookingId: BOOKING,
      businessId: BIZ,
      token: TOKEN,
      by: "owner",
      status: "confirmed",
    });
    const reminder = db.inserted().find((r) => r.template === "recordatorio");
    expect(reminder?.nextAttemptAt?.getTime()).toBe(
      FAR_START - 24 * 60 * 60 * 1000,
    );
  });

  it("bokningen syns inte (t.ex. borttagen mellan commit och anrop): köar inget, kastar inte", async () => {
    const db = new FakeDb(undefined);
    await expect(
      enqueueBookingEventIn(db, {
        type: "created",
        bookingId: BOOKING,
        businessId: BIZ,
        token: TOKEN,
        by: "owner",
        status: "confirmed",
      }),
    ).resolves.toBeUndefined();
    expect(db.inserted()).toEqual([]);
  });

  it("dedupe_key: <mall>:<kanal>:<mottagare>:<booking_id>:<start-epoch-sekunder>", async () => {
    const db = new FakeDb({ start_ms: FAR_START, has_email: true });
    await enqueueBookingEventIn(db, {
      type: "created",
      bookingId: BOOKING,
      businessId: BIZ,
      token: TOKEN,
      by: "owner",
      status: "confirmed",
    });
    const confirmada = db
      .inserted()
      .find((r) => r.template === "reservaConfirmada");
    expect(confirmada?.dedupeKey).toBe(
      `reservaConfirmada:email:customer:${BOOKING}:${Math.floor(FAR_START / 1000)}`,
    );
  });
});

describe("enqueueBookingEventIn: moved", () => {
  it("avbryter väntande recordatorio och köar reservaMovida + ny recordatorio (ny token)", async () => {
    const db = new FakeDb({ start_ms: FAR_START, has_email: true });
    const NEW_TOKEN = "B".repeat(43);
    await enqueueBookingEventIn(db, {
      type: "moved",
      bookingId: BOOKING,
      businessId: BIZ,
      token: NEW_TOKEN,
      by: "customer",
      status: "confirmed",
    });
    expect(db.reminderCancellations()).toHaveLength(1);
    const rows = db.inserted();
    const movida = rows.find((r) => r.template === "reservaMovida");
    expect(movida?.payload).toEqual({ token: NEW_TOKEN });
    const reminder = rows.find((r) => r.template === "recordatorio");
    expect(reminder?.payload).toEqual({ token: NEW_TOKEN });
  });

  it("ingen ägarrad vid moved (utanför scope)", async () => {
    const db = new FakeDb({ start_ms: FAR_START, has_email: true });
    await enqueueBookingEventIn(db, {
      type: "moved",
      bookingId: BOOKING,
      businessId: BIZ,
      token: TOKEN,
      by: "customer",
      status: "confirmed",
    });
    expect(db.inserted().some((r) => r.recipientKind === "owner")).toBe(false);
  });

  it("status requested (kundens flytt av en obekräftad förfrågan): reservaMovida men ingen recordatorio", async () => {
    const db = new FakeDb({ start_ms: FAR_START, has_email: true });
    await enqueueBookingEventIn(db, {
      type: "moved",
      bookingId: BOOKING,
      businessId: BIZ,
      token: TOKEN,
      by: "customer",
      status: "requested",
    });
    expect(db.inserted().some((r) => r.template === "reservaMovida")).toBe(
      true,
    );
    expect(db.inserted().some((r) => r.template === "recordatorio")).toBe(
      false,
    );
  });
});

describe("enqueueBookingEventIn: created (status requested — WP-45/D-033)", () => {
  it("kund: solicitudRecibida (bara e-post, ingen recordatorio), ägaren: nuevaSolicitud", async () => {
    const db = new FakeDb({ start_ms: FAR_START, has_email: true });
    await enqueueBookingEventIn(db, {
      type: "created",
      bookingId: BOOKING,
      businessId: BIZ,
      token: TOKEN,
      by: "customer",
      status: "requested",
    });
    const rows = db.inserted();
    const customerRow = rows.find((r) => r.recipientKind === "customer");
    expect(customerRow?.template).toBe("solicitudRecibida");
    expect(customerRow?.channel).toBe("email");
    expect(customerRow?.payload).toEqual({ token: TOKEN });
    expect(rows.some((r) => r.template === "reservaConfirmada")).toBe(false);
    expect(rows.some((r) => r.template === "recordatorio")).toBe(false);
    const owner = rows.find((r) => r.recipientKind === "owner");
    expect(owner?.template).toBe("nuevaSolicitud");
    expect(owner?.channel).toBe("email");
  });

  it("bara EN kundrad (aldrig sms, oavsett marknad — till skillnad från customerChannels)", async () => {
    const db = new FakeDb({ start_ms: FAR_START, has_email: true });
    await enqueueBookingEventIn(db, {
      type: "created",
      bookingId: BOOKING,
      businessId: BIZ,
      token: TOKEN,
      by: "customer",
      status: "requested",
    });
    expect(
      db.inserted().filter((r) => r.recipientKind === "customer"),
    ).toHaveLength(1);
  });

  it("ingen e-post hos kunden: ingen solicitudRecibida-rad, men ägaren får ändå nuevaSolicitud", async () => {
    const db = new FakeDb({ start_ms: FAR_START, has_email: false });
    await enqueueBookingEventIn(db, {
      type: "created",
      bookingId: BOOKING,
      businessId: BIZ,
      token: TOKEN,
      by: "customer",
      status: "requested",
    });
    const rows = db.inserted();
    expect(rows.some((r) => r.recipientKind === "customer")).toBe(false);
    expect(
      rows.some(
        (r) => r.recipientKind === "owner" && r.template === "nuevaSolicitud",
      ),
    ).toBe(true);
  });
});

describe("enqueueBookingEventIn: confirmed (ägaren bekräftar en förfrågan)", () => {
  it("reservaConfirmada + recordatorio, inget ägarmejl", async () => {
    const db = new FakeDb({ start_ms: FAR_START, has_email: true });
    await enqueueBookingEventIn(db, {
      type: "confirmed",
      bookingId: BOOKING,
      businessId: BIZ,
      token: TOKEN,
      by: "owner",
    });
    const rows = db.inserted();
    expect(rows.some((r) => r.template === "reservaConfirmada")).toBe(true);
    expect(rows.some((r) => r.template === "recordatorio")).toBe(true);
    expect(rows.some((r) => r.recipientKind === "owner")).toBe(false);
  });

  it("start < 24 h bort: ingen recordatorio-rad", async () => {
    const db = new FakeDb({ start_ms: SOON_START, has_email: true });
    await enqueueBookingEventIn(db, {
      type: "confirmed",
      bookingId: BOOKING,
      businessId: BIZ,
      token: TOKEN,
      by: "owner",
    });
    expect(db.inserted().some((r) => r.template === "recordatorio")).toBe(
      false,
    );
  });
});

describe("enqueueBookingEventIn: declined", () => {
  it("reason declined: solicitudRechazada (SE e-post+sms, CL e-post)", async () => {
    const db = new FakeDb({ start_ms: FAR_START, has_email: true });
    await enqueueBookingEventIn(db, {
      type: "declined",
      bookingId: BOOKING,
      businessId: BIZ,
      reason: "declined",
    });
    const rows = db.inserted();
    expect(rows.every((r) => r.template === "solicitudRechazada")).toBe(true);
    expect(rows.some((r) => r.template === "reservaCancelada")).toBe(false);
    for (const r of rows) expect(r.payload).toEqual({});
  });

  // WP-45: `e.message` (ägarens valfria motiv, bara vid `reason: "declined"`)
  // → `payload.motivo` bara på e-postraden, aldrig sms. SE (dynamiskt
  // ominporterad med NEXT_PUBLIC_MARKET=SE, samma mönster som
  // `src/config/market.test.ts`) ger båda kanalerna i samma anrop, så ett
  // enda test räcker för att bevisa båda delarna.
  afterEach(() => {
    vi.unstubAllEnvs();
    vi.resetModules();
  });

  it("motivo: bara på e-postraden, aldrig sms — och inte alls utan motiv", async () => {
    vi.stubEnv("NEXT_PUBLIC_MARKET", "SE");
    vi.resetModules();
    const { enqueueBookingEventIn: enqueueSE } = await import("./enqueue");

    const withMotivo = new FakeDb({ start_ms: FAR_START, has_email: true });
    await enqueueSE(withMotivo, {
      type: "declined",
      bookingId: BOOKING,
      businessId: BIZ,
      reason: "declined",
      message: "No tenemos hora ese día.",
    });
    const rows = withMotivo.inserted();
    expect(rows).toHaveLength(2);
    const emailRow = rows.find((r) => r.channel === "email");
    const smsRow = rows.find((r) => r.channel === "sms");
    expect(emailRow?.payload).toEqual({ motivo: "No tenemos hora ese día." });
    expect(smsRow?.payload).toEqual({});

    const withoutMotivo = new FakeDb({ start_ms: FAR_START, has_email: true });
    await enqueueSE(withoutMotivo, {
      type: "declined",
      bookingId: BOOKING,
      businessId: BIZ,
      reason: "declined",
    });
    for (const r of withoutMotivo.inserted()) expect(r.payload).toEqual({});
  });

  it("reason expired: solicitudVencida", async () => {
    const db = new FakeDb({ start_ms: FAR_START, has_email: true });
    await enqueueBookingEventIn(db, {
      type: "declined",
      bookingId: BOOKING,
      businessId: BIZ,
      reason: "expired",
    });
    expect(db.inserted().every((r) => r.template === "solicitudVencida")).toBe(
      true,
    );
  });

  it("ingen ägarrad (nekad/utgången förfrågan skickar inget till ägaren)", async () => {
    const db = new FakeDb({ start_ms: FAR_START, has_email: true });
    await enqueueBookingEventIn(db, {
      type: "declined",
      bookingId: BOOKING,
      businessId: BIZ,
      reason: "declined",
    });
    expect(db.inserted().some((r) => r.recipientKind === "owner")).toBe(false);
  });
});

describe("enqueueBookingEventIn: cancelled", () => {
  it("avbryter väntande recordatorio och köar reservaCancelada (utan token)", async () => {
    const db = new FakeDb({ start_ms: FAR_START, has_email: true });
    await enqueueBookingEventIn(db, {
      type: "cancelled",
      bookingId: BOOKING,
      businessId: BIZ,
      by: "owner",
    });
    expect(db.reminderCancellations()).toHaveLength(1);
    const cancelada = db
      .inserted()
      .find((r) => r.template === "reservaCancelada");
    expect(cancelada?.payload).toEqual({});
  });

  it("by=customer: köar också cancelacionDueno", async () => {
    const db = new FakeDb({ start_ms: FAR_START, has_email: true });
    await enqueueBookingEventIn(db, {
      type: "cancelled",
      bookingId: BOOKING,
      businessId: BIZ,
      by: "customer",
    });
    expect(
      db
        .inserted()
        .some(
          (r) =>
            r.template === "cancelacionDueno" && r.recipientKind === "owner",
        ),
    ).toBe(true);
  });

  it("by=owner: inget cancelacionDueno-mejl", async () => {
    const db = new FakeDb({ start_ms: FAR_START, has_email: true });
    await enqueueBookingEventIn(db, {
      type: "cancelled",
      bookingId: BOOKING,
      businessId: BIZ,
      by: "owner",
    });
    expect(db.inserted().some((r) => r.recipientKind === "owner")).toBe(false);
  });
});
