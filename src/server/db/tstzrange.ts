import "server-only";

import { parseInstant } from "@/lib/format/dates";

/** Halvöppet intervall i UTC-millisekunder, samma som `core/intervals.ts`. */
export type MsInterval = { start: number; end: number };

function isoOf(ms: number): string {
  return new Date(ms).toISOString();
}

/** `[a,b)` som Postgres förstår. Bara begränsade, icke-tomma intervall. */
export function toTstzrange(i: MsInterval): string {
  if (
    !Number.isFinite(i.start) ||
    !Number.isFinite(i.end) ||
    i.end <= i.start
  ) {
    throw new RangeError("toTstzrange: ogiltigt intervall");
  }
  return `[${isoOf(i.start)},${isoOf(i.end)})`;
}

const RANGE = /^\[("?)([^",()[\]]+)\1,("?)([^",()[\]]+)\3\)$/;

/**
 * Postgres textform (`["2026-10-02 14:30:00+00","2026-10-02 15:05:00+00")`)
 * eller vår egen (`[…Z,…Z)`). Slutna, öppna i början, obegränsade och tomma
 * intervall avvisas med RangeError (schemat tillåter dem inte ändå).
 */
export function parseTstzrange(s: string): MsInterval {
  const m = RANGE.exec(s);
  if (!m) throw new RangeError("parseTstzrange: inte ett halvöppet intervall");
  const a = parseInstant(m[2]!);
  const b = parseInstant(m[4]!);
  if (!a.ok || !b.ok) throw new RangeError("parseTstzrange: ogiltig instant");
  const start = a.value.getTime();
  const end = b.value.getTime();
  if (end <= start) throw new RangeError("parseTstzrange: tomt intervall");
  return { start, end };
}
