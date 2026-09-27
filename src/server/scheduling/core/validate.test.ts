import { describe, expect, it } from "vitest";

import {
  ALL_WEEK,
  at,
  booking,
  d,
  DIEGO,
  hours,
  lunch,
  MATIAS,
  norte,
  nowAt,
  staff,
  timeOff,
  TOMAS,
} from "../__fixtures__/snapshot";
import type { DayInput, ScheduleSnapshot } from "../types";
import { checkStart } from "./validate";

const TUE = "2026-10-06";

function input(s: ScheduleSnapshot, over: Partial<DayInput> = {}): DayInput {
  return {
    snapshot: s,
    date: d("2000-01-01"), // ignoreras: datumet tas från starten
    staff: DIEGO,
    audience: "customer",
    now: nowAt("2026-10-01", "09:00"),
    ...over,
  };
}

describe("checkStart (inv. 6: allt räknas om)", () => {
  it("ledig tid på rutnätet → ok med profesionalen", () => {
    expect(checkStart(input(norte()), at(TUE, "11:15"))).toEqual({
      ok: true,
      value: [DIEGO],
    });
  });

  it("utanför öppettiderna → outside_hours", () => {
    expect(checkStart(input(norte()), at(TUE, "19:00"))).toEqual({
      ok: false,
      error: "outside_hours",
    });
    expect(checkStart(input(norte()), at(TUE, "18:45"))).toMatchObject({
      error: "outside_hours",
    });
    expect(checkStart(input(norte()), at("2026-10-04", "11:00"))).toMatchObject(
      { error: "outside_hours" },
    );
  });

  it("i frånvaro (lunch) → outside_hours", () => {
    const s = norte({ timeOff: [lunch(TUE)] });
    expect(checkStart(input(s), at(TUE, "13:30"))).toMatchObject({
      error: "outside_hours",
    });
  });

  it("kund utanför rutnätet → outside_hours; ägaren får valfri hel minut", () => {
    expect(checkStart(input(norte()), at(TUE, "11:07"))).toMatchObject({
      error: "outside_hours",
    });
    expect(
      checkStart(input(norte(), { audience: "owner" }), at(TUE, "11:07")),
    ).toEqual({ ok: true, value: [DIEGO] });
  });

  it("sekunder eller millisekunder → outside_hours även för ägaren", () => {
    expect(
      checkStart(
        input(norte(), { audience: "owner" }),
        at(TUE, "11:00") + 1000,
      ),
    ).toMatchObject({ error: "outside_hours" });
  });

  it("tight packing-kandidat utanför rutnätet godtas av kund", () => {
    const s = norte({ bookings: [booking(DIEGO, TUE, "10:00", 35)] });
    expect(checkStart(input(s), at(TUE, "10:35"))).toEqual({
      ok: true,
      value: [DIEGO],
    });
  });

  it("krock med bokning eller buffert → slot_taken", () => {
    const s = norte({
      bookings: [booking(DIEGO, TUE, "10:00", 35, { bufferMin: 10 })],
    });
    expect(checkStart(input(s), at(TUE, "10:30"))).toMatchObject({
      error: "slot_taken",
    });
    expect(
      checkStart(input(s, { audience: "owner" }), at(TUE, "10:40")),
    ).toMatchObject({ error: "slot_taken" });
    expect(
      checkStart(input(s, { audience: "owner" }), at(TUE, "10:45")),
    ).toEqual({ ok: true, value: [DIEGO] });
  });

  it("flytt: bokningen själv räknas inte (excludeBookingId)", () => {
    const s = norte({
      bookings: [booking(DIEGO, TUE, "10:00", 35, { id: "self" })],
    });
    expect(
      checkStart(input(s, { excludeBookingId: "self" }), at(TUE, "10:15")),
    ).toEqual({ ok: true, value: [DIEGO] });
  });

  it("too_soon för kund (now + notice), okej för ägare", () => {
    const now = nowAt(TUE, "10:20");
    expect(checkStart(input(norte(), { now }), at(TUE, "11:15"))).toMatchObject(
      {
        error: "too_soon",
      },
    );
    expect(checkStart(input(norte(), { now }), at(TUE, "11:30"))).toMatchObject(
      {
        ok: true,
      },
    );
    expect(
      checkStart(input(norte(), { now, audience: "owner" }), at(TUE, "10:00")),
    ).toMatchObject({ ok: true });
  });

  it("too_far för kund (lokal kalenderdag), okej för ägare", () => {
    const s = norte({ businessHours: hours(ALL_WEEK, "10:00", "19:00") });
    const now = nowAt("2026-10-02", "23:30");
    expect(
      checkStart(input(s, { now }), at("2026-11-01", "18:00")),
    ).toMatchObject({ ok: true });
    expect(
      checkStart(input(s, { now }), at("2026-11-02", "10:00")),
    ).toMatchObject({ error: "too_far" });
    expect(
      checkStart(
        input(s, { now, audience: "owner" }),
        at("2026-11-02", "10:00"),
      ),
    ).toMatchObject({ ok: true });
  });

  it("any: alla lediga i tilldelningsordning; upptagna utelämnas", () => {
    const s = norte({
      bookings: [
        booking(DIEGO, TUE, "15:00", 35),
        booking(DIEGO, TUE, "16:00", 35),
        booking(TOMAS, TUE, "11:00", 35),
      ],
    });
    expect(checkStart(input(s, { staff: "any" }), at(TUE, "11:00"))).toEqual({
      ok: true,
      value: [MATIAS, DIEGO],
    });
  });

  it("any: alla upptagna → slot_taken", () => {
    const s = norte({
      staff: [staff(DIEGO, 1), staff(MATIAS, 2)],
      bookings: [
        booking(DIEGO, TUE, "11:00", 35),
        booking(MATIAS, TUE, "11:00", 35),
      ],
    });
    expect(
      checkStart(input(s, { staff: "any" }), at(TUE, "11:00")),
    ).toMatchObject({ error: "slot_taken" });
  });

  it("personlig frånvaro → outside_hours för den profesionalen", () => {
    const s = norte({ timeOff: [timeOff(DIEGO, TUE, "10:00", "19:00")] });
    expect(checkStart(input(s), at(TUE, "11:00"))).toMatchObject({
      error: "outside_hours",
    });
  });
});
