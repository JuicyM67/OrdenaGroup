import "server-only";

import { err, ok, type ParseResult } from "@/lib/format/result";

import type { DayInput } from "../types";
import {
  allSlotsForDay,
  customerDateRange,
  eligibleStaff,
  needMs,
  staffOrder,
} from "./slots";
import { toLocalDate } from "@/lib/format/dates";
import { availableWindows, freeWindows } from "./windows";

export type StartError =
  "outside_hours" | "too_soon" | "too_far" | "slot_taken";

const MIN = 60_000;

/**
 * Räknar om en önskad starttid (inv. 6): klientens val är bara en önskan.
 * Returnerar de profesionales som kan ta tiden, i tilldelningsordning.
 *
 * - Kund: `too_far` (lokalt datum efter horisonten), `too_soon` (före
 *   now + min_notice), och starten måste vara en kandidat (rutnät eller
 *   fritt fönsters start) före gallringen.
 * - Ägare: ingen notice/horisont; valfri hel minut där behovet ryms.
 * - `slot_taken` om tiden ryms i arbetstiden men krockar med en bokning,
 *   annars `outside_hours`.
 *
 * `input.date` ignoreras; datumet är starttidens lokala datum.
 */
export function checkStart(
  input: DayInput,
  start: number,
): ParseResult<string[], StartError> {
  const s = input.snapshot;
  const date = toLocalDate(new Date(start), s.tz);
  const day: DayInput = { ...input, date };

  if (input.audience === "customer") {
    const { horizon } = customerDateRange(input.now, s.tz, s.maxDaysAhead);
    if (date > horizon) return err("too_far");
    if (start < input.now.getTime() + s.minNoticeMinutes * MIN) {
      return err("too_soon");
    }
  }
  if (start % MIN !== 0) return err("outside_hours");

  const staff = eligibleStaff(s, input.staff);
  const need = needMs(s);
  const contains = (w: { start: number; end: number }) =>
    w.start <= start && start + need <= w.end;
  const fits = staff.filter((st) =>
    freeWindows(s, st, date, input.excludeBookingId).some(contains),
  );

  if (input.audience === "customer") {
    const c = allSlotsForDay(day).find((x) => x.start === start);
    if (c) return ok(c.staffIds);
    if (fits.length > 0) return err("outside_hours"); // utanför rutnätet
  } else if (fits.length > 0) {
    const order = staffOrder(day, staff);
    return ok(
      fits.map((st) => st.id).sort((a, b) => order.get(a)! - order.get(b)!),
    );
  }

  const inHours = staff.some((st) =>
    availableWindows(s, st, date).some(contains),
  );
  return err(inHours ? "slot_taken" : "outside_hours");
}
