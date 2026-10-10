import { describe, expect, it } from "vitest";

import {
  SMS_CREDIT_PACKAGES,
  smsCreditPackage,
  smsCreditPrice,
} from "@/config/sms-credits";
import { smsLengthInfo } from "@/server/messaging/sms";

import { crossesWarnLevel } from "./notices";

/** WP-76 (D-053): 1 kredit = 1 segment. GSM-7 160 (153 per del), UCS-2 70 (67). */
describe("segmenträkning", () => {
  it.each([
    ["a".repeat(160), "gsm7", 1],
    ["a".repeat(161), "gsm7", 2],
    ["a".repeat(306), "gsm7", 2],
    ["a".repeat(307), "gsm7", 3],
    ["å".repeat(160), "gsm7", 1],
    ["€".repeat(80), "gsm7", 1],
    ["€".repeat(81), "gsm7", 2],
    ["á".repeat(70), "ucs2", 1],
    ["á".repeat(71), "ucs2", 2],
    ["á".repeat(134), "ucs2", 2],
    ["á".repeat(135), "ucs2", 3],
    [`Hej! ${"a".repeat(60)} 👋`, "ucs2", 1],
    [`Hej! ${"a".repeat(64)} 👋`, "ucs2", 2],
  ] as const)("%#: %s → %s, %i segment", (text, encoding, segments) => {
    const info = smsLengthInfo(text);
    expect(info.encoding).toBe(encoding);
    expect(info.segments).toBe(segments);
  });
});

describe("paket och pris", () => {
  it("paketen och priserna (exkl. moms, öre) enligt ägarens beslut", () => {
    expect(SMS_CREDIT_PACKAGES.map((p) => [p.credits, p.netOre])).toEqual([
      [100, 10_000],
      [250, 25_000],
      [500, 45_000],
      [1000, 90_000],
    ]);
  });

  it("moms 25 % räknas på servern: 250 sms = 250 kr + 62,50 kr", () => {
    expect(smsCreditPrice(smsCreditPackage(250)!)).toEqual({
      netOre: 25_000,
      vatOre: 6_250,
      totalOre: 31_250,
    });
  });

  it("okänt paket finns inte", () => {
    expect(smsCreditPackage(123)).toBeUndefined();
  });
});

describe("80 %-varningen", () => {
  it("köas när användningen passerar 80 % (40 av 50)", () => {
    expect(crossesWarnLevel(39, 1, 50)).toBe(true);
    expect(crossesWarnLevel(38, 1, 50)).toBe(false);
    expect(crossesWarnLevel(40, 1, 50)).toBe(false);
    expect(crossesWarnLevel(10, 0, 0)).toBe(false);
  });
});
