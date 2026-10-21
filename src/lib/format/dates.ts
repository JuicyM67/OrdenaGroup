/**
 * Datum och tid: UTC-instanter, logik i företagets tidszon.
 *
 * D-017: lokal väggtid ↔ UTC konverteras bara här. Standardregeln för tider
 * som inte finns eller är tvetydiga är "compatible" (som Temporal/RFC 5545).
 *
 * Regler: rena funktioner, klockan injiceras av anroparen, bara `getUTC*`
 * och `Intl.DateTimeFormat` med explicit `timeZone` (inga lokala Date-metoder).
 */
import { marketConfig } from "@/config/market";

import { APP_LOCALE, calendarNames, type CalendarLocale } from "./calendar";
import { err, ok, type ParseResult } from "./result";

export type TimeZone = string & { readonly __brand: "TimeZone" };
/** "2026-10-02" */
export type LocalDate = string & { readonly __brand: "LocalDate" };
/**
 * "15:00". "24:00" bara som slut (öppettider) och bara med disambiguering
 * "compatible" (se `fromLocal`).
 */
export type LocalTime = string & { readonly __brand: "LocalTime" };
/** 1 = lunes … 7 = domingo, som `business_hours.weekday`. */
export type IsoWeekday = 1 | 2 | 3 | 4 | 5 | 6 | 7;
export type Disambiguation = "compatible" | "earlier" | "later";

/** Chiles tidszon. För tester/fixtures; logik använder `APP_TZ`. */
export const SANTIAGO = "America/Santiago" as TimeZone;

/**
 * Appens tidszon (`marketConfig.timeZone`, D-025). Används där företagets
 * egen `businesses.timezone` inte finns till hands.
 */
export const APP_TZ = marketConfig.timeZone as TimeZone;

export { APP_LOCALE, type CalendarLocale };

const MINUTE_MS = 60_000;
const DAY_MS = 86_400_000;
const MAX_EACH_DAYS = 400;

// ---------------------------------------------------------------------------
// Intl-delar (cachade per tidszon)
// ---------------------------------------------------------------------------

const formatterCache = new Map<string, Intl.DateTimeFormat>();

function partsFormatter(tz: string): Intl.DateTimeFormat {
  let f = formatterCache.get(tz);
  if (!f) {
    f = new Intl.DateTimeFormat("en-US", {
      timeZone: tz,
      hourCycle: "h23",
      numberingSystem: "latn",
      era: "short",
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
    });
    formatterCache.set(tz, f);
  }
  return f;
}

type WallFields = {
  year: number;
  month: number;
  day: number;
  hour: number;
  minute: number;
  second: number;
};

function wallFields(ms: number, tz: string): WallFields {
  const out: WallFields = {
    year: 0,
    month: 0,
    day: 0,
    hour: 0,
    minute: 0,
    second: 0,
  };
  let bc = false;
  for (const p of partsFormatter(tz).formatToParts(ms)) {
    if (p.type === "era") bc = p.value.startsWith("B");
    else if (p.type in out) out[p.type as keyof WallFields] = Number(p.value);
  }
  if (out.hour === 24) out.hour = 0; // äldre ICU kan ge "24" vid midnatt
  // Intl ger år 1 f.Kr. som "1" + era "BC"; räkna om till astronomiskt år (0).
  if (bc) out.year = 1 - out.year;
  return out;
}

function utcMsFromFields(
  year: number,
  month: number,
  day: number,
  hour = 0,
  minute = 0,
  second = 0,
): number {
  // setUTCFullYear undviker Date.UTC:s tolkning av år 0–99 som 1900-tal.
  const dt = new Date(0);
  dt.setUTCFullYear(year, month - 1, day);
  dt.setUTCHours(hour, minute, second, 0);
  return dt.getTime();
}

/** Väggtiden för en instant uttryckt som om den vore UTC (ms, hela sekunder). */
function wallMs(ms: number, tz: string): number {
  const f = wallFields(ms, tz);
  return utcMsFromFields(f.year, f.month, f.day, f.hour, f.minute, f.second);
}

