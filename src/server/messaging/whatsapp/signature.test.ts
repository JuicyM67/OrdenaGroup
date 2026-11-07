import { createHmac } from "node:crypto";

import { describe, expect, it } from "vitest";

import {
  computeWhatsAppSignature,
  safeTokenEqual,
  verifyWhatsAppSignature,
} from "./signature";

const SECRET = "app-secret-de-prueba";
const BODY = JSON.stringify({ object: "whatsapp_business_account", entry: [] });

function sign(body: string | Uint8Array, secret = SECRET): string {
  return `sha256=${createHmac("sha256", secret).update(body).digest("hex")}`;
}

describe("verifyWhatsAppSignature (X-Hub-Signature-256)", () => {
  it("giltig signatur över rå body godtas (sträng och bytes)", () => {
    expect(verifyWhatsAppSignature(BODY, sign(BODY), SECRET)).toBe(true);
    const bytes = new TextEncoder().encode(BODY);
    expect(verifyWhatsAppSignature(bytes, sign(bytes), SECRET)).toBe(true);
    expect(computeWhatsAppSignature(BODY, SECRET)).toBe(sign(BODY));
  });

  it("versaler i hex godtas (Meta skickar gemener, men tål båda)", () => {
    const upper = `sha256=${sign(BODY).slice(7).toUpperCase()}`;
    expect(verifyWhatsAppSignature(BODY, upper, SECRET)).toBe(true);
  });

  it("ogiltig: annan hemlighet, ändrad body, fel prefix, fel längd", () => {
    expect(verifyWhatsAppSignature(BODY, sign(BODY, "annan"), SECRET)).toBe(
      false,
    );
    expect(verifyWhatsAppSignature(`${BODY} `, sign(BODY), SECRET)).toBe(false);
    expect(
      verifyWhatsAppSignature(
        BODY,
        sign(BODY).replace("sha256=", "sha1="),
        SECRET,
      ),
    ).toBe(false);
    expect(verifyWhatsAppSignature(BODY, "sha256=abcd", SECRET)).toBe(false);
  });

  it("saknad signatur eller saknad hemlighet → false", () => {
    expect(verifyWhatsAppSignature(BODY, null, SECRET)).toBe(false);
    expect(verifyWhatsAppSignature(BODY, undefined, SECRET)).toBe(false);
    expect(verifyWhatsAppSignature(BODY, "", SECRET)).toBe(false);
    expect(verifyWhatsAppSignature(BODY, sign(BODY, ""), "")).toBe(false);
  });
});

describe("safeTokenEqual", () => {
  it("lika/olika/olika längd", () => {
    expect(safeTokenEqual("abc", "abc")).toBe(true);
    expect(safeTokenEqual("abc", "abd")).toBe(false);
    expect(safeTokenEqual("abc", "abcd")).toBe(false);
  });
});
