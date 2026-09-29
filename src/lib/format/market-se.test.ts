import { describe, expect, it } from "vitest";

import {
  addLocalDays,
  formatDate,
  formatLocalDate,
  formatWeekdayRange,
  fromLocal,
  fromLocalStrict,
  localDayLengthHours,
  localDayRange,
  parseInstant,
  STOCKHOLM,
  toWallClock,
  utcOffsetMinutes,
  type LocalDate,
  type LocalTime,
} from "./dates";
import {
  formatMoneyIn,
  formatSek,
  moneyInputValueIn,
  parseMoneyIn,
  parseSek,
} from "./money";
import {
  formatPhone,
  maskPhone,
  parsePhoneFor,
  parseSwedishPhone,
  phoneErrorKey,
  type E164,
} from "./phone";

const d = (s: string) => s as LocalDate;
const t = (s: string) => s as LocalTime;
const utc = (s: string): Date => {
  const r = parseInstant(s);
  if (!r.ok) throw new Error(`fixture: ${s}`);
  return r.value;
};
const iso = (x: Date) => x.toISOString().replace(".000Z", "Z");
const NBSP = " ";

describe("parseSwedishPhone (mobil, standard)", () => {
  it.each([
    "070-123 45 67",
    "0701234567",
    "070 123 45 67",
    "+46 70 123 45 67",
    "+46701234567",
    "+46 (0)70 123 45 67",
    "0046 70 123 45 67",
    "46701234567",
    "701234567",
    `070${NBSP}123${NBSP}45${NBSP}67`,
  ])("%j → +46701234567", (input) => {
    expect(parseSwedishPhone(input)).toEqual({
      ok: true,
      value: "+46701234567",
    });
  });

  it.each([
    ["", "empty"],
    ["   ", "empty"],
    ["070-abc", "invalid_chars"],
    ["+56 9 1234 5678", "wrong_country"],
    ["0056 9 1234 5678", "wrong_country"],
    ["070 123 45", "invalid_length"],
    ["070 123 45 678", "invalid_length"],
    ["08 123 456 78", "not_mobile"],
    ["00", "wrong_country"],
  ] as const)("%j → %s", (input, error) => {
    expect(parseSwedishPhone(input)).toEqual({ ok: false, error });
  });
});

describe("parseSwedishPhone (mobile_or_fixed)", () => {
  const opts = { allow: "mobile_or_fixed" } as const;
  it.each([
    ["08-123 456 78", "+46812345678"],
    ["08 12 34 56", "+468123456"],
    ["031-12 34 56", "+4631123456"],
    ["0910-123 45", "+4691012345"],
    ["+46 8 123 456 78", "+46812345678"],
    ["070-123 45 67", "+46701234567"],
  ])("%j → %s", (input, value) => {
    expect(parseSwedishPhone(input, opts)).toEqual({ ok: true, value });
  });

  it.each([
    ["08 123 45", "invalid_length"],
    ["08 123 456 789", "invalid_length"],
    ["+46 00 123 4567", "invalid_prefix"],
    ["+47 22 12 34 56", "wrong_country"],
  ] as const)("%j → %s", (input, error) => {
    expect(parseSwedishPhone(input, opts)).toEqual({ ok: false, error });
  });
});

describe("parsePhoneFor (land som parameter)", () => {
  it("SE väljer den svenska parsern", () => {
    expect(parsePhoneFor("SE", "070-123 45 67")).toEqual({
      ok: true,
      value: "+46701234567",
    });
    expect(parsePhoneFor("SE", "+56 9 1234 5678")).toEqual({
      ok: false,
      error: "wrong_country",
    });
  });

  it("CL väljer den chilenska parsern", () => {
    expect(parsePhoneFor("CL", "+56 9 1234 5678")).toEqual({
      ok: true,
      value: "+56912345678",
    });
    expect(parsePhoneFor("CL", "070-123 45 67").ok).toBe(false);
  });

  it("phoneErrorKey: wrong_country → i18n-nyckeln not_chilean", () => {
    expect(phoneErrorKey("wrong_country")).toBe("not_chilean");
    expect(phoneErrorKey("invalid_length")).toBe("invalid_length");
  });
});

