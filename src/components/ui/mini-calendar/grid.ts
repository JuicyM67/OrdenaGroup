// Ren funktion, ingen React. All aritmetik görs med Date.UTC/getUTC*, så resultatet inte
// beror på processens tidszon (sommartid i Chile, se grid.test.ts). Veckan börjar måndag.
export type YearMonth = { year: number; month: number }; // month: 1–12

export type MonthCell = {
  /** "YYYY-MM-DD" */
  date: string;
  day: number;
  inMonth: boolean;
};

function pad2(n: number): string {
  return String(n).padStart(2, "0");
}

function toISO(year: number, month: number, day: number): string {
  return `${String(year).padStart(4, "0")}-${pad2(month)}-${pad2(day)}`;
}

/** Måndag=0 … söndag=6, oavsett JS Date.getUTCDay() (söndag=0). */
function mondayIndex(utcDow: number): number {
  return (utcDow + 6) % 7;
}

function utcTimestamp(year: number, month: number, day: number): number {
  return Date.UTC(year, month - 1, day);
}

function cellFromTimestamp(
  ts: number,
  targetYear: number,
  targetMonth: number,
): MonthCell {
  const d = new Date(ts);
  const year = d.getUTCFullYear();
  const month = d.getUTCMonth() + 1;
  const day = d.getUTCDate();
  return {
    date: toISO(year, month, day),
    day,
    inMonth: year === targetYear && month === targetMonth,
  };
}

/** Bygger ett rutnät (veckor à 7 dagar) för en kalendermånad, utfyllt till hela veckor. */
export function buildMonthGrid(year: number, month: number): MonthCell[][] {
  const firstTs = utcTimestamp(year, month, 1);
  const startOffset = mondayIndex(new Date(firstTs).getUTCDay());
  const startTs = firstTs - startOffset * 86_400_000;

  const daysInMonth = new Date(utcTimestamp(year, month + 1, 0)).getUTCDate();
  const lastTs = utcTimestamp(year, month, daysInMonth);
  const endOffset = 6 - mondayIndex(new Date(lastTs).getUTCDay());
  const endTs = lastTs + endOffset * 86_400_000;

  const totalDays = Math.round((endTs - startTs) / 86_400_000) + 1;
  const cells: MonthCell[] = [];
  for (let i = 0; i < totalDays; i++) {
    cells.push(cellFromTimestamp(startTs + i * 86_400_000, year, month));
  }

  const weeks: MonthCell[][] = [];
  for (let i = 0; i < cells.length; i += 7) {
    weeks.push(cells.slice(i, i + 7));
  }
  return weeks;
}

/** month: 1–12. delta kan vara negativ. */
export function addMonths(
  { year, month }: YearMonth,
  delta: number,
): YearMonth {
  const monthIndex0 = month - 1 + delta;
  const newYear = year + Math.floor(monthIndex0 / 12);
  const newMonth0 = ((monthIndex0 % 12) + 12) % 12;
  return { year: newYear, month: newMonth0 + 1 };
}

/** Lägger till (eller drar bort) hela dagar från ett datum, UTC-säkert. */
export function addDays(date: string, delta: number): string {
  const [y, m, d] = date.split("-").map(Number) as [number, number, number];
  const ts = utcTimestamp(y, m, d) + delta * 86_400_000;
  const result = new Date(ts);
  return toISO(
    result.getUTCFullYear(),
    result.getUTCMonth() + 1,
    result.getUTCDate(),
  );
}

/** Returnerar "YYYY-MM-DD" för måndagen i samma vecka som datumet. */
export function weekOf(date: string): string {
  const [y, m, d] = date.split("-").map(Number) as [number, number, number];
  const ts = utcTimestamp(y, m, d);
  const offset = mondayIndex(new Date(ts).getUTCDay());
  const mondayTs = ts - offset * 86_400_000;
  const monday = new Date(mondayTs);
  return toISO(
    monday.getUTCFullYear(),
    monday.getUTCMonth() + 1,
    monday.getUTCDate(),
  );
}
