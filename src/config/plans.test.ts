import { describe, expect, it } from "vitest";

import {
  BUSINESS_PLANS,
  can,
  limit,
  minPlanFor,
  parseCustomLimits,
  type Feature,
} from "./plans";

// WP-73 (D-048): matrisen som ägaren godkänt.
const MATRIX: Record<Feature, readonly string[]> = {
  unbranded: ["emprende", "equipo", "local", "custom"],
  online_payment: ["emprende", "equipo", "local", "custom"],
  waitlist: ["emprende", "equipo", "local", "custom"],
  flash: ["equipo", "local", "custom"],
  campaigns: ["equipo", "local", "custom"],
  full_reports: ["equipo", "local", "custom"],
  staff_accounts: ["equipo", "local", "custom"],
  offers: ["equipo", "local", "custom"],
  priority_support: ["local", "custom"],
};

describe("planmatrisen", () => {
  it.each(Object.entries(MATRIX))("%s", (feature, plans) => {
    for (const p of BUSINESS_PLANS) {
      expect(can(p, feature as Feature)).toBe(plans.includes(p));
    }
  });

  it("gränser per plan", () => {
    expect(BUSINESS_PLANS.map((p) => limit(p, "staff"))).toEqual([
      1, 1, 3, 10, 10,
    ]);
    expect(BUSINESS_PLANS.map((p) => limit(p, "services"))).toEqual([
      3,
      null,
      null,
      null,
      null,
    ]);
    expect(BUSINESS_PLANS.map((p) => limit(p, "sms"))).toEqual([
      0, 50, 150, 300, 300,
    ]);
  });

  it("custom läser avtalade gränser, andra planer ignorerar dem", () => {
    const custom = parseCustomLimits({ staff: 50, sms: 2000, x: 1 });
    expect(custom).toEqual({ staff: 50, sms: 2000 });
    expect(limit("custom", "staff", custom)).toBe(50);
    expect(limit("custom", "sms", custom)).toBe(2000);
    expect(limit("local", "staff", custom)).toBe(10);
    expect(parseCustomLimits({ staff: -1, sms: "9" })).toEqual({});
  });

  it("okänd plan behandlas som Gratis", () => {
    expect(can("okand", "waitlist")).toBe(false);
    expect(limit("okand", "services")).toBe(3);
  });

  it("lägsta plan för uppgraderingsrutan", () => {
    expect(minPlanFor("flash")).toBe("equipo");
    expect(minPlanFor("waitlist")).toBe("emprende");
    expect(minPlanFor("priority_support")).toBe("local");
  });
});
