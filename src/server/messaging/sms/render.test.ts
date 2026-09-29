import { describe, expect, it } from "vitest";

import { smsFixtures } from "./fixtures";
import { renderSms, SMS_TEMPLATE_NAMES, smsOptOutLine } from "./render";

const MARKETS = ["CL", "SE"] as const;

describe("renderSms", () => {
  for (const market of MARKETS) {
    const fixtures = smsFixtures(market);
    for (const template of SMS_TEMPLATE_NAMES) {
      it(`${template} (${market}): texto <= 160 caracteres con datos de ejemplo`, () => {
        const data = fixtures[template];
        const rendered = renderSms(template, market, data);
        expect(rendered.text.length).toBeGreaterThan(0);
        expect(rendered.text).not.toContain("{{");
        expect(rendered.text).not.toMatch(/\bundefined\b/);
        expect(rendered.text.length).toBeLessThanOrEqual(160);
        expect(rendered.warning).toBeNull();
      });
    }
  }

  it("smsOptOutLine: menciona STOP/STOPP según el mercado", () => {
    expect(smsOptOutLine("CL")).toMatch(/STOP/i);
    expect(smsOptOutLine("SE")).toMatch(/STOPP/i);
  });
});