describe("formatPhone/maskPhone (svensk mobil)", () => {
  const p = "+46701234567" as E164;
  it("formaterar i grupper", () => {
    expect(formatPhone(p)).toBe("+46 70 123 45 67");
  });
  it("maskerar mittsiffrorna", () => {
    expect(maskPhone(p)).toBe("+46 70 ••• 45 67");
    expect(maskPhone(p)).not.toContain("123");
  });
  it("fast svenskt nummer returneras oförändrat", () => {
    expect(formatPhone("+46812345678" as E164)).toBe("+46812345678");
  });
});

describe("formatSek / formatMoneyIn(SEK)", () => {
  it.each([
    [0, `0${NBSP}kr`],
    [45_000, `450${NBSP}kr`],
    [45_050, `450,50${NBSP}kr`],
    [45_005, `450,05${NBSP}kr`],
    [125_000, `1${NBSP}250${NBSP}kr`],
    [123_456_700, `1${NBSP}234${NBSP}567${NBSP}kr`],
    [-45_000, `−450${NBSP}kr`],
  ])("%d öre → %j", (ore, text) => {
    expect(formatSek(ore)).toBe(text);
    expect(formatMoneyIn("SEK", ore)).toBe(text);
  });

  it("CLP följer formatClp", () => {
    expect(formatMoneyIn("CLP", 18_000)).toBe("$18.000");
  });

  it.each([1.5, Number.NaN, 2_147_483_648])("kastar för %s", (v) => {
    expect(() => formatSek(v)).toThrow(RangeError);
  });
});

describe("parseSek / parseMoneyIn(SEK)", () => {
  it.each([
    ["450", 45_000],
    ["450,50", 45_050],
    ["450,5", 45_050],
    ["450.50", 45_050],
    ["1 250", 125_000],
    [`1${NBSP}250${NBSP}kr`, 125_000],
    ["450 kr", 45_000],
    ["450kr", 45_000],
    ["450:-", 45_000],
    ["kr 450", 45_000],
    ["0", 0],
    ["0450", 45_000],
  ])("%j → %d öre", (input, ore) => {
    expect(parseSek(input)).toEqual({ ok: true, value: ore });
    expect(parseMoneyIn("SEK", input)).toEqual({ ok: true, value: ore });
  });

  it.each([
    ["", "empty"],
    ["  ", "empty"],
    ["-450", "invalid_format"],
    ["450,505", "invalid_format"],
    ["12 34", "invalid_format"],
    ["abc", "invalid_format"],
    ["$450", "invalid_format"],
    ["30000000", "out_of_range"],
    ["99999999999999999999", "out_of_range"],
  ] as const)("%j → %s", (input, error) => {
    expect(parseSek(input)).toEqual({ ok: false, error });
  });

  it("CLP följer parseClp", () => {
    expect(parseMoneyIn("CLP", "$18.000")).toEqual({ ok: true, value: 18_000 });
  });

  it("moneyInputValueIn läses tillbaka av parseMoneyIn", () => {
    for (const ore of [0, 45_000, 45_050, 45_005, 125_000]) {
      const text = moneyInputValueIn("SEK", ore);
      expect(parseMoneyIn("SEK", text)).toEqual({ ok: true, value: ore });
    }
    expect(moneyInputValueIn("SEK", 45_050)).toBe("450,50");
    expect(moneyInputValueIn("CLP", 18_000)).toBe("18000");
  });
});

