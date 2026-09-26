import { describe, expect, it } from "vitest";

import {
  MONTH_LONG,
  MONTH_SHORT,
  WEEKDAY_LONG,
  WEEKDAY_SHORT,
} from "./calendar-es-CL";
import {
  formatDate,
  formatDuration,
  formatLocalDate,
  formatLocalTimeRange,
  formatTime,
  formatTimeRange,
  parseInstant,
  SANTIAGO,
  type DatePreset,
  type LocalDate,
  type LocalTime,
} from "./dates";

const d = (s: string) => s as LocalDate;
const t = (s: string) => s as LocalTime;
const utc = (s: string): Date => {
  const r = parseInstant(s);
  if (!r.ok) throw new Error(`fixture: ${s}`);
  return r.value;
};

describe("calendar-es-CL", () => {
  it("veckodagar i ISO-ordning", () => {
    expect(WEEKDAY_LONG).toEqual([
      "Lunes",
      "Martes",
      "Miércoles",
      "Jueves",
      "Viernes",
      "Sábado",
      "Domingo",
    ]);
    expect(WEEKDAY_SHORT).toEqual([
      "Lun",
      "Mar",
      "Mié",
      "Jue",
      "Vie",
      "Sáb",
      "Dom",
    ]);
  });
  it("månader i gemener, förkortningar med tre bokstäver (sep, FRÅGA 4)", () => {
    expect(MONTH_LONG).toEqual([
      "enero",
      "febrero",
      "marzo",
      "abril",
      "mayo",
      "junio",
      "julio",
      "agosto",
      "septiembre",
      "octubre",
      "noviembre",
      "diciembre",
    ]);
    expect(MONTH_SHORT).toEqual([
      "ene",
      "feb",
      "mar",
      "abr",
      "may",
      "jun",
      "jul",
      "ago",
      "sep",
      "oct",
      "nov",
      "dic",
    ]);
  });
  it("alla namn är NFC (förkomponerade accenter)", () => {
    for (const s of [
      ...WEEKDAY_LONG,
      ...WEEKDAY_SHORT,
      ...MONTH_LONG,
      ...MONTH_SHORT,
    ]) {
      expect(s).toBe(s.normalize("NFC"));
    }
  });
});

describe("formatLocalDate (designvärden tecken för tecken)", () => {
  it.each<[string, DatePreset, string]>([
    ["2026-10-02", "weekdayDayMonthShort", "Vie 2 oct"],
    ["2026-10-02", "weekdayDayMonthLong", "Viernes 2 de octubre"],
    ["2026-10-06", "weekdayDayShort", "Mar 6"],
    ["2026-10-06", "weekdayDayLong", "Martes 6"],
    ["2026-10-05", "weekdayDayShort", "Lun 5"],
    ["2026-10-07", "weekdayDayShort", "Mié 7"],
    ["2026-10-08", "weekdayDayShort", "Jue 8"],
    ["2026-10-03", "weekdayDayShort", "Sáb 3"],
    ["2026-10-02", "weekdayDayShort", "Vie 2"],
    ["2026-09-28", "dayMonthLong", "28 de septiembre"],
    ["2026-10-04", "dayMonthLong", "4 de octubre"],
    ["2026-10-02", "monthYear", "Octubre 2026"],
    ["2026-10-02", "month", "Octubre"],
    ["2026-10-03", "weekdayShort", "Sáb"],
    ["2026-10-02", "weekdayShort", "Vie"],
    ["2026-09-30", "weekdayShortLower", "mié"],
    ["2026-09-28", "weekdayShortLower", "lun"],
    ["2026-10-04", "weekdayShortLower", "dom"],
    ["2026-09-06", "weekdayDayMonthLong", "Domingo 6 de septiembre"],
    ["2026-01-01", "weekdayDayMonthShort", "Jue 1 ene"],
    ["2026-10-02", "weekdayLongLower", "viernes"],
    ["2026-10-03", "weekdayLongLower", "sábado"],
    ["2026-09-30", "weekdayLongLower", "miércoles"],
    ["2026-10-04", "weekdayLongLower", "domingo"],
    ["2026-10-05", "weekdayLongLower", "lunes"],
    ["2026-10-02", "weekdayDayMonthLongLower", "viernes 2 de octubre"],
    ["2026-10-03", "weekdayDayMonthLongLower", "sábado 3 de octubre"],
    ["2026-09-30", "weekdayDayMonthLongLower", "miércoles 30 de septiembre"],
    ["2026-01-01", "weekdayDayMonthLongLower", "jueves 1 de enero"],
    ["2026-12-31", "weekdayDayMonthLongLower", "jueves 31 de diciembre"],
  ])("%s %s → %s", (date, preset, expected) => {
    const out = formatLocalDate(d(date), preset);
    expect(out).toBe(expected);
    expect(out).toBe(out.normalize("NFC"));
    expect(out).not.toMatch(/[\u00A0\u202F]/);
  });
});

