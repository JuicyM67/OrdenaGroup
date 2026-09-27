import "server-only";

import type { ParseResult } from "@/lib/format/result";

export { err, ok } from "@/lib/format/result";

/** Förväntade fel returneras, samma form som `ParseResult` i @/lib/format. */
export type Result<T, E extends string> = ParseResult<T, E>;

/**
 * Infrastrukturfel (databasen nere, timeout …). Innehåller bara SQLSTATE,
 * aldrig persondata, token eller SQL-värden. UI mappar till
 * `errores.reserva.network`.
 */
export class SchedulingInfraError extends Error {
  readonly code: string | undefined;

  constructor(code?: string) {
    super(`scheduling: infrastrukturfel${code ? ` (${code})` : ""}`);
    this.name = "SchedulingInfraError";
    this.code = code;
  }
}
