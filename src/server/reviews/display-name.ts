import "server-only";

/** "Ana María Pérez" → "Ana P.", "Ana" → "Ana", tomt/null → null (D-045:
 * visningsnamn = förnamn + initial, aldrig hela namnet). */
export function reviewDisplayName(name: string | null): string | null {
  const parts = (name ?? "").trim().split(/\s+/).filter(Boolean);
  const first = parts[0];
  if (!first) return null;
  const last = parts.length > 1 ? parts[parts.length - 1] : undefined;
  const initial = last ? Array.from(last)[0]?.toUpperCase() : undefined;
  const out = initial ? `${first} ${initial}.` : first;
  return out.slice(0, 60);
}
