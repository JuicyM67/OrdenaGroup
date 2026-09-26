/**
 * Resultat för förväntade fel. Felkoder är strängliteraler; UI mappar dem
 * till text från `src/i18n/es-CL.ts`. Bara programmeringsfel kastas.
 */
export type ParseResult<T, E extends string> =
  { ok: true; value: T } | { ok: false; error: E };

export function ok<T>(value: T): { ok: true; value: T } {
  return { ok: true, value };
}

export function err<E extends string>(error: E): { ok: false; error: E } {
  return { ok: false, error };
}
