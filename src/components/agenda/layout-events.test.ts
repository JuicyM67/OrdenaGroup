import { describe, expect, it } from "vitest";

import { layoutLanes, mergeCommonBlocks } from "./layout-events";

function t(hhmm: string): Date {
  return new Date(`2026-10-02T${hhmm}:00-03:00`);
}

describe("layoutLanes", () => {
  it("två profesionales samtidigt → 2 lanes", () => {
    const result = layoutLanes([
      { id: "a", start: t("10:00"), end: t("10:35") },
      { id: "b", start: t("10:10"), end: t("10:45") },
    ]);
    const byId = Object.fromEntries(result.map((r) => [r.id, r]));
    expect(byId.a?.lanes).toBe(2);
    expect(byId.b?.lanes).toBe(2);
    expect(byId.a?.lane).not.toBe(byId.b?.lane);
  });

  it("tre som delvis överlappar → korrekt klustring (2 spår räcker, inte 3)", () => {
    const result = layoutLanes([
      { id: "a", start: t("10:00"), end: t("11:00") },
      { id: "b", start: t("10:30"), end: t("11:30") },
      { id: "c", start: t("11:15"), end: t("12:00") },
    ]);
    const byId = Object.fromEntries(result.map((r) => [r.id, r]));
    expect(byId.a?.lanes).toBe(2);
    expect(byId.b?.lanes).toBe(2);
    expect(byId.c?.lanes).toBe(2);
    // a och c kan dela spår (de överlappar inte varandra i tid).
    expect(byId.a?.lane).toBe(byId.c?.lane);
    expect(byId.b?.lane).not.toBe(byId.a?.lane);
  });

  it("bokningar kant i kant → 1 lane", () => {
    const result = layoutLanes([
      { id: "a", start: t("10:00"), end: t("11:00") },
      { id: "b", start: t("11:00"), end: t("12:00") },
    ]);
    for (const r of result) {
      expect(r.lane).toBe(0);
      expect(r.lanes).toBe(1);
    }
  });

  it("en ensam bokning påverkas inte av en klunga långt bort i tiden", () => {
    const result = layoutLanes([
      { id: "solo", start: t("08:00"), end: t("08:30") },
      { id: "a", start: t("10:00"), end: t("10:35") },
      { id: "b", start: t("10:10"), end: t("10:45") },
    ]);
    const solo = result.find((r) => r.id === "solo");
    expect(solo?.lanes).toBe(1);
  });
});

describe("mergeCommonBlocks", () => {
  const visible = ["staff-1", "staff-2", "staff-3"];

  it("lunch för alla tre → ett sammanslaget block", () => {
    const result = mergeCommonBlocks(
      [
        {
          staffId: "staff-1",
          start: t("13:30"),
          end: t("14:30"),
          kind: "lunch",
        },
        {
          staffId: "staff-2",
          start: t("13:30"),
          end: t("14:30"),
          kind: "lunch",
        },
        {
          staffId: "staff-3",
          start: t("13:30"),
          end: t("14:30"),
          kind: "lunch",
        },
      ],
      visible,
    );
    expect(result).toHaveLength(1);
    expect([...(result[0]?.staffIds ?? [])].sort()).toEqual(
      ["staff-1", "staff-2", "staff-3"].sort(),
    );
  });

  it("lunch för två av tre → separata block", () => {
    const result = mergeCommonBlocks(
      [
        {
          staffId: "staff-1",
          start: t("13:30"),
          end: t("14:30"),
          kind: "lunch",
        },
        {
          staffId: "staff-2",
          start: t("13:30"),
          end: t("14:30"),
          kind: "lunch",
        },
      ],
      visible,
    );
    expect(result).toHaveLength(2);
    for (const r of result) expect(r.staffIds).toHaveLength(1);
  });

  it("block med olika intervall slås aldrig ihop (ingen grupp täcker alla tre)", () => {
    const result = mergeCommonBlocks(
      [
        {
          staffId: "staff-1",
          start: t("13:30"),
          end: t("14:30"),
          kind: "lunch",
        },
        {
          staffId: "staff-2",
          start: t("14:00"),
          end: t("15:00"),
          kind: "lunch",
        },
        {
          staffId: "staff-3",
          start: t("13:30"),
          end: t("14:30"),
          kind: "lunch",
        },
      ],
      visible,
    );
    expect(result).toHaveLength(3);
    for (const r of result) expect(r.staffIds).toHaveLength(1);
  });

  it("ignorerar block för profesionales som inte är synliga", () => {
    const result = mergeCommonBlocks(
      [
        {
          staffId: "staff-1",
          start: t("13:30"),
          end: t("14:30"),
          kind: "lunch",
        },
        {
          staffId: "staff-9",
          start: t("13:30"),
          end: t("14:30"),
          kind: "lunch",
        },
      ],
      ["staff-1"],
    );
    expect(result).toHaveLength(1);
    expect(result[0]?.staffIds).toEqual(["staff-1"]);
  });
});
