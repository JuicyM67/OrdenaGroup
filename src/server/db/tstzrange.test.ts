import { describe, expect, it } from "vitest";

import { parseTstzrange, toTstzrange } from "./tstzrange";

const ms = (s: string) => Date.parse(s);

describe("toTstzrange", () => {
  it("halvöppet intervall med ISO-instanter i UTC", () => {
    expect(
      toTstzrange({
        start: ms("2026-10-02T14:30:00Z"),
        end: ms("2026-10-02T15:05:00Z"),
      }),
    ).toBe("[2026-10-02T14:30:00.000Z,2026-10-02T15:05:00.000Z)");
  });

  it("avvisar tomma, omvända och ogiltiga intervall", () => {
    const a = ms("2026-10-02T14:30:00Z");
    expect(() => toTstzrange({ start: a, end: a })).toThrow(RangeError);
    expect(() => toTstzrange({ start: a, end: a - 1 })).toThrow(RangeError);
    expect(() => toTstzrange({ start: Number.NaN, end: a })).toThrow(
      RangeError,
    );
    expect(() =>
      toTstzrange({ start: a, end: Number.POSITIVE_INFINITY }),
    ).toThrow(RangeError);
  });
});

describe("parseTstzrange", () => {
  it("rundtur", () => {
    const i = {
      start: ms("2026-10-02T14:30:00Z"),
      end: ms("2026-10-02T15:05:00Z"),
    };
    expect(parseTstzrange(toTstzrange(i))).toEqual(i);
  });

  it("Postgres textform med citattecken och +00", () => {
    expect(
      parseTstzrange('["2026-10-02 14:30:00+00","2026-10-02 15:05:00+00")'),
    ).toEqual({
      start: ms("2026-10-02T14:30:00Z"),
      end: ms("2026-10-02T15:05:00Z"),
    });
  });

  it("Postgres textform med annan sessionstidszon (-03) och bråkdelar", () => {
    expect(
      parseTstzrange('["2026-10-02 11:30:00.5-03","2026-10-02 12:05:00-03")'),
    ).toEqual({
      start: ms("2026-10-02T14:30:00.500Z"),
      end: ms("2026-10-02T15:05:00Z"),
    });
  });

  it.each([
    ["slutet", "[2026-10-02T14:30:00Z,2026-10-02T15:05:00Z]"],
    ["öppet start", "(2026-10-02T14:30:00Z,2026-10-02T15:05:00Z)"],
    ["obegränsat slut", '["2026-10-02 14:30:00+00",)'],
    ["obegränsad start", '(,"2026-10-02 14:30:00+00")'],
    ["empty", "empty"],
    ["utan offset", "[2026-10-02T14:30:00,2026-10-02T15:05:00)"],
    ["omvänt", "[2026-10-02T15:05:00Z,2026-10-02T14:30:00Z)"],
    ["tomt intervall", "[2026-10-02T15:05:00Z,2026-10-02T15:05:00Z)"],
    ["skräp", "hola"],
  ])("avvisar %s", (_name, s) => {
    expect(() => parseTstzrange(s)).toThrow(RangeError);
  });
});
