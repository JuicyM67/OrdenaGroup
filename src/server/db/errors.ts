import "server-only";

/**
 * Tolkning av fel från `pg`. Läser bara SQLSTATE och constraint-namn — aldrig
 * `detail`/`message`, som kan innehålla värden (t.ex. telefonnummer i ett
 * unique-fel) och därför aldrig får hamna i loggar eller fel till UI.
 */

const SQLSTATE = /^[0-9A-Z]{5}$/;

function field(e: unknown, key: "code" | "constraint"): string | undefined {
  if (typeof e !== "object" || e === null || !(key in e)) return undefined;
  const v = (e as Record<string, unknown>)[key];
  return typeof v === "string" ? v : undefined;
}

/** SQLSTATE (5 tecken), annars undefined (t.ex. nätverksfel "ECONNREFUSED"). */
export function pgErrorCode(e: unknown): string | undefined {
  const code = field(e, "code");
  return code !== undefined && SQLSTATE.test(code) ? code : undefined;
}

/** INV-1: exclusion constraint `no_overlap` på bookings. */
export function isNoOverlapViolation(e: unknown): boolean {
  return pgErrorCode(e) === "23P01" && field(e, "constraint") === "no_overlap";
}