function floorToSecond(ms: number): number {
  return Math.floor(ms / 1000) * 1000;
}

function offsetMs(ms: number, tz: string): number {
  const s = floorToSecond(ms);
  return wallMs(s, tz) - s;
}

function assertValidDate(instant: Date, fn: string): number {
  const ms = instant.getTime();
  if (Number.isNaN(ms)) throw new RangeError(`${fn}: ogiltig Date`);
  return ms;
}

// ---------------------------------------------------------------------------
// Parsning
// ---------------------------------------------------------------------------

const TZ_SHAPE = /^[A-Za-z][A-Za-z0-9_+-]*(?:\/[A-Za-z0-9_+-]+)*$/;

export function parseTimeZone(
  s: string,
): ParseResult<TimeZone, "invalid_time_zone"> {
  if (!TZ_SHAPE.test(s)) return err("invalid_time_zone");
  try {
    const resolved = new Intl.DateTimeFormat("en-US", {
      timeZone: s,
    }).resolvedOptions().timeZone;
    return ok(resolved as TimeZone);
  } catch {
    return err("invalid_time_zone");
  }
}

const DATE_SHAPE = /^(\d{4})-(\d{2})-(\d{2})$/;

/** Giltiga år för `LocalDate` (0001–9999, som Postgres `date` utan f.Kr.). */
const MIN_YEAR = 1;
const MAX_YEAR = 9999;

function daysInMonth(year: number, month: number): number {
  return new Date(utcMsFromFields(year, month + 1, 0)).getUTCDate();
}

function isValidYmd(year: number, month: number, day: number): boolean {
  return (
    year >= MIN_YEAR &&
    year <= MAX_YEAR &&
    month >= 1 &&
    month <= 12 &&
    day >= 1 &&
    day <= daysInMonth(year, month)
  );
}

export function parseLocalDate(
  s: string,
): ParseResult<LocalDate, "invalid_format" | "invalid_date"> {
  const m = DATE_SHAPE.exec(s);
  if (!m) return err("invalid_format");
  if (!isValidYmd(Number(m[1]), Number(m[2]), Number(m[3]))) {
    return err("invalid_date");
  }
  return ok(s as LocalDate);
}

const TIME_SHAPE = /^(\d{2}):(\d{2})(?::(\d{2}))?$/;

/** "HH:mm" eller Postgres "HH:mm:ss" (sekunder måste vara 00) → "HH:mm". */
export function parseLocalTime(
  s: string,
  opts?: { allowEndOfDay?: boolean },
): ParseResult<LocalTime, "invalid_format" | "out_of_range"> {
  const m = TIME_SHAPE.exec(s);
  if (!m) return err("invalid_format");
  const hh = Number(m[1]);
  const mm = Number(m[2]);
  const ss = m[3] === undefined ? 0 : Number(m[3]);
  if (mm > 59 || ss !== 0) return err("out_of_range");
  if (hh === 24) {
    if (mm !== 0 || !opts?.allowEndOfDay) return err("out_of_range");
  } else if (hh > 23) {
    return err("out_of_range");
  }
  return ok(`${m[1]}:${m[2]}` as LocalTime);
}

const INSTANT_SHAPE =
  /^(\d{4})-(\d{2})-(\d{2})(?:[Tt ](\d{2}):(\d{2})(?::(\d{2})(?:\.(\d{1,9}))?)?)?(Z|z|[+-]\d{2}(?::?\d{2})?)?$/;

/**
 * ISO 8601 eller Postgres-text med Z eller offset → Date. Strängar utan offset
 * avvisas, eftersom `new Date("2026-10-02T14:30")` tolkas i värdens tidszon.
 */
