import "server-only";

import {
  addLocalDays,
  toLocalDate,
  toWallClock,
  type LocalDate,
  type TimeZone,
} from "@/lib/format/dates";

import {
  ANY_STAFF,
  type AvailableSlot,
  type DayInput,
  type DayStatus,
  type ScheduleSnapshot,
  type SnapshotStaff,
  type StaffChoice,
} from "../types";
import { assignmentOrder, bookingsPerStaffOnDay } from "./assign";
import type { Interval } from "./intervals";
import { availableWindows, freeWindows, workingWindows } from "./windows";

const MIN = 60_000;

/** En starttid med de profesionales som är lediga då (tilldelningsordning). */
export type Candidate = {
  start: number;
  staffIds: string[];
  /** Lämnar ingen lucka kortare än kortaste tjänsten (gallring). */
  good: boolean;
};

/**
 * Starttider i ett fritt fönster: rutnätet `gridOrigin + k · intervall`
 * (arbetsfönstrets start, verklig tid) plus fönstrets egen start, avrundad
 * uppåt till hel minut ("tight packing" direkt efter en bokning, frånvaro
 * eller buffert). Bara starter där
 * `[start, start + need)` ryms i fönstret.
 */
export function candidateStarts(
  win: Interval,
  gridOrigin: number,
  intervalMin: number,
  needMs: number,
): number[] {
  const step = intervalMin * MIN;
  // Ett fritt fönster kan börja mitt i en minut (frånvaro eller bokning som
  // slutar 14:30:30). Starttider är alltid hela minuter: avrunda uppåt.
  const first = Math.ceil(win.start / MIN) * MIN;
  const lastStart = win.end - needMs;
  if (lastStart < first) return [];
  const out: number[] = [first];
  const k = Math.ceil((first - gridOrigin) / step);
  for (let s = gridOrigin + Math.max(0, k) * step; s <= lastStart; s += step) {
    if (s > first) out.push(s);
  }
  return out;
}

/** [idag, idag + max_days_ahead] i företagets lokala kalenderdagar. */
export function customerDateRange(
  now: Date,
  tz: TimeZone,
  maxDaysAhead: number,
): { today: LocalDate; horizon: LocalDate } {
  const today = toLocalDate(now, tz);
  return { today, horizon: addLocalDays(today, maxDaysAhead) };
}

export function eligibleStaff(
  snapshot: ScheduleSnapshot,
  choice: StaffChoice,
): SnapshotStaff[] {
  return snapshot.staff.filter(
    (s) =>
      s.active && s.offersService && (choice === ANY_STAFF || s.id === choice),
  );
}

export function needMs(snapshot: ScheduleSnapshot): number {
  return (snapshot.service.durationMin + snapshot.service.bufferAfterMin) * MIN;
}

function outsideCustomerRange(input: DayInput): boolean {
  if (input.audience !== "customer") return false;
  const { today, horizon } = customerDateRange(
    input.now,
    input.snapshot.tz,
    input.snapshot.maxDaysAhead,
  );
  return input.date < today || input.date > horizon;
}

/** Tilldelningsordning för dagen ("Cualquiera"). */
export function staffOrder(
  input: DayInput,
  staff: readonly SnapshotStaff[],
): Map<string, number> {
  const counts = bookingsPerStaffOnDay(
    input.snapshot,
    input.date,
    input.excludeBookingId,
  );
  const order = assignmentOrder(
    staff.map((s) => ({
      id: s.id,
      sort: s.sort,
      bookingsThatDay: counts.get(s.id) ?? 0,
    })),
  );
  return new Map(order.map((id, i) => [id, i]));
}

function staffCandidates(
  input: DayInput,
  st: SnapshotStaff,
): { start: number; good: boolean }[] {
  const s = input.snapshot;
  const need = needMs(s);
  const shortest = s.shortestServiceMin * MIN;
  const gapOk = (g: number) => g === 0 || g >= shortest;
  const earliest =
    input.audience === "customer"
      ? input.now.getTime() + s.minNoticeMinutes * MIN
      : Number.NEGATIVE_INFINITY;
  const working = workingWindows(s, st, input.date);
  const out: { start: number; good: boolean }[] = [];
  for (const free of freeWindows(s, st, input.date, input.excludeBookingId)) {
    const w = working.find((x) => x.start <= free.start && free.end <= x.end);
    if (!w) continue; // kan inte hända: fria fönster är delar av arbetsfönster
    for (const start of candidateStarts(
      free,
      w.start,
      s.slotIntervalMinutes,
      need,
    )) {
      if (start < earliest) continue;
      out.push({
        start,
        good:
          gapOk(start - Math.ceil(free.start / MIN) * MIN) &&
          gapOk(free.end - (start + need)),
      });
    }
  }
  return out;
}

