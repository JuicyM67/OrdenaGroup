import { describe, expect, it } from "vitest";

import { splitBookings, toAccountBooking, type MyBookingRow } from "./view";

const NOW = new Date("2026-10-11T12:00:00Z");

function row(over: Partial<MyBookingRow> = {}): MyBookingRow {
  return {
    business_id: "aaaaaaaa-0000-0000-0000-000000000001",
    booking_id: "b1000000-0000-0000-0000-00000000000a",
    business_name: "Estudio Brisa",
    slug: "estudio-brisa",
    timezone: "America/Santiago",
    address: "Av. Providencia 1234",
    comuna: "Providencia",
    service_name: "Corte",
    staff_name: "Diego",
    starts_at: new Date("2026-10-16T12:30:00Z"),
    ends_at: new Date("2026-10-16T13:15:00Z"),
    status: "confirmed",
    price_clp: 65000,
    cancel_window_hours: 24,
    cancel_approval: "none",
    review_rating: null,
    review_created_at: null,
    ...over,
  };
}

describe("toAccountBooking", () => {
  it("kommande bekräftad bokning inom fönstret kan avbokas", () => {
    const b = toAccountBooking(row(), NOW);
    expect(b.upcoming).toBe(true);
    expect(b.canCancel).toBe(true);
    expect(b.cancelNeedsApproval).toBe(false);
    expect(b.reviewable).toBe(false);
  });

  it("utanför avbokningsfönstret: ingen avbokning (samma regel som /r/[token])", () => {
    const b = toAccountBooking(
      row({
        starts_at: new Date("2026-10-12T08:00:00Z"),
        ends_at: new Date("2026-10-12T09:00:00Z"),
      }),
      NOW,
    );
    expect(b.canCancel).toBe(false);
  });

  it("cancel_approval=all ger en förfrågan (WP-56)", () => {
    const b = toAccountBooking(row({ cancel_approval: "all" }), NOW);
    expect(b.canCancel).toBe(true);
    expect(b.cancelNeedsApproval).toBe(true);
  });

  it("passerad bekräftad bokning kan recenseras inom 60 dagar, inte efter", () => {
    const past = row({
      starts_at: new Date("2026-10-01T10:00:00Z"),
      ends_at: new Date("2026-10-01T11:00:00Z"),
    });
    expect(toAccountBooking(past, NOW).reviewable).toBe(true);
    expect(toAccountBooking(past, NOW).upcoming).toBe(false);
    const old = row({
      starts_at: new Date("2026-07-01T10:00:00Z"),
      ends_at: new Date("2026-07-01T11:00:00Z"),
    });
    expect(toAccountBooking(old, NOW).reviewable).toBe(false);
  });

  it("recension äldre än 7 dagar kan inte ändras; uteblev kan inte recenseras", () => {
    const base = {
      starts_at: new Date("2026-09-20T10:00:00Z"),
      ends_at: new Date("2026-09-20T11:00:00Z"),
    };
    expect(
      toAccountBooking(
        row({
          ...base,
          review_rating: 5,
          review_created_at: new Date("2026-09-21T10:00:00Z"),
        }),
        NOW,
      ).reviewable,
    ).toBe(false);
    expect(
      toAccountBooking(row({ ...base, status: "no_show" }), NOW).reviewable,
    ).toBe(false);
  });

  it("splitBookings: kommande stigande, tidigare fallande", () => {
    const a = toAccountBooking(row(), NOW);
    const b = toAccountBooking(
      row({
        booking_id: "b2",
        starts_at: new Date("2026-10-13T10:00:00Z"),
        ends_at: new Date("2026-10-13T11:00:00Z"),
      }),
      NOW,
    );
    const c = toAccountBooking(
      row({ booking_id: "c", status: "cancelled" }),
      NOW,
    );
    const { upcoming, past } = splitBookings([a, b, c]);
    expect(upcoming.map((x) => x.bookingId)).toEqual(["b2", a.bookingId]);
    expect(past.map((x) => x.bookingId)).toEqual(["c"]);
  });
});
