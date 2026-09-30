import { describe, expect, it } from "vitest";

import { firstForwardedIp, hashRateLimitSubject } from "./rate-limit";

describe("hashRateLimitSubject", () => {
  it("är deterministisk och aldrig klartext", () => {
    const h1 = hashRateLimitSubject("+56912345678");
    const h2 = hashRateLimitSubject("+56912345678");
    expect(h1).toBe(h2);
    expect(h1).not.toContain("+56912345678");
    // SHA-256 hex: 64 tecken.
    expect(h1).toMatch(/^[0-9a-f]{64}$/);
  });

  it("olika ämnen ger olika hash", () => {
    expect(hashRateLimitSubject("a")).not.toBe(hashRateLimitSubject("b"));
  });
});

describe("firstForwardedIp", () => {
  it("tar det första värdet i en kommaseparerad lista", () => {
    expect(firstForwardedIp("1.2.3.4, 5.6.7.8")).toBe("1.2.3.4");
    expect(firstForwardedIp("1.2.3.4")).toBe("1.2.3.4");
  });

  it("trimmar mellanslag", () => {
    expect(firstForwardedIp("  1.2.3.4  ,5.6.7.8")).toBe("1.2.3.4");
  });

  it("null eller tomt → \"unknown\"", () => {
    expect(firstForwardedIp(null)).toBe("unknown");
    expect(firstForwardedIp("")).toBe("unknown");
    expect(firstForwardedIp(" , 5.6.7.8")).toBe("unknown");
  });
});