export function parseInstant(
  s: string,
): ParseResult<Date, "invalid_format" | "missing_offset"> {
  const m = INSTANT_SHAPE.exec(s);
  if (!m) return err("invalid_format");
  const [, y, mo, d, hh, mi, ss, frac, off] = m;
  if (hh === undefined) {
    return off === undefined ? err("missing_offset") : err("invalid_format");
  }
  if (off === undefined) return err("missing_offset");

  const year = Number(y);
  const month = Number(mo);
  const day = Number(d);
  const hour = Number(hh);
  const minute = Number(mi);
  const second = ss === undefined ? 0 : Number(ss);
  if (!isValidYmd(year, month, day) || hour > 23 || minute > 59 || second > 59)
    return err("invalid_format");

  let offsetMinutes = 0;
  if (off !== "Z" && off !== "z") {
    const sign = off.startsWith("-") ? -1 : 1;
    const digits = off.slice(1).replace(":", "");
    const oh = Number(digits.slice(0, 2));
    const om = digits.length > 2 ? Number(digits.slice(2, 4)) : 0;
    if (oh > 18 || om > 59) return err("invalid_format");
    offsetMinutes = sign * (oh * 60 + om);
  }
  const millis =
    frac === undefined ? 0 : Number(frac.slice(0, 3).padEnd(3, "0"));
  const ms =
    utcMsFromFields(year, month, day, hour, minute, second) +
    millis -
    offsetMinutes * MINUTE_MS;
  return ok(new Date(ms));
}

// ---------------------------------------------------------------------------
// UTC → lokal
// ---------------------------------------------------------------------------

const pad2 = (n: number) => String(n).padStart(2, "0");
const pad4 = (n: number) => String(n).padStart(4, "0");

function ymd(year: number, month: number, day: number): LocalDate {
  return `${pad4(year)}-${pad2(month)}-${pad2(day)}` as LocalDate;
}

function isoWeekdayFromUtcDay(utcDay: number): IsoWeekday {
  return (utcDay === 0 ? 7 : utcDay) as IsoWeekday;
}

/** Kastar `RangeError` om den lokala dagen hamnar utanför år 0001–9999. */
export function toWallClock(
  instant: Date,
  tz: TimeZone,
): {
  date: LocalDate;
  time: LocalTime;
  weekday: IsoWeekday;
  offsetMinutes: number;
} {
  const ms = floorToSecond(assertValidDate(instant, "toWallClock"));
  const f = wallFields(ms, tz);
  if (f.year < MIN_YEAR || f.year > MAX_YEAR) {
    throw new RangeError(`toWallClock: år ${f.year} utanför 0001–9999`);
  }
  const dayMs = utcMsFromFields(f.year, f.month, f.day);
  const wall = dayMs + (f.hour * 3600 + f.minute * 60 + f.second) * 1000;
  return {
    date: ymd(f.year, f.month, f.day),
    time: `${pad2(f.hour)}:${pad2(f.minute)}` as LocalTime,
    weekday: isoWeekdayFromUtcDay(new Date(dayMs).getUTCDay()),
    offsetMinutes: (wall - ms) / MINUTE_MS,
  };
}

export function toLocalDate(instant: Date, tz: TimeZone): LocalDate {
  return toWallClock(instant, tz).date;
}

/** −180 på sommaren och −240 på vintern i Santiago. */
export function utcOffsetMinutes(instant: Date, tz: TimeZone): number {
  return offsetMs(assertValidDate(instant, "utcOffsetMinutes"), tz) / MINUTE_MS;
}

// ---------------------------------------------------------------------------
// Lokal → UTC
// ---------------------------------------------------------------------------

function localDateParts(date: LocalDate, fn: string): [number, number, number] {
  const m = DATE_SHAPE.exec(date);
  const parts: [number, number, number] = [
    Number(m?.[1]),
    Number(m?.[2]),
    Number(m?.[3]),
  ];
  if (!m || !isValidYmd(...parts)) {
    throw new RangeError(`${fn}: ogiltigt datum ${String(date)}`);
  }
  return parts;
}

function localTimeParts(time: LocalTime, fn: string): [number, number] {
  const m = /^(\d{2}):(\d{2})$/.exec(time);
  const hh = Number(m?.[1]);
  const mm = Number(m?.[2]);
  if (!m || mm > 59 || hh > 24 || (hh === 24 && mm !== 0)) {
    throw new RangeError(`${fn}: ogiltig tid ${String(time)}`);
  }
  return [hh, mm];
}

