import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

import { SANTIAGO, parseInstant } from "@/lib/format/dates";

import {
  EVENT_GAP_PX,
  GUTTER_PX,
  HOUR_PX,
  eventBox,
  gridHours,
  initialScrollHour,
  nowTop,
  showAvatar,
  showTime,
} from "./geometry";

function instant(iso: string): Date {
  const r = parseInstant(iso);
  if (!r.ok) throw new Error(`instant de test invalide: ${iso}`);
  return r.value;
}

const DAY = "2026-10-02"; // viernes, verano (−03)

describe("eventBox", () => {
  it("11:30 + 35 min → top 161, höjd ≈ 50,83, showTime = sant", () => {
    const box = eventBox(
      instant(`${DAY}T11:30:00-03:00`),
      instant(`${DAY}T12:05:00-03:00`),
      10,
      SANTIAGO,
    );
    expect(box.top).toBe(161);
    expect(box.height).toBeCloseTo(50.833, 2);
    expect(showTime(box.height)).toBe(true);
  });

  it("10:00 + 20 min → höjd ≈ 27,33, ingen tid", () => {
    const box = eventBox(
      instant(`${DAY}T10:00:00-03:00`),
      instant(`${DAY}T10:20:00-03:00`),
      10,
      SANTIAGO,
    );
    expect(box.height).toBeCloseTo(27.333, 2);
    expect(showTime(box.height)).toBe(false);
  });

  it("12:15 + 50 min → top 231,5", () => {
    const box = eventBox(
      instant(`${DAY}T12:15:00-03:00`),
      instant(`${DAY}T13:05:00-03:00`),
      10,
      SANTIAGO,
    );
    expect(box.top).toBe(231.5);
  });

  it("65 min → showAvatar", () => {
    const box = eventBox(
      instant(`${DAY}T10:00:00-03:00`),
      instant(`${DAY}T11:05:00-03:00`),
      10,
      SANTIAGO,
    );
    expect(box.height).toBeCloseTo(97.833, 2);
    expect(showAvatar(box.height)).toBe(true);
  });

  it("höjden dras med EVENT_GAP_PX (4)", () => {
    expect(EVENT_GAP_PX).toBe(4);
  });
});

describe("nowTop", () => {
  it("12:40 → ≈ 270,67", () => {
    const top = nowTop(instant(`${DAY}T12:40:00-03:00`), 10, 17, SANTIAGO);
    expect(top).not.toBeNull();
    expect(top).toBeCloseTo(270.667, 2);
  });

  it("null utanför fönstret", () => {
    expect(
      nowTop(instant(`${DAY}T08:00:00-03:00`), 10, 17, SANTIAGO),
    ).toBeNull();
    expect(
      nowTop(instant(`${DAY}T18:00:00-03:00`), 10, 17, SANTIAGO),
    ).toBeNull();
  });
});

describe("HOUR_PX/GUTTER_PX matchar tokens.css", () => {
  it("--agenda-hour: 94px, --agenda-gutter: 64px", () => {
    const css = readFileSync(
      join(__dirname, "../../styles/tokens.css"),
      "utf8",
    );
    expect(css).toMatch(/--agenda-hour:\s*94px/);
    expect(css).toMatch(/--agenda-gutter:\s*64px/);
    expect(HOUR_PX).toBe(94);
    expect(GUTTER_PX).toBe(64);
  });
});

describe("gridHours", () => {
  it("tidigaste öppning till senaste stängning i veckan, avrundat till hela timmar", () => {
    const hours = {
      1: [{ open: "10:00" as never, close: "17:00" as never }],
      2: [{ open: "09:00" as never, close: "18:30" as never }],
    };
    const week = [
      "2026-09-28",
      "2026-09-29",
      "2026-09-30",
      "2026-10-01",
      "2026-10-02",
      "2026-10-03",
      "2026-10-04",
    ] as never[];
    expect(gridHours(hours, week)).toEqual({ startHour: 9, endHour: 19 });
  });

  it("ingen öppettid alls → hela dygnet", () => {
    expect(gridHours({}, ["2026-10-04" as never])).toEqual({
      startHour: 0,
      endHour: 24,
    });
  });
});

describe("initialScrollHour", () => {
  it("idag syns: nu − 1 h (12:40 → 11,67)", () => {
    const h = initialScrollHour(
      instant(`${DAY}T12:40:00-03:00`),
      10,
      SANTIAGO,
      true,
    );
    expect(h).toBeCloseTo(11.667, 2);
  });

  it("idag syns men nu − 1 h < öppningen: öppningen", () => {
    const h = initialScrollHour(
      instant(`${DAY}T10:20:00-03:00`),
      10,
      SANTIAGO,
      true,
    );
    expect(h).toBe(10);
  });

  it("idag syns inte: öppningen", () => {
    const h = initialScrollHour(
      instant(`${DAY}T12:40:00-03:00`),
      10,
      SANTIAGO,
      false,
    );
    expect(h).toBe(10);
  });
});

describe("sommartid: top räknas på väggtid, inte på UTC-diff", () => {
  it("en bokning söndag 6 sep 2026 10:00 (redan −03) får top 20", () => {
    const box = eventBox(
      instant("2026-09-06T10:00:00-03:00"),
      instant("2026-09-06T10:35:00-03:00"),
      10,
      SANTIAGO,
    );
    expect(box.top).toBe(20);
  });
});