describe("presets för löptext (gemener)", () => {
  it("hela strängen är gemener, med accenter och utan versaler", () => {
    for (const date of eachDay()) {
      for (const preset of [
        "weekdayLongLower",
        "weekdayDayMonthLongLower",
      ] as const) {
        const out = formatLocalDate(date, preset);
        expect(out).toBe(out.toLowerCase());
        expect(out).toBe(out.normalize("NFC"));
      }
    }
  });
});

function eachDay(): LocalDate[] {
  // En vecka i varje månad 2026 täcker alla veckodagar och månader.
  return Array.from({ length: 12 }, (_, m) =>
    Array.from(
      { length: 7 },
      (_, i) => `2026-${String(m + 1).padStart(2, "0")}-0${i + 1}` as LocalDate,
    ),
  ).flat();
}

describe("formatDate", () => {
  it("fredag 2 okt kl 23:30 i Santiago är 2026-10-03T02:30Z", () => {
    expect(
      formatDate(utc("2026-10-03T02:30:00Z"), SANTIAGO, "weekdayDayMonthShort"),
    ).toBe("Vie 2 oct");
    expect(
      formatDate(utc("2026-10-03T03:00:00Z"), SANTIAGO, "weekdayDayMonthShort"),
    ).toBe("Sáb 3 oct");
  });
});

describe("formatTime och formatTimeRange", () => {
  it.each([
    ["2026-10-02T18:00:00Z", "15:00"],
    ["2026-10-02T12:05:00Z", "09:05"],
    ["2026-10-02T03:00:00Z", "00:00"],
    ["2026-10-03T02:59:00Z", "23:59"],
  ])("%s → %s", (instant, expected) => {
    expect(formatTime(utc(instant), SANTIAGO)).toBe(expected);
  });
  it('EventPopover: "11:30 – 12:05" (mellanslag + U+2013)', () => {
    const out = formatTimeRange(
      utc("2026-10-02T14:30:00Z"),
      utc("2026-10-02T15:05:00Z"),
      SANTIAGO,
    );
    expect(out).toBe("11:30 – 12:05");
    expect([...out].map((c) => c.codePointAt(0))).toContain(0x2013);
    expect(out.charCodeAt(5)).toBe(0x20);
  });
  it('öppettider (Reserva): "10:00–19:00" utan mellanslag', () => {
    expect(formatLocalTimeRange(t("10:00"), t("19:00"))).toBe("10:00–19:00");
    expect(formatLocalTimeRange(t("10:00"), t("24:00"))).toBe("10:00–24:00");
  });
  it('avvisar "24:00" som start', () => {
    expect(() => formatLocalTimeRange(t("24:00"), t("24:00"))).toThrow(
      RangeError,
    );
    expect(() => formatLocalTimeRange(t("24:00"), t("10:00"))).toThrow(
      RangeError,
    );
  });
});

describe("formatDuration", () => {
  it.each([
    [0, "0 min"],
    [20, "20 min"],
    [35, "35 min"],
    [50, "50 min"],
    [59, "59 min"],
    [60, "1 h"],
    [90, "1 h 30 min"],
    [120, "2 h"],
    [125, "2 h 5 min"],
  ])("%d → %s", (m, expected) => {
    expect(formatDuration(m)).toBe(expected);
  });
  it.each([-1, 1.5, Number.NaN, Number.POSITIVE_INFINITY])(
    "kastar RangeError för %s",
    (m) => {
      expect(() => formatDuration(m)).toThrow(RangeError);
    },
  );
});
