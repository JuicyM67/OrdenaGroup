import "server-only";

/**
 * WP-45 (Ägarens svar punkt 1): en förfrågan löper ut 24 h efter att den
 * skickades (`created_at`), dock senast 2 h före start — det som kommer
 * först. Absoluta instanter (UTC ms): sommartid påverkar inte "2 h före".
 * Samma konstanter används i SQL:en i `confirm.ts`.
 */
export const REQUEST_TTL_HOURS = 24;
export const REQUEST_LEAD_HOURS = 2;

const HOUR = 3_600_000;

/** Instanten då förfrågan går ut. */
export function requestDeadline(createdAtMs: number, startMs: number): number {
  return Math.min(
    createdAtMs + REQUEST_TTL_HOURS * HOUR,
    startMs - REQUEST_LEAD_HOURS * HOUR,
  );
}

/** Utgången vid `now` (gränsen inräknad: exakt på deadline = utgången). */
export function isRequestExpired(
  createdAtMs: number,
  startMs: number,
  now: Date,
): boolean {
  return now.getTime() >= requestDeadline(createdAtMs, startMs);
}
