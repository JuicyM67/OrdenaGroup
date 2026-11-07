import { describe, expect, it } from "vitest";

import { classifyWhatsAppError } from "./errors";

describe("classifyWhatsAppError: permanent vs tillfälligt", () => {
  it.each([
    [131026, "inte på WhatsApp / odeliverbart"],
    [131009, "ogiltigt parametervärde (t.ex. nummer)"],
    [100, "ogiltig parameter"],
    [132001, "mallen finns inte"],
    [132015, "mallen pausad"],
    [132016, "mallen avstängd"],
    [132000, "fel antal parametrar"],
    [190, "token utgången"],
    [131047, "utanför 24 h-fönstret"],
  ])("%d (%s) → permanent", (code) => {
    expect(classifyWhatsAppError({ httpStatus: 400, code })).toEqual({
      kind: "permanent",
      code: `wa_${code}`,
    });
  });

  it.each([
    [130429, 400, "rate limit"],
    [131056, 400, "par-rate limit"],
    [80007, 400, "WABA rate limit"],
    [4, 400, "för många anrop"],
    [131000, 500, "något gick fel"],
    [133004, 503, "tillfälligt otillgänglig"],
  ])("%d (%s) → tillfälligt", (code, httpStatus) => {
    expect(classifyWhatsAppError({ httpStatus, code })).toEqual({
      kind: "temporary",
      code: `wa_${code}`,
    });
  });

  it("okänd kod: HTTP-statusen avgör (5xx/429 tillfälligt, 4xx permanent)", () => {
    expect(classifyWhatsAppError({ httpStatus: 502 })).toEqual({
      kind: "temporary",
      code: "http_502",
    });
    expect(classifyWhatsAppError({ httpStatus: 429 })).toEqual({
      kind: "temporary",
      code: "http_429",
    });
    expect(classifyWhatsAppError({ httpStatus: 400, code: 999999 })).toEqual({
      kind: "permanent",
      code: "wa_999999",
    });
  });

  it("statuswebhookens failed (ingen HTTP-status): okänd kod → permanent (e-post hellre än samma sak igen)", () => {
    expect(classifyWhatsAppError({ code: 999999 })).toEqual({
      kind: "permanent",
      code: "wa_999999",
    });
    expect(classifyWhatsAppError({})).toEqual({
      kind: "permanent",
      code: "wa_unknown",
    });
    expect(classifyWhatsAppError({ code: 131000 }).kind).toBe("temporary");
  });
});
