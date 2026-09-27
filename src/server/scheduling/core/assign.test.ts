import { describe, expect, it } from "vitest";

import {
  booking,
  d,
  DIEGO,
  MATIAS,
  norte,
  TOMAS,
} from "../__fixtures__/snapshot";
import { assignmentOrder, bookingsPerStaffOnDay } from "./assign";

describe("assignmentOrder", () => {
  it("minst antal bokningar samma dag vinner", () => {
    expect(
      assignmentOrder([
        { id: DIEGO, sort: 1, bookingsThatDay: 2 },
        { id: MATIAS, sort: 2, bookingsThatDay: 0 },
        { id: TOMAS, sort: 3, bookingsThatDay: 1 },
      ]),
    ).toEqual([MATIAS, TOMAS, DIEGO]);
  });

  it("lika → lägst sort, lika → lägst id", () => {
    expect(
      assignmentOrder([
        { id: TOMAS, sort: 1, bookingsThatDay: 0 },
        { id: MATIAS, sort: 2, bookingsThatDay: 0 },
        { id: DIEGO, sort: 2, bookingsThatDay: 0 },
      ]),
    ).toEqual([TOMAS, DIEGO, MATIAS]);
  });

  it("muterar inte indata", () => {
    const a = [
      { id: "b", sort: 2, bookingsThatDay: 0 },
      { id: "a", sort: 1, bookingsThatDay: 0 },
    ];
    assignmentOrder(a);
    expect(a[0]!.id).toBe("b");
  });
});

describe("bookingsPerStaffOnDay", () => {
  const TUE = "2026-10-06";

  it("räknar aktiva bokningar den lokala dagen; avbokade och dagen innan räknas inte", () => {
    const s = norte({
      bookings: [
        booking(DIEGO, TUE, "10:00", 35),
        booking(DIEGO, TUE, "11:00", 35, { status: "pending_payment" }),
        booking(DIEGO, TUE, "12:00", 35, { status: "completed" }),
        booking(DIEGO, TUE, "13:00", 35, { status: "cancelled" }),
        booking(DIEGO, TUE, "14:00", 35, { status: "no_show" }),
        booking(MATIAS, "2026-10-05", "18:00", 35),
        booking(MATIAS, TUE, "10:00", 35),
      ],
    });
    const counts = bookingsPerStaffOnDay(s, d(TUE));
    expect(counts.get(DIEGO)).toBe(3);
    expect(counts.get(MATIAS)).toBe(1);
    expect(counts.get(TOMAS) ?? 0).toBe(0);
  });

  it("lokal dag, inte UTC-dag: 22:00 −03 räknas till samma lokala dag", () => {
    const s = norte({ bookings: [booking(DIEGO, TUE, "22:00", 35)] });
    expect(bookingsPerStaffOnDay(s, d(TUE)).get(DIEGO)).toBe(1);
    expect(bookingsPerStaffOnDay(s, d("2026-10-07")).get(DIEGO) ?? 0).toBe(0);
  });

  it("excludeBookingId räknas inte (flytt)", () => {
    const s = norte({
      bookings: [booking(DIEGO, TUE, "10:00", 35, { id: "x" })],
    });
    expect(bookingsPerStaffOnDay(s, d(TUE), "x").get(DIEGO) ?? 0).toBe(0);
  });
});
