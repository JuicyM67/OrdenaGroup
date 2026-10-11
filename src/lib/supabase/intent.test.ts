import { describe, expect, it } from "vitest";

import { parseAuthIntent } from "./intent";

describe("parseAuthIntent", () => {
  it("bara 'customer' ger kundavsikt", () => {
    expect(parseAuthIntent("customer")).toBe("customer");
  });
  it("okänt, tomt eller saknat ger business (som före WP-67)", () => {
    for (const v of ["business", "", "Customer", "/evil", undefined, null]) {
      expect(parseAuthIntent(v)).toBe("business");
    }
  });
});
