import { createHash } from "node:crypto";

import { describe, expect, it } from "vitest";

import { createManageToken, hashManageToken } from "./token";

describe("kundens länk-token (FRÅGA 9)", () => {
  it("43 tecken base64url (32 slumpbyte)", () => {
    const { token } = createManageToken();
    expect(token).toMatch(/^[A-Za-z0-9_-]{43}$/);
    expect(Buffer.from(token, "base64url")).toHaveLength(32);
  });

  it("hashen är 32 byte SHA-256 av token", () => {
    const { token, hash } = createManageToken();
    expect(hash).toHaveLength(32);
    expect(hash.equals(createHash("sha256").update(token).digest())).toBe(true);
    expect(hashManageToken(token).equals(hash)).toBe(true);
  });

  it("två token skiljer sig", () => {
    expect(createManageToken().token).not.toBe(createManageToken().token);
  });
});
