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
});
