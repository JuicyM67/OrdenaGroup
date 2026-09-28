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

/**
 * WP-20 (granskningsfynd): unikt index `bookings_business_id_idempotency_key_uidx`
 * — ett omförsök med samma `idempotencyKey` ska returnera den befintliga
 * bokningen som lyckad, inte ett fel.
 */
export function isIdempotencyKeyViolation(e: unknown): boolean {
  return (
    pgErrorCode(e) === "23505" &&
    field(e, "constraint") === "bookings_business_id_idempotency_key_uidx"
  );
}

/**
 * Deadlock (40P01) eller serialiseringsfel (40001): två transaktioner krockade.
 * Hela transaktionen kan köras om (se `runAs`).
 */
export function isRetryableConflict(e: unknown): boolean {
  const code = pgErrorCode(e);
  return code === "40P01" || code === "40001";
}