type Resolution =
  | { kind: "unique"; instant: number }
  | { kind: "ambiguous"; earlier: number; later: number }
  | { kind: "gap"; earlier: number; later: number };

/**
 * Egen algoritm (som Temporal): kandidat-offset ett dygn före och efter,
 * och kontroll av att kandidaten går tillbaka till samma väggtid.
 * (date-fns-tz används inte, se D-018.)
 */
function resolveLocal(
  date: LocalDate,
  time: LocalTime,
  tz: TimeZone,
  fn: string,
): Resolution {
  const [y, mo, d] = localDateParts(date, fn);
  const [hh, mm] = localTimeParts(time, fn);
  // "24:00" = nästa dags 00:00 (setUTCHours hanterar överslaget).
  if (hh === 24 && y === MAX_YEAR && mo === 12 && d === 31) {
    throw new RangeError(`${fn}: 24:00 den 9999-12-31 ger år 10000`);
  }
  const wall = utcMsFromFields(y, mo, d, hh, mm);
  const before = offsetMs(wall - DAY_MS, tz);
  const after = offsetMs(wall + DAY_MS, tz);
  const candidates = [...new Set([wall - before, wall - after])]
    .filter((c) => wallMs(c, tz) === wall)
    .sort((a, b) => a - b);

  if (candidates.length === 1)
    return { kind: "unique", instant: candidates[0]! };
  if (candidates.length === 2) {
    return {
      kind: "ambiguous",
      earlier: candidates[0]!,
      later: candidates[1]!,
    };
  }
  // Glapp: flytta fram (later) med offset före bytet, bakåt (earlier) med offset efter.
  return { kind: "gap", earlier: wall - after, later: wall - before };
}

/**
 * Lokal väggtid → UTC. "24:00" betyder nästa dags 00:00 och ska användas med
 * "compatible" (standard): om nästa dag börjar i ett glapp (00:00 finns inte,
 * t.ex. 2026-09-06 i Santiago) ger "compatible" dagens verkliga slut, medan
 * "earlier" ger en instant före glappet som inte är ett dagsslut, och
 * `fromLocalStrict` ger `nonexistent_local_time`.
 */
export function fromLocal(
  date: LocalDate,
  time: LocalTime,
  tz: TimeZone,
  disambiguation: Disambiguation = "compatible",
): Date {
  const r = resolveLocal(date, time, tz, "fromLocal");
  if (r.kind === "unique") return new Date(r.instant);
  if (r.kind === "ambiguous") {
    return new Date(disambiguation === "later" ? r.later : r.earlier);
  }
  return new Date(disambiguation === "earlier" ? r.earlier : r.later);
}

export function fromLocalStrict(
  date: LocalDate,
  time: LocalTime,
  tz: TimeZone,
): ParseResult<Date, "nonexistent_local_time" | "ambiguous_local_time"> {
  const r = resolveLocal(date, time, tz, "fromLocalStrict");
  if (r.kind === "unique") return ok(new Date(r.instant));
  return err(
    r.kind === "ambiguous" ? "ambiguous_local_time" : "nonexistent_local_time",
  );
}

// ---------------------------------------------------------------------------
// Lokala dagar
// ---------------------------------------------------------------------------

const MIDNIGHT = "00:00" as LocalTime;

/** [start, end) för den lokala dagen. Start kan vara 01:00 (september). */
export function localDayRange(
  date: LocalDate,
  tz: TimeZone,
): { start: Date; end: Date } {
  return {
    start: fromLocal(date, MIDNIGHT, tz),
    end: fromLocal(addLocalDays(date, 1), MIDNIGHT, tz),
  };
}

/** 23, 24 eller 25 dagar med sommartidsbyte (Santiago). */
export function localDayLengthHours(date: LocalDate, tz: TimeZone): number {
  const { start, end } = localDayRange(date, tz);
  return (end.getTime() - start.getTime()) / 3_600_000;
}

