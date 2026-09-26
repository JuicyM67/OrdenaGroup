import { describe, expect, it } from "vitest";

import { addMonths, buildMonthGrid, weekOf } from "./grid";

function flat(weeks: ReturnType<typeof buildMonthGrid>) {
  return weeks.flat();
}

describe("buildMonthGrid", () => {
  it("oktober 2026: 5 rader, första cellen 2026-09-28, sista 2026-11-01", () => {
    const weeks = buildMonthGrid(2026, 10);
    expect(weeks).toHaveLength(5);
    const cells = flat(weeks);
    expect(cells[0]?.date).toBe("2026-09-28");
    expect(cells[cells.length - 1]?.date).toBe("2026-11-01");
  });

  it("november 2026 (1 nov = söndag): 6 utfyllnadsdagar från oktober, första cellen 2026-10-26", () => {
    const weeks = buildMonthGrid(2026, 11);
    const cells = flat(weeks);
    expect(cells[0]?.date).toBe("2026-10-26");
    const outBefore = cells.filter((c) => !c.inMonth && c.date < "2026-11-01");
    expect(outBefore).toHaveLength(6);
  });

  it("augusti 2026 (1 aug = lördag): 6 rader, 42 celler", () => {
    const weeks = buildMonthGrid(2026, 8);
    expect(weeks).toHaveLength(6);
    expect(flat(weeks)).toHaveLength(42);
  });

  it("februari 2027 (1 feb = måndag, 28 dagar): 4 rader, 28 celler, ingen utfyllnad", () => {
    const weeks = buildMonthGrid(2027, 2);
    expect(weeks).toHaveLength(4);
    const cells = flat(weeks);
    expect(cells).toHaveLength(28);
    expect(cells.every((c) => c.inMonth)).toBe(true);
  });

  it("skottår: februari 2028 har 29 dagar i månaden", () => {
    const cells = flat(buildMonthGrid(2028, 2));
    const inMonthDays = cells.filter((c) => c.inMonth);
    expect(inMonthDays).toHaveLength(29);
    expect(inMonthDays[inMonthDays.length - 1]?.date).toBe("2028-02-29");
  });

  it.each([
    ["America/Santiago", "America/Santiago"],
    ["UTC", "UTC"],
  ])(
    "sommartid Chile (%s): april 2026 ger 30 unika, stigande datum",
    (_label) => {
      const original = process.env.TZ;
      process.env.TZ = _label;
      try {
        const cells = flat(buildMonthGrid(2026, 4)).filter((c) => c.inMonth);
        expect(cells).toHaveLength(30);
        const dates = cells.map((c) => c.date);
        expect(new Set(dates).size).toBe(30);
        const sorted = [...dates].sort();
        expect(dates).toEqual(sorted);
      } finally {
        process.env.TZ = original;
      }
    },
  );

  it.each([
    ["America/Santiago", "America/Santiago"],
    ["UTC", "UTC"],
  ])(
    "sommartid Chile (%s): september 2026 ger 30 unika, stigande datum",
    (_label) => {
      const original = process.env.TZ;
      process.env.TZ = _label;
      try {
        const cells = flat(buildMonthGrid(2026, 9)).filter((c) => c.inMonth);
        expect(cells).toHaveLength(30);
        const dates = cells.map((c) => c.date);
        expect(new Set(dates).size).toBe(30);
        const sorted = [...dates].sort();
        expect(dates).toEqual(sorted);
      } finally {
        process.env.TZ = original;
      }
    },
  );
});

describe("addMonths", () => {
  it("december 2026 + 1 = januari 2027", () => {
    expect(addMonths({ year: 2026, month: 12 }, 1)).toEqual({
      year: 2027,
      month: 1,
    });
  });

  it("januari 2027 − 1 = december 2026", () => {
    expect(addMonths({ year: 2027, month: 1 }, -1)).toEqual({
      year: 2026,
      month: 12,
    });
  });
});

describe("weekOf", () => {
  it('weekOf("2026-10-04") = måndag 2026-09-28', () => {
    expect(weekOf("2026-10-04")).toBe("2026-09-28");
  });
});
