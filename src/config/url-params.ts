// Query-parametrar i publika adresser.

/** Läser en parameter ur `searchParams` (bara ett strängvärde). */
export function readParam(
  sp: Record<string, string | string[] | undefined>,
  name: string,
): string | undefined {
  const raw = sp[name];
  return typeof raw === "string" ? raw : undefined;
}

/** Bygger `?namn=värde`. */
export function queryString(name: string, value: string | number): string {
  return `?${name}=${value}`;
}