function localDateToUtcMs(date: LocalDate, fn: string): number {
  return utcMsFromFields(...localDateParts(date, fn));
}

function utcMsToLocalDate(ms: number): LocalDate {
  if (Number.isNaN(ms)) throw new RangeError("LocalDate: ogiltigt värde (NaN)");
  const dt = new Date(ms);
  const year = dt.getUTCFullYear();
  if (Number.isNaN(year) || year < MIN_YEAR || year > MAX_YEAR) {
    throw new RangeError("LocalDate: år utanför 0001–9999");
  }
  return ymd(year, dt.getUTCMonth() + 1, dt.getUTCDate());
}

/** Kalenderdagar, inte 24 h. */
export function addLocalDays(date: LocalDate, days: number): LocalDate {
  if (!Number.isSafeInteger(days)) {
    throw new RangeError(`addLocalDays: ogiltigt antal ${String(days)}`);
  }
  return utcMsToLocalDate(
    localDateToUtcMs(date, "addLocalDays") + days * DAY_MS,
  );
}

export function isoWeekdayOf(date: LocalDate): IsoWeekday {
  return isoWeekdayFromUtcDay(
    new Date(localDateToUtcMs(date, "isoWeekdayOf")).getUTCDay(),
  );
}

/** Måndagen i samma ISO-vecka. */
export function startOfLocalWeek(date: LocalDate): LocalDate {
  return addLocalDays(date, 1 - isoWeekdayOf(date));
}

/** Alla datum från och med `from` till och med `to` (högst 400). */
export function eachLocalDate(from: LocalDate, to: LocalDate): LocalDate[] {
  const a = localDateToUtcMs(from, "eachLocalDate");
  const b = localDateToUtcMs(to, "eachLocalDate");
  if (a > b) return [];
  const count = Math.round((b - a) / DAY_MS) + 1;
  if (count > MAX_EACH_DAYS) {
    throw new RangeError(
      `eachLocalDate: ${count} dagar (max ${MAX_EACH_DAYS})`,
    );
  }
  return Array.from({ length: count }, (_, i) =>
    utcMsToLocalDate(a + i * DAY_MS),
  );
}

/** Verklig tid i minuter (b − a). */
export function minutesBetween(a: Date, b: Date): number {
  return (
    (assertValidDate(b, "minutesBetween") -
      assertValidDate(a, "minutesBetween")) /
    MINUTE_MS
  );
}

// ---------------------------------------------------------------------------
// Visning (es-CL, 24 h, egna namntabeller, ingen ICU-text)
// ---------------------------------------------------------------------------

export type DatePreset =
  | "weekdayDayMonthShort" // "Vie 2 oct"              (Agenda, EventPopover)
  | "weekdayDayMonthLong" // "Viernes 2 de octubre"   (Main, Hoy)
  | "weekdayDayShort" // "Mar 6"                   (Main FlashCard, Reserva)
  | "weekdayDayLong" // "Martes 6"                (HoraFlash)
  | "dayMonthLong" // "28 de septiembre"        (Agenda aria-label)
  | "monthYear" // "Octubre 2026"            (Main, Agenda)
  | "month" // "Octubre"                 (Reserva)
  | "weekdayShort" // "Vie"                     (Reserva DayPicker)
  | "weekdayMin" // "Vi"                      (Reserva, kalenderrubrik)
  | "weekdayShortLower" // "vie"                     (Agenda DayPill)
  | "weekdayLongLower" // "viernes"                 (löptext, WhatsApp/e-post)
  | "weekdayDayMonthLongLower"; // "viernes 2 de octubre" (löptext, WhatsApp/e-post)

function capitalize(s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1);
}

function pick(table: readonly string[], index: number): string {
  const v = table[index];
  if (v === undefined) throw new RangeError(`namntabell: index ${index}`);
  return v;
}

/** "2 de octubre". */
function dayMonth(day: number, monthLong: string) {
  return `${day} de ${monthLong}`;
}