describe("formatLocalDate (sv-SE)", () => {
  const fri = d("2026-10-02");
  it.each([
    ["weekdayDayMonthShort", "Fre 2 okt"],
    ["weekdayDayMonthLong", "Fredag 2 oktober"],
    ["weekdayDayShort", "Fre 2"],
    ["weekdayDayLong", "Fredag 2"],
    ["dayMonthLong", "2 oktober"],
    ["monthYear", "Oktober 2026"],
    ["month", "Oktober"],
    ["weekdayShort", "Fre"],
    ["weekdayMin", "Fr"],
    ["weekdayShortLower", "fre"],
    ["weekdayLongLower", "fredag"],
    ["weekdayDayMonthLongLower", "fredag 2 oktober"],
  ] as const)("%s → %j", (preset, text) => {
    expect(formatLocalDate(fri, preset, "sv-SE")).toBe(text);
  });

  it("es-CL är oförändrat", () => {
    expect(formatLocalDate(fri, "weekdayDayMonthLong", "es-CL")).toBe(
      "Viernes 2 de octubre",
    );
  });

  it("formatWeekdayRange och formatDate med språk", () => {
    expect(formatWeekdayRange(1, 6, "sv-SE")).toBe("Mån–Lör");
    // 23:30 UTC den 1 okt = 01:30 den 2 okt i Stockholm (CEST).
    expect(
      formatDate(
        utc("2026-10-01T23:30:00Z"),
        STOCKHOLM,
        "dayMonthLong",
        "sv-SE",
      ),
    ).toBe("2 oktober");
  });
});

describe("Europe/Stockholm: sommartid (sista söndagen i mars och oktober)", () => {
  it("offset +60 på vintern och +120 på sommaren", () => {
    expect(utcOffsetMinutes(utc("2026-01-15T12:00:00Z"), STOCKHOLM)).toBe(60);
    expect(utcOffsetMinutes(utc("2026-07-15T12:00:00Z"), STOCKHOLM)).toBe(120);
  });

  it("2026-03-29 har 23 timmar, 2026-10-25 har 25", () => {
    expect(localDayLengthHours(d("2026-03-29"), STOCKHOLM)).toBe(23);
    expect(localDayLengthHours(d("2026-10-25"), STOCKHOLM)).toBe(25);
    expect(localDayLengthHours(d("2026-03-28"), STOCKHOLM)).toBe(24);
    expect(localDayLengthHours(d("2026-10-26"), STOCKHOLM)).toBe(24);
  });

  it("localDayRange för bytesdagarna", () => {
    const march = localDayRange(d("2026-03-29"), STOCKHOLM);
    expect(iso(march.start)).toBe("2026-03-28T23:00:00Z");
    expect(iso(march.end)).toBe("2026-03-29T22:00:00Z");
    const oct = localDayRange(d("2026-10-25"), STOCKHOLM);
    expect(iso(oct.start)).toBe("2026-10-24T22:00:00Z");
    expect(iso(oct.end)).toBe("2026-10-25T23:00:00Z");
  });

  it("02:30 den 29 mars finns inte (glapp 02:00 → 03:00)", () => {
    expect(fromLocalStrict(d("2026-03-29"), t("02:30"), STOCKHOLM)).toEqual({
      ok: false,
      error: "nonexistent_local_time",
    });
    expect(iso(fromLocal(d("2026-03-29"), t("02:30"), STOCKHOLM))).toBe(
      "2026-03-29T01:30:00Z",
    );
    expect(
      iso(fromLocal(d("2026-03-29"), t("02:30"), STOCKHOLM, "earlier")),
    ).toBe("2026-03-29T00:30:00Z");
  });

  it("02:30 den 25 oktober finns två gånger (03:00 → 02:00)", () => {
    expect(fromLocalStrict(d("2026-10-25"), t("02:30"), STOCKHOLM)).toEqual({
      ok: false,
      error: "ambiguous_local_time",
    });
    expect(iso(fromLocal(d("2026-10-25"), t("02:30"), STOCKHOLM))).toBe(
      "2026-10-25T00:30:00Z",
    );
    expect(
      iso(fromLocal(d("2026-10-25"), t("02:30"), STOCKHOLM, "later")),
    ).toBe("2026-10-25T01:30:00Z");
  });

  it("en bokning 10:00 lokal tid följer väggklockan över bytet", () => {
    const before = fromLocal(d("2026-10-24"), t("10:00"), STOCKHOLM);
    const after = fromLocal(
      addLocalDays(d("2026-10-24"), 1),
      t("10:00"),
      STOCKHOLM,
    );
    expect(iso(before)).toBe("2026-10-24T08:00:00Z");
    expect(iso(after)).toBe("2026-10-25T09:00:00Z");
    expect(toWallClock(after, STOCKHOLM)).toMatchObject({
      date: "2026-10-25",
      time: "10:00",
      weekday: 7,
      offsetMinutes: 60,
    });
  });
});
