import { afterEach, describe, expect, it, vi } from "vitest";

import { getMarketConfig, MARKETS } from "./market";

describe("market.ts", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
    vi.resetModules();
  });

  it("CL och SE har rätt värden", () => {
    expect(getMarketConfig("CL")).toEqual({
      timeZone: "America/Santiago",
      currency: "CLP",
      minorUnits: 0,
      phoneCountry: "CL",
      locale: "es-CL",
    });
    expect(getMarketConfig("SE")).toEqual({
      timeZone: "Europe/Stockholm",
      currency: "SEK",
      minorUnits: 2,
      phoneCountry: "SE",
      locale: "sv-SE",
    });
  });

  it("tidszonerna finns i Intl", () => {
    for (const m of Object.values(MARKETS)) {
      expect(
        new Intl.DateTimeFormat("en-US", {
          timeZone: m.timeZone,
        }).resolvedOptions().timeZone,
      ).toBe(m.timeZone);
    }
  });

  it("CL är standard", async () => {
    vi.stubEnv("NEXT_PUBLIC_MARKET", "");
    vi.resetModules();
    const { marketConfig } = await import("./market");
    expect(marketConfig.currency).toBe("CLP");
  });

  it("NEXT_PUBLIC_MARKET=SE ger svensk tidszon, valuta, telefon och språk i appen", async () => {
    vi.stubEnv("NEXT_PUBLIC_MARKET", "SE");
    vi.resetModules();
    const { marketConfig } = await import("./market");
    const dates = await import("@/lib/format/dates");
    const money = await import("@/lib/format/money");
    const phone = await import("@/lib/format/phone");
    expect(marketConfig.timeZone).toBe("Europe/Stockholm");
    expect(dates.APP_TZ).toBe("Europe/Stockholm");
    expect(dates.APP_LOCALE).toBe("sv-SE");
    expect(dates.formatWeekdayRange(1, 5)).toBe("Mån–Fre");
    expect(money.formatMoney(45_000)).toBe("450 kr");
    expect(money.parseMoney("450,50")).toEqual({ ok: true, value: 45_050 });
    expect(phone.parsePhone("070-123 45 67")).toEqual({
      ok: true,
      value: "+46701234567",
    });
  });
});
