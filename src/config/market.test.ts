import { describe, expect, it } from "vitest";

import { marketConfig } from "./market";

describe("market.ts", () => {
  it("Chiles värden", () => {
    expect(marketConfig).toEqual({
      timeZone: "America/Santiago",
      currency: "CLP",
      phoneCountry: "CL",
      locale: "es-CL",
    });
  });

  it("tidszonen finns i Intl", () => {
    expect(
      new Intl.DateTimeFormat("en-US", {
        timeZone: marketConfig.timeZone,
      }).resolvedOptions().timeZone,
    ).toBe(marketConfig.timeZone);
  });
});