/**
 * Alla giltiga starttider för dagen, före gallring (det `createBooking`
 * godtar för kund). Kund: notice och horisont (inv. 5). Ägare: inget av dem.
 */
export function allSlotsForDay(input: DayInput): Candidate[] {
  if (outsideCustomerRange(input)) return [];
  const staff = eligibleStaff(input.snapshot, input.staff);
  const order = staffOrder(input, staff);
  const byStart = new Map<number, { ids: string[]; good: boolean }>();
  for (const st of staff) {
    for (const c of staffCandidates(input, st)) {
      const e = byStart.get(c.start);
      if (e) {
        e.ids.push(st.id);
        e.good ||= c.good;
      } else {
        byStart.set(c.start, { ids: [st.id], good: c.good });
      }
    }
  }
  return [...byStart.entries()]
    .sort(([a], [b]) => a - b)
    .map(([start, e]) => ({
      start,
      good: e.good,
      staffIds: e.ids.sort((a, b) => order.get(a)! - order.get(b)!),
    }));
}

/** Jämnt fördelat i tid: närmaste oanvända kandidat för k mål. */
function spreadByTime(list: readonly Candidate[], k: number): Candidate[] {
  if (k <= 0) return [];
  if (list.length <= k) return [...list];
  if (k === 1) return [list[0]!];
  const first = list[0]!.start;
  const last = list[list.length - 1]!.start;
  const used = new Set<number>();
  for (let i = 0; i < k; i++) {
    const target = first + ((last - first) * i) / (k - 1);
    let best = -1;
    for (let j = 0; j < list.length; j++) {
      if (used.has(j)) continue;
      if (
        best === -1 ||
        Math.abs(list[j]!.start - target) < Math.abs(list[best]!.start - target)
      ) {
        best = j;
      }
    }
    used.add(best);
  }
  return [...used].sort((a, b) => a - b).map((j) => list[j]!);
}

/**
 * Gallring till `limit` (kund, R8): först tider som inte lämnar en lucka
 * kortare än kortaste tjänsten, jämnt fördelade i tid. Räcker de inte fylls
 * det på med de övriga, varje gång den som ligger längst från de valda.
 */
export function pickSlots(
  all: readonly Candidate[],
  limit: number,
): Candidate[] {
  if (all.length <= limit) return [...all];
  const good = all.filter((c) => c.good);
  if (good.length >= limit) return spreadByTime(good, limit);
  const chosen = [...good];
  const rest = all.filter((c) => !c.good);
  while (chosen.length < limit && rest.length > 0) {
    let bestIdx = 0;
    let bestDist = -1;
    for (let j = 0; j < rest.length; j++) {
      const dist =
        chosen.length === 0
          ? Number.POSITIVE_INFINITY
          : Math.min(...chosen.map((c) => Math.abs(c.start - rest[j]!.start)));
      if (dist > bestDist) {
        bestDist = dist;
        bestIdx = j;
      }
    }
    chosen.push(rest.splice(bestIdx, 1)[0]!);
  }
  return chosen.sort((a, b) => a.start - b.start);
}

function iso(ms: number): string {
  return new Date(ms).toISOString();
}

export function toAvailableSlot(
  c: Candidate,
  snapshot: ScheduleSnapshot,
): AvailableSlot {
  return {
    start: iso(c.start),
    time: toWallClock(new Date(c.start), snapshot.tz).time,
    end: iso(c.start + snapshot.service.durationMin * MIN),
    staffIds: c.staffIds,
  };
}

/** Tider att visa. `limit` utelämnad = alla (ägare). */
export function slotsForDay(input: DayInput, limit?: number): AvailableSlot[] {
  const all = allSlotsForDay(input);
  const picked = limit === undefined ? all : pickSlots(all, limit);
  return picked.map((c) => toAvailableSlot(c, input.snapshot));
}

export function dayStatus(input: DayInput): DayStatus {
  if (outsideCustomerRange(input)) return "closed";
  const staff = eligibleStaff(input.snapshot, input.staff);
  // En dag vars arbetstid redan har passerat (t.ex. idag på kvällen, med
  // minsta förvarning) är stängd för kunden — inte "full". Annars visas den
  // som fullbokad och erbjuder väntelista för tider som aldrig kan komma
  // (pilottestet 2026-10-01).
  const earliest =
    input.audience === "customer"
      ? input.now.getTime() +
        input.snapshot.minNoticeMinutes * MIN +
        needMs(input.snapshot)
      : Number.NEGATIVE_INFINITY;
  const anyWorking = staff.some((st) =>
    availableWindows(input.snapshot, st, input.date).some(
      (w) => w.end >= earliest,
    ),
  );
  if (!anyWorking) return "closed";
  return allSlotsForDay(input).length > 0 ? "available" : "full";
}
