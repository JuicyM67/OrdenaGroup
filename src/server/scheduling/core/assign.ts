import "server-only";

import { toLocalDate, type LocalDate } from "@/lib/format/dates";

import { BLOCKING_STATUSES, type ScheduleSnapshot } from "../types";

/**
 * "Cualquiera": ordningen som profesionales provas i vid bokning. Minst antal
 * aktiva bokningar den lokala dagen, sedan `sort`, sedan `id` (deterministiskt).
 */
export function assignmentOrder(
  staff: readonly { id: string; sort: number; bookingsThatDay: number }[],
): string[] {
  return [...staff]
    .sort(
      (a, b) =>
        a.bookingsThatDay - b.bookingsThatDay ||
        a.sort - b.sort ||
        (a.id < b.id ? -1 : a.id > b.id ? 1 : 0),
    )
    .map((s) => s.id);
}

/** Aktiva bokningar per profesional vars start ligger på den lokala dagen. */
export function bookingsPerStaffOnDay(
  snapshot: ScheduleSnapshot,
  date: LocalDate,
  excludeBookingId?: string,
): Map<string, number> {
  const counts = new Map<string, number>();
  for (const b of snapshot.bookings) {
    if (b.id === excludeBookingId || !BLOCKING_STATUSES.includes(b.status)) {
      continue;
    }
    if (toLocalDate(new Date(b.start), snapshot.tz) !== date) continue;
    counts.set(b.staffId, (counts.get(b.staffId) ?? 0) + 1);
  }
  return counts;
}
