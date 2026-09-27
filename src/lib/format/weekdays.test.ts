import { describe, expect, it } from "vitest";

import { WEEKDAY_MIN } from "./calendar-es-CL";
import {
  formatLocalDate,
  formatWeekdayRange,
  type IsoWeekday,
  type LocalDate,
} from "./dates";

const d = (s: string) => s as LocalDate;

describe("veckodagar med två bokstäver (Reserva, kalenderrubrik)", () => {
  it("WEEKDAY_MIN i ISO-ordning", () => {
    expect(WEEKDAY_MIN).toEqual(["Lu", "Ma", "Mi", "Ju", "Vi", "Sá", "Do"]);
  });

  it("strängarna är NFC", () => {
    for (const s of WEEKDAY_MIN) expect(s).toBe(s.normalize("NFC"));
  });

  it.each([
    ["2026-09-28", "Lu"],
    ["2026-09-29", "Ma"],
    ["2026-09-30", "Mi"],
    ["2026-10-01", "Ju"],
    ["2026-10-02", "Vi"],
    ["2026-10-03", "Sá"],
    ["2026-10-04", "Do"],
  ])("formatLocalDate(%s, weekdayMin) = %s", (date, expected) => {
    expect(formatLocalDate(d(date), "weekdayMin")).toBe(expected);
  });
});

describe("formatWeekdayRange", () => {
  it("Lun–Sáb med en-dash (U+2013) utan mellanslag", () => {
    const s = formatWeekdayRange(1, 6);
    expect(s).toBe("Lun–Sáb");
    expect(s.codePointAt(3)).toBe(0x2013);
  });

  it.each([
    [1, 5, "Lun–Vie"],
    [2, 7, "Mar–Dom"],
    [1, 7, "Lun–Dom"],
  ] as [IsoWeekday, IsoWeekday, string][])("%d–%d → %s", (a, b, expected) => {
    expect(formatWeekdayRange(a, b)).toBe(expected);
  });

  it("samma dag ger bara dagen", () => {
    expect(formatWeekdayRange(3, 3)).toBe("Mié");
  });

  it("omlott över veckoslutet är tillåtet (Sáb–Lun)", () => {
    expect(formatWeekdayRange(6, 1)).toBe("Sáb–Lun");
  });

  it.each([0, 8, 1.5, Number.NaN])("kastar RangeError för %s", (v) => {
    expect(() => formatWeekdayRange(v as IsoWeekday, 6)).toThrow(RangeError);
    expect(() => formatWeekdayRange(1, v as IsoWeekday)).toThrow(RangeError);
  });
});
