import { describe, expect, it } from "vitest";

import { isDesignLabEnabled } from "./gate";

describe("isDesignLabEnabled", () => {
  it("är av i produktion", () => {
    expect(isDesignLabEnabled({ VERCEL_ENV: "production" })).toBe(false);
  });

  it("är på i preview", () => {
    expect(isDesignLabEnabled({ VERCEL_ENV: "preview" })).toBe(true);
  });

  it("är på i development", () => {
    expect(isDesignLabEnabled({ VERCEL_ENV: "development" })).toBe(true);
  });

  it("är på när VERCEL_ENV är odefinierad (lokalt)", () => {
    expect(isDesignLabEnabled({})).toBe(true);
  });

  it("är på i produktion om DESIGN_LAB=1 (staging, se WP-05)", () => {
    expect(
      isDesignLabEnabled({ VERCEL_ENV: "production", DESIGN_LAB: "1" }),
    ).toBe(true);
  });

  it("förblir av i produktion för andra DESIGN_LAB-värden", () => {
    expect(
      isDesignLabEnabled({ VERCEL_ENV: "production", DESIGN_LAB: "true" }),
    ).toBe(false);
    expect(
      isDesignLabEnabled({ VERCEL_ENV: "production", DESIGN_LAB: "" }),
    ).toBe(false);
    expect(isDesignLabEnabled({ VERCEL_ENV: "production" })).toBe(false);
  });
});
