import { describe, expect, it } from "vitest";

import {
  addLocalDays,
  isoWeekdayOf,
  toLocalDate,
  type IsoWeekday,
  type LocalDate,
  type LocalTime,
} from "@/lib/format/dates";

import { d, nowAt, norte } from "../__fixtures__/snapshot";
import {
  BLOCKING_STATUSES,
  type Audience,
  type BookingStatus,
  type DayInput,
  type HoursRow,
  type ScheduleSnapshot,
  type SnapshotStaff,
} from "../types";
import { allSlotsForDay, slotsForDay } from "./slots";
import { checkStart } from "./validate";
import { hoursToIntervals, freeWindows, workingWindows } from "./windows";

/** mulberry32: liten seedad PRNG, inget nytt beroende. */
function prng(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const MIN = 60_000;
const hhmm = (m: number) =>
  `${String(Math.floor(m / 60)).padStart(2, "0")}:${String(m % 60).padStart(2, "0")}` as LocalTime;

// Datum kring sommartidsbytena och vanliga dagar.
const DATES = [
  "2026-04-03",
  "2026-04-04",
  "2026-04-05",
  "2026-09-05",
  "2026-09-06",
  "2026-09-07",
  "2026-10-06",
  "2027-04-03",
  "2027-09-05",
];
const STATUSES: BookingStatus[] = [
  "pending_payment",
  "confirmed",
  "completed",
  "no_show",
  "cancelled",
];

function randomRows(r: () => number, weekday: IsoWeekday): HoursRow[] {
  const rows: HoursRow[] = [];
  let cursor = Math.floor(r() * 16) * 30; // 00:00–07:30
  const n = 1 + Math.floor(r() * 2);
  for (let i = 0; i < n && cursor < 24 * 60; i++) {
    const start = cursor;
    const end = Math.min(24 * 60, start + 30 * (1 + Math.floor(r() * 20)));
    rows.push({ weekday, start: hhmm(start), end: hhmm(end) });
    cursor = end + 30 * Math.floor(r() * 4);
  }
  return rows;
}

function randomSnapshot(
  r: () => number,
  date: LocalDate,
): { snapshot: ScheduleSnapshot; audience: Audience; now: Date } {
  const dayWeekday = isoWeekdayOf(date);
  const staffCount = 1 + Math.floor(r() * 3);
  const staff: SnapshotStaff[] = Array.from({ length: staffCount }, (_, i) => ({
    id: `s-${i}`,
    sort: Math.floor(r() * 3),
    active: r() > 0.1,
    offersService: r() > 0.1,
    hours: r() < 0.4 ? null : randomRows(r, dayWeekday),
  }));
  const dayStart = nowAt(date, "00:00").getTime();
  const timeOff = Array.from({ length: Math.floor(r() * 3) }, () => {
    const start = dayStart + Math.floor(r() * 48) * 30 * MIN - 2 * 3600_000;
    return {
      staffId: r() < 0.3 ? null : `s-${Math.floor(r() * staffCount)}`,
      start,
      end: start + (15 + Math.floor(r() * 12) * 15) * MIN,
    };
  });
  const bookings = Array.from({ length: Math.floor(r() * 6) }, (_, i) => {
    const start = dayStart + Math.floor(r() * 96) * 15 * MIN;
    return {
      id: `b-${i}`,
      staffId: `s-${Math.floor(r() * staffCount)}`,
      start,
      blockedEnd: start + (10 + Math.floor(r() * 20) * 5) * MIN,
      status: STATUSES[Math.floor(r() * STATUSES.length)]!,
    };
  });
  const snapshot = norte({
    minNoticeMinutes: [0, 30, 60, 120, 1440][Math.floor(r() * 5)]!,
    maxDaysAhead: 1 + Math.floor(r() * 5),
    slotIntervalMinutes: [5, 10, 15, 20, 30, 60][Math.floor(r() * 6)]!,
    businessHours: randomRows(r, dayWeekday),
    staff,
    service: {
      durationMin: 10 + Math.floor(r() * 23) * 5,
      bufferAfterMin: [0, 0, 5, 10, 15][Math.floor(r() * 5)]!,
    },
    shortestServiceMin: 10 + Math.floor(r() * 6) * 5,
    timeOff,
    bookings,
  });
  const now = new Date(dayStart + Math.floor((r() * 6 - 3) * 24 * 60) * MIN);
  return { snapshot, audience: r() < 0.6 ? "customer" : "owner", now };
}

const overlaps = (a0: number, a1: number, b0: number, b1: number) =>
  a0 < b1 && b0 < a1;

describe("invarianter över 500 slumpade ögonblicksbilder", () => {
  it("varje slot respekterar alla lager, notice, horisont och rutnät", () => {
    const r = prng(20260927);
    let slotsChecked = 0;
    for (let n = 0; n < 500; n++) {
      const date = d(DATES[Math.floor(r() * DATES.length)]!);
      const { snapshot: s, audience, now } = randomSnapshot(r, date);
      const staffChoice =
        r() < 0.5 ? "any" : `s-${Math.floor(r() * s.staff.length)}`;
      const input: DayInput = {
        snapshot: s,
        date,
        staff: staffChoice,
        audience,
        now,
      };
      const need = (s.service.durationMin + s.service.bufferAfterMin) * MIN;
      const today = toLocalDate(now, s.tz);
      const horizon = addLocalDays(today, s.maxDaysAhead);

      const all = allSlotsForDay(input);
      const shown = slotsForDay(
        input,
        audience === "customer" ? 12 : undefined,
      );
      expect(shown.length).toBeLessThanOrEqual(
        audience === "customer" ? 12 : Infinity,
      );
      const allStarts = new Set(all.map((c) => c.start));
      for (const sl of shown)
        expect(allStarts.has(Date.parse(sl.start))).toBe(true);

      for (const c of all) {
        slotsChecked++;
        const start = c.start;
        expect(toLocalDate(new Date(start), s.tz)).toBe(date);
        expect(c.staffIds.length).toBeGreaterThan(0);
        expect(new Set(c.staffIds).size).toBe(c.staffIds.length);
        if (audience === "customer") {
          expect(start).toBeGreaterThanOrEqual(
            now.getTime() + s.minNoticeMinutes * MIN,
          );
          expect(date <= horizon && date >= today).toBe(true);
        }
        for (const id of c.staffIds) {
          const st = s.staff.find((x) => x.id === id)!;
          expect(st.active && st.offersService).toBe(true);
          if (staffChoice !== "any") expect(id).toBe(staffChoice);
          // Inom business_hours ∩ staff_hours (personal vidgar aldrig).
          const biz = hoursToIntervals(s.businessHours, date, s.tz);
          expect(
            biz.some((w) => w.start <= start && start + need <= w.end),
          ).toBe(true);
          if (st.hours) {
            const own = hoursToIntervals(st.hours, date, s.tz);
            expect(
              own.some((w) => w.start <= start && start + need <= w.end),
            ).toBe(true);
          }
          // Ingen frånvaro och ingen aktiv blocked överlappar [start, start + behov).
          for (const t of s.timeOff) {
            if (t.staffId === null || t.staffId === id) {
              expect(overlaps(start, start + need, t.start, t.end)).toBe(false);
            }
          }
          for (const b of s.bookings) {
            if (b.staffId === id && BLOCKING_STATUSES.includes(b.status)) {
              expect(overlaps(start, start + need, b.start, b.blockedEnd)).toBe(
                false,
              );
            }
          }
          // På rutnätet från ett arbetsfönsters start, eller ett fritt fönsters start.
          const onGrid = workingWindows(s, st, date).some(
            (w) =>
              start >= w.start &&
              (start - w.start) % (s.slotIntervalMinutes * MIN) === 0,
          );
          const atFreeStart = freeWindows(s, st, date).some(
            (w) => w.start === start,
          );
          expect(onGrid || atFreeStart).toBe(true);
        }
        // createBooking godtar varje kandidat (före gallring).
        const check = checkStart(input, start);
        expect(check.ok).toBe(true);
        if (check.ok && audience === "customer") {
          expect(check.value).toEqual(c.staffIds);
        } else if (check.ok) {
          // Ägaren får valfri minut: fler profesionales kan rymma tiden än de
          // som har den på sitt rutnät.
          expect(check.value).toEqual(expect.arrayContaining(c.staffIds));
        }
      }
    }
    expect(slotsChecked).toBeGreaterThan(1000);
    // CPU-tungt (500 ögonblicksbilder); egen gräns så att en belastad
    // maskin (parallella agenter, CI) inte ger falskt fel.
  }, 30_000);
});
