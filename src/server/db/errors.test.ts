import { describe, expect, it } from "vitest";

import { isNoOverlapViolation, pgErrorCode } from "./errors";

describe("isNoOverlapViolation", () => {
  it("23P01 på no_overlap", () => {
    expect(
      isNoOverlapViolation({ code: "23P01", constraint: "no_overlap" }),
    ).toBe(true);
  });

  it.each([
    [{ code: "23P01", constraint: "business_hours_no_overlap" }],
    [{ code: "23505", constraint: "no_overlap" }],
    [{ code: "23P01" }],
    [new Error("23P01 no_overlap")],
    [null],
    ["23P01"],
    [undefined],
  ])("inte för %j", (e) => {
    expect(isNoOverlapViolation(e)).toBe(false);
  });
});

describe("pgErrorCode", () => {
  it("läser SQLSTATE och inget annat", () => {
    expect(pgErrorCode({ code: "40001", detail: "Key (phone)=(+569…)" })).toBe(
      "40001",
    );
    expect(pgErrorCode({ code: 123 })).toBeUndefined();
    expect(pgErrorCode(new Error("x"))).toBeUndefined();
    expect(pgErrorCode({ code: "ECONNREFUSED" })).toBeUndefined();
  });
});
