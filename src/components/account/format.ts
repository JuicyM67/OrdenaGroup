// WP-67: datum/tid för kundkontot i FÖRETAGETS tidszon (D-017/D-018, `dates.ts`).
import {
  APP_TZ,
  formatDate,
  formatTime,
  parseTimeZone,
  toLocalDate,
  type TimeZone,
} from "@/lib/format/dates";

export function tzOf(raw: string): TimeZone {
  const r = parseTimeZone(raw);
  return r.ok ? r.value : APP_TZ;
}

/** "TOR" + "16" (datumrutan på kortet "Nästa bokning"). */
export function datePill(iso: string, tz: string): { wd: string; day: string } {
  const d = new Date(iso);
  const zone = tzOf(tz);
  const wd = formatDate(d, zone, "weekdayShort").toUpperCase();
  const day = String(Number(toLocalDate(d, zone).slice(8, 10)));
  return { wd, day };
}

/** "Vie 2 oct · 14:30". */
export function dateTimeShort(iso: string, tz: string): string {
  const d = new Date(iso);
  const zone = tzOf(tz);
  return `${formatDate(d, zone, "weekdayDayMonthShort")} · ${formatTime(d, zone)}`;
}

export function timeOf(iso: string, tz: string): string {
  return formatTime(new Date(iso), tzOf(tz));
}

export function dayMonthOf(iso: string, tz: string): string {
  return formatDate(new Date(iso), tzOf(tz), "dayMonthLong");
}
