/**
 * Temporär plats för två rena formateringsfunktioner som enligt planen (WP-13 §57,
 * "Externa beroenden") ska levereras av `scheduling-engineer` i `src/lib/format/`:
 * `formatWeekdayRange([1..6])` → "Lun–Sáb" och `initialsOf("Barbería Norte")` → "BN".
 * De har inte landat på `main` när WP-13 byggdes (bara WP-11 PR A är mergad).
 *
 * WP-13 äger inte `src/lib/**`, så funktionerna bor tillfälligt här och används bara av
 * `business-header.tsx`. När `src/lib/format/` får de riktiga funktionerna (WP-10/WP-04)
 * ska den här filen tas bort och importen bytas — se PR-beskrivningen/rapporten.
 */
import { WEEKDAY_SHORT } from "@/lib/format/calendar-es-CL";
import type { IsoWeekday } from "@/lib/format/dates";

const EN_DASH = "–";

/** [1,2,3,4,5,6] → "Lun–Sáb". Antar en sammanhängande sekvens (öppettiderna i F1). */
export function formatWeekdayRange(weekdays: readonly IsoWeekday[]): string {
  if (weekdays.length === 0) return "";
  const sorted = [...weekdays].sort((a, b) => a - b);
  const first = sorted[0]!;
  const last = sorted[sorted.length - 1]!;
  const from = WEEKDAY_SHORT[first - 1]!;
  if (first === last) return from;
  const to = WEEKDAY_SHORT[last - 1]!;
  return `${from}${EN_DASH}${to}`;
}

/** "Barbería Norte" → "BN". Tar de två första ordens första bokstav, versaler. */
export function initialsOf(name: string): string {
  const words = name.trim().split(/\s+/).filter(Boolean);
  const initials = words
    .slice(0, 2)
    .map((w) => w.charAt(0).toUpperCase())
    .join("");
  return initials || "?";
}
