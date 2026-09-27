import { describe, expect, it } from "vitest";

import {
  at,
  booking,
  CORTE_BARBA,
  d,
  DIEGO,
  hours,
  lunch,
  MATIAS,
  MON_SAT,
  norte,
  staff,
  timeOff,
} from "../__fixtures__/snapshot";
import { freeWindows, workingWindows } from "./windows";

// Tisdag 6 okt 2026 (sommartid, −03): 10:00 = 13:00Z.
const TUE = "2026-10-06";
const w = (a: string, b: string, date = TUE) => ({
  start: at(date, a),
  end: at(date, b),
});

describe("workingWindows (företag ∩ personal)", () => {
  it("profesional utan staff_hours följer business_hours (WP-01 FRÅGA 5)", () => {
    const s = norte();
    expect(workingWindows(s, s.staff[0]!, d(TUE))).toEqual([
      w("10:00", "19:00"),
    ]);
  });

  it("personalens rader snävar in", () => {
    const s = norte({
      staff: [staff(DIEGO, 1, { hours: hours([2], "12:00", "16:00") })],
    });
    expect(workingWindows(s, s.staff[0]!, d(TUE))).toEqual([
      w("12:00", "16:00"),
    ]);
  });

  it("rader som är bredare än företaget klipps (inv. 3, vidgar aldrig)", () => {
    const s = norte({
      staff: [staff(DIEGO, 1, { hours: hours(MON_SAT, "09:00", "21:00") })],
    });
    expect(workingWindows(s, s.staff[0]!, d(TUE))).toEqual([
      w("10:00", "19:00"),
    ]);
  });

  it("profesional med rader men ingen för veckodagen arbetar inte", () => {
    const s = norte({
      staff: [staff(DIEGO, 1, { hours: hours([1], "10:00", "19:00") })],
    });
    expect(workingWindows(s, s.staff[0]!, d(TUE))).toEqual([]);
  });

  it("flera intervall samma dag ger två fönster", () => {
    const s = norte({
      businessHours: [
        ...hours(MON_SAT, "10:00", "13:30"),
        ...hours(MON_SAT, "14:30", "19:00"),
      ],
    });
    expect(workingWindows(s, s.staff[0]!, d(TUE))).toEqual([
      w("10:00", "13:30"),
      w("14:30", "19:00"),
    ]);
  });

  it("söndag utan rader ger inga fönster", () => {
    const s = norte();
    expect(workingWindows(s, s.staff[0]!, d("2026-10-04"))).toEqual([]);
  });
});

describe("freeWindows (− frånvaro − bokningar − buffert)", () => {
  it("lunch för hela företaget (staff_id null) tar bort för alla", () => {
    const s = norte({ timeOff: [lunch(TUE)] });
    for (const st of s.staff) {
      expect(freeWindows(s, st, d(TUE))).toEqual([
        w("10:00", "13:30"),
        w("14:30", "19:00"),
      ]);
    }
  });

  it("frånvaro med staff_id tar bara bort för den profesionalen", () => {
    const s = norte({ timeOff: [timeOff(DIEGO, TUE, "15:00", "16:00")] });
    expect(freeWindows(s, s.staff[0]!, d(TUE))).toEqual([
      w("10:00", "15:00"),
      w("16:00", "19:00"),
    ]);
    expect(freeWindows(s, s.staff[1]!, d(TUE))).toEqual([w("10:00", "19:00")]);
  });

  it("frånvaro som börjar dagen innan eller slutar dagen efter klipps", () => {
    const s = norte({
      timeOff: [
        timeOff(DIEGO, "2026-10-05", "18:00", "11:00", TUE),
        timeOff(MATIAS, TUE, "17:00", "09:00", "2026-10-07"),
      ],
    });
    expect(freeWindows(s, s.staff[0]!, d(TUE))).toEqual([w("11:00", "19:00")]);
    expect(freeWindows(s, s.staff[1]!, d(TUE))).toEqual([w("10:00", "17:00")]);
  });

  it("cancelled och no_show blockerar inte; pending_payment, confirmed och completed gör det", () => {
    const s = norte({
      bookings: [
        booking(DIEGO, TUE, "10:00", 30, { status: "cancelled" }),
        booking(DIEGO, TUE, "11:00", 30, { status: "no_show" }),
        booking(DIEGO, TUE, "12:00", 30, { status: "pending_payment" }),
        booking(DIEGO, TUE, "15:00", 30, { status: "confirmed" }),
        booking(DIEGO, TUE, "17:00", 30, { status: "completed" }),
      ],
    });
    expect(freeWindows(s, s.staff[0]!, d(TUE))).toEqual([
      w("10:00", "12:00"),
      w("12:30", "15:00"),
      w("15:30", "17:00"),
      w("17:30", "19:00"),
    ]);
  });

  it("bokningar för andra profesionales påverkar inte", () => {
    const s = norte({ bookings: [booking(MATIAS, TUE, "10:00", 35)] });
    expect(freeWindows(s, s.staff[0]!, d(TUE))).toEqual([w("10:00", "19:00")]);
  });

  it("buffert (inv. 4): 35 min + 10 min buffert 10:00 blockerar till 10:45", () => {
    const s = norte({
      service: CORTE_BARBA,
      bookings: [booking(DIEGO, TUE, "10:00", 35, { bufferMin: 10 })],
    });
    expect(freeWindows(s, s.staff[0]!, d(TUE))).toEqual([w("10:45", "19:00")]);
  });

  it("excludeBookingId räknar inte bokningen själv (flytt)", () => {
    const b = booking(DIEGO, TUE, "10:00", 35, { id: "self" });
    const s = norte({ bookings: [b] });
    expect(freeWindows(s, s.staff[0]!, d(TUE), "self")).toEqual([
      w("10:00", "19:00"),
    ]);
  });
});
