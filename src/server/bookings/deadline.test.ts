import { describe, expect, it } from "vitest";

import {
  fromLocal,
  SANTIAGO,
  type LocalDate,
  type LocalTime,
} from "@/lib/format/dates";

import { isRequestExpired, requestDeadline } from "./deadline";

const H = 3_600_000;
const at = (date: string, time: string) =>
  fromLocal(date as LocalDate, time as LocalTime, SANTIAGO).getTime();

describe("requestDeadline (WP-45: 24 h efter förfrågan, senast 2 h före start)", () => {
  it("långt fram: 24 h efter created_at gäller", () => {
    const created = at("2026-10-01", "09:00");
    const start = at("2026-10-06", "11:00");
    expect(requestDeadline(created, start)).toBe(created + 24 * H);
  });

  it("nära start: 2 h före start gäller", () => {
    const created = at("2026-10-01", "09:00");
    const start = at("2026-10-01", "15:00");
    expect(requestDeadline(created, start)).toBe(start - 2 * H);
  });

  it("gränsen är inräknad: exakt på deadline = utgången, 1 ms före = inte", () => {
    const created = at("2026-10-01", "09:00");
    const start = at("2026-10-06", "11:00");
    const d = requestDeadline(created, start);
    expect(isRequestExpired(created, start, new Date(d))).toBe(true);
    expect(isRequestExpired(created, start, new Date(d - 1))).toBe(false);
  });

  it("sommartid börjar (CL 2026-09-06, 23 h-dag): 2 h före 01:00 är 22:00 dagen före, inte 23:00", () => {
    const start = at("2026-09-06", "01:00"); // första timmen efter bytet (-03)
    const d = requestDeadline(start - 10 * H, start);
    expect(new Date(d).toISOString()).toBe("2026-09-06T02:00:00.000Z");
    expect(d).toBe(at("2026-09-05", "22:00"));
  });
});

describe("sen förfrågan (start < 2 h efter created_at)", () => {
  it("gäller fram till starttiden", () => {
    const created = Date.UTC(2026, 9, 1, 12, 0);
    const start = created + 60 * 60 * 1000;
    expect(requestDeadline(created, start)).toBe(start);
    expect(isRequestExpired(created, start, new Date(created + 1000))).toBe(
      false,
    );
    expect(isRequestExpired(created, start, new Date(start))).toBe(true);
  });
});
