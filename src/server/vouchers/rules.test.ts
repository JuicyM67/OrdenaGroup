import { describe, expect, it } from "vitest";

import {
  marketplaceFeeMinor,
  MARKETPLACE_FEE_BPS,
} from "@/config/platform-fee";
import { STOCKHOLM } from "@/lib/format/dates";

import {
  canWithdraw,
  generateVoucherCode,
  VOUCHER_ALPHABET,
  VOUCHER_CODE_RE,
  visitWithinValidity,
} from "./rules";

describe("värdebevis (WP-69)", () => {
  it("avgiften är 1 %, avrundad nedåt, aldrig över beloppet", () => {
    expect(MARKETPLACE_FEE_BPS).toBe(100);
    expect(marketplaceFeeMinor(89_000)).toBe(890);
    expect(marketplaceFeeMinor(199)).toBe(1);
    expect(marketplaceFeeMinor(99)).toBe(0);
    expect(marketplaceFeeMinor(0)).toBe(0);
    expect(marketplaceFeeMinor(100, 20_000)).toBe(100);
  });

  it("koden har prefix, 8 tecken och inga I/L/O/U", () => {
    let i = 0;
    const code = generateVoucherCode("BB", (n) => i++ % n);
    expect(code).toBe("BB-0123-4567");
    expect(code).toMatch(VOUCHER_CODE_RE);
    expect(VOUCHER_ALPHABET).not.toMatch(/[ILOU]/);
    expect(VOUCHER_ALPHABET).toHaveLength(32);
    expect(() => generateVoucherCode("bb", () => 0)).toThrow();
    const last = generateVoucherCode("OC", (n) => n - 1);
    expect(last).toBe("OC-ZZZZ-ZZZZ");
  });

  it("ångerrätten gäller t.o.m. dag 14 23:59 lokal tid", () => {
    // Köp 2026-10-24 23:30 Stockholm (sommartid, UTC+2); sommartiden slutar 25/10.
    const bought = new Date("2026-10-24T21:30:00Z");
    // Dag 14 = 2026-11-07, 23:59 lokal = 22:59 UTC (vintertid).
    expect(
      canWithdraw(bought, new Date("2026-11-07T22:59:00Z"), STOCKHOLM),
    ).toBe(true);
    expect(
      canWithdraw(bought, new Date("2026-11-07T23:00:00Z"), STOCKHOLM),
    ).toBe(false);
  });

  it("besöket måste ligga före utgången", () => {
    const exp = new Date("2027-10-24T21:59:59Z");
    expect(visitWithinValidity(new Date("2027-10-24T10:00:00Z"), exp)).toBe(
      true,
    );
    expect(visitWithinValidity(new Date("2027-10-25T10:00:00Z"), exp)).toBe(
      false,
    );
  });
});