export function formatLocalDate(
  date: LocalDate,
  preset: DatePreset,
  locale: CalendarLocale = APP_LOCALE,
): string {
  const [year, month, day] = localDateParts(date, "formatLocalDate");
  const names = calendarNames(locale);
  const wd = isoWeekdayOf(date) - 1;
  const wShort = pick(names.WEEKDAY_SHORT, wd);
  const wLong = pick(names.WEEKDAY_LONG, wd);
  const mShort = pick(names.MONTH_SHORT, month - 1);
  const mLong = pick(names.MONTH_LONG, month - 1);
  switch (preset) {
    case "weekdayDayMonthShort":
      return `${wShort} ${day} ${mShort}`;
    case "weekdayDayMonthLong":
      return `${wLong} ${dayMonth(day, mLong)}`;
    case "weekdayDayShort":
      return `${wShort} ${day}`;
    case "weekdayDayLong":
      return `${wLong} ${day}`;
    case "dayMonthLong":
      return dayMonth(day, mLong);
    case "monthYear":
      return `${capitalize(mLong)} ${year}`;
    case "month":
      return capitalize(mLong);
    case "weekdayShort":
      return wShort;
    case "weekdayMin":
      return pick(names.WEEKDAY_MIN, wd);
    case "weekdayShortLower":
      return wShort.toLowerCase();
    case "weekdayLongLower":
      return wLong.toLowerCase();
    case "weekdayDayMonthLongLower":
      return `${wLong.toLowerCase()} ${dayMonth(day, mLong)}`;
  }
}

export function formatDate(
  instant: Date,
  tz: TimeZone,
  preset: DatePreset,
  locale: CalendarLocale = APP_LOCALE,
): string {
  return formatLocalDate(toLocalDate(instant, tz), preset, locale);
}

const EN_DASH = "–";

function assertIsoWeekday(v: number, fn: string): void {
  if (!Number.isInteger(v) || v < 1 || v > 7) {
    throw new RangeError(`${fn}: ogiltig veckodag ${String(v)}`);
  }
}

/**
 * "Lun–Sáb" (öppettider i Reserva, en-dash utan mellanslag). Samma dag → "Mié".
 * Omlott över veckoslutet ("Sáb–Lun") är tillåtet.
 */
export function formatWeekdayRange(
  from: IsoWeekday,
  to: IsoWeekday,
  locale: CalendarLocale = APP_LOCALE,
): string {
  assertIsoWeekday(from, "formatWeekdayRange");
  assertIsoWeekday(to, "formatWeekdayRange");
  const short = calendarNames(locale).WEEKDAY_SHORT;
  const a = pick(short, from - 1);
  return from === to ? a : `${a}${EN_DASH}${pick(short, to - 1)}`;
}

/** "15:00", "09:05", "00:00" (24 h). */
export function formatTime(instant: Date, tz: TimeZone): string {
  return toWallClock(instant, tz).time;
}

/** "11:30 – 12:05" (Agenda, EventPopover). */
export function formatTimeRange(start: Date, end: Date, tz: TimeZone): string {
  return `${formatTime(start, tz)} ${EN_DASH} ${formatTime(end, tz)}`;
}

/** "10:00–19:00" (öppettider i Reserva, utan mellanslag). "24:00" bara som slut. */
export function formatLocalTimeRange(start: LocalTime, end: LocalTime): string {
  const [startHour] = localTimeParts(start, "formatLocalTimeRange");
  if (startHour === 24) {
    throw new RangeError("formatLocalTimeRange: 24:00 kan inte vara start");
  }
  localTimeParts(end, "formatLocalTimeRange");
  return `${start}${EN_DASH}${end}`;
}

/** "35 min", "1 h", "1 h 30 min". */
export function formatDuration(minutes: number): string {
  if (!Number.isSafeInteger(minutes) || minutes < 0) {
    throw new RangeError(`formatDuration: ogiltigt värde ${String(minutes)}`);
  }
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  if (h === 0) return `${m} min`;
  return m === 0 ? `${h} h` : `${h} h ${m} min`;
}
