import { createHash } from "node:crypto";

import { describe, expect, it } from "vitest";

import { createInvitationToken, hashInvitationToken } from "./token";

describe("inbjudningens länk-token (WP-46)", () => {
  it("43 tecken base64url (32 slumpbyte)", () => {
    const { token } = createInvitationToken();
    expect(token).toMatch(/^[A-Za-z0-9_-]{43}$/);
    expect(Buffer.from(token, "base64url")).toHaveLength(32);
  });

  it("hashen är 32 byte SHA-256 av token (samma algoritm som accept_invitation)", () => {
    const { token, hash } = createInvitationToken();
    expect(hash).toHaveLength(32);
    expect(hash.equals(createHash("sha256").update(token).digest())).toBe(true);
    expect(hashInvitationToken(token).equals(hash)).toBe(true);
  });

  it("två token skiljer sig", () => {
    expect(createInvitationToken().token).not.toBe(
      createInvitationToken().token,
    );
  });
});
