import { describe, expect, it, vi } from "vitest";

import { ok } from "@/server/scheduling/result";

import { hashManageToken } from "./token";

/**
 * D-029: `moveIn` roterar kundens token. Motorns steg före update mockas
 * (tillgängligheten testas i move.db.test.ts); här testas bara att updaten
 * skriver hashen av den nya token som returneras, och att den skiljer sig
 * från den gamla. Gammal token → not_found testas mot databasen i
 * token.db.test.ts.
 */
const OLD_TOKEN = "o".repeat(43);
const BIZ = "b0000000-0000-4000-8000-000000000001";
const BOOKING = "b0000000-0000-4000-8000-0000000000aa";
const STAFF = "b0000000-0000-4000-8000-0000000000cc";
const START = Date.UTC(2026, 9, 6, 13);
const MIN = 60_000;

vi.mock("@/server/messaging/outbox", () => ({
  enqueueBookingEvent: vi.fn(async () => {}),
  kickOutbox: vi.fn(async () => {}),
}));
vi.mock("./row", () => ({
  CHANGEABLE: ["confirmed", "pending_payment"],
  insideCancelWindow: () => true,
  lockBooking: async () => ({
    id: BOOKING,
    staffId: STAFF,
    serviceId: "s",
    status: "confirmed",
    start: START,
    periodEnd: START + 35 * MIN,
    blockedEnd: START + 45 * MIN,
    priceClp: 12000,
    cancelWindowHours: 3,
    businessActive: true,
  }),
}));
vi.mock("@/server/scheduling/load", () => ({
  loadSnapshot: async () => ({ ok: true, value: { snapshot: {} } }),
}));
vi.mock("@/server/scheduling/availability", () => ({
  staffOffersService: () => true,
}));
vi.mock("@/server/scheduling/core/validate", () => ({
  checkStart: () => ({ ok: true, value: [STAFF] }),
}));
vi.mock("@/server/db/locks", () => ({ lockStaffForBooking: async () => {} }));
vi.mock("@/server/db/tx", () => ({
  savepoint: async <T>(_q: unknown, fn: () => Promise<T>) => fn(),
}));

const { moveIn } = await import("./move");

describe("moveIn roterar token (D-029)", () => {
  it("updaten sätter hashen av den nya token; ny ≠ gammal", async () => {
    const updates: unknown[][] = [];
    const q = {
      query: async (text: string, values: unknown[] = []) => {
        if (/update public\.bookings/.test(text)) {
          expect(text).toMatch(/manage_token_hash = \$6/);
          updates.push(values);
        }
        return { rows: [] };
      },
    };
    const r = await moveIn(q as never, {
      businessId: BIZ,
      ref: { manageToken: OLD_TOKEN },
      newStart: new Date(START + 60 * MIN),
      actor: { kind: "customer" },
      now: new Date(START - 24 * 60 * MIN),
    });
    if (!r.ok) throw new Error(r.error);
    const token = r.value.booking.manageToken;
    expect(token).toMatch(/^[A-Za-z0-9_-]{43}$/);
    expect(token).not.toBe(OLD_TOKEN);
    expect(updates).toHaveLength(1);
    const hash = updates[0]![5] as Buffer;
    expect(hash.equals(hashManageToken(token))).toBe(true);
    expect(hash.equals(hashManageToken(OLD_TOKEN))).toBe(false);
    // Klartexten skickas aldrig till databasen.
    expect(updates[0]).not.toContain(token);
  });

  it("två flyttar ger två olika token", async () => {
    // WP-46: aktören är en medlem → `loadMember` läser `memberships` (ägaren).
    const q = {
      query: async (text: string) => ({
        rows: /from public\.memberships/.test(text)
          ? [{ role: "owner", staff_id: null }]
          : [],
      }),
    };
    const input = {
      businessId: BIZ,
      ref: { bookingId: BOOKING },
      newStart: new Date(START + 60 * MIN),
      actor: { kind: "owner" as const, userId: "u" },
      now: new Date(START - 24 * 60 * MIN),
    };
    const a = await moveIn(q as never, input);
    const b = await moveIn(q as never, input);
    expect(a).toEqual(ok(expect.anything()));
    if (!a.ok || !b.ok) throw new Error("move");
    expect(a.value.booking.manageToken).not.toBe(b.value.booking.manageToken);
  });
});
