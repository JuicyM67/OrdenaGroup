import "server-only";

/**
 * Hjälpare som delas av agenda.ts/hoy.ts/inicio.ts (WP-21). Alla tre läser
 * ägarens egna företag (RLS, `withOwnerTx`) och mappar raderna till samma
 * vy-typer som design lab redan använder (se `src/app/design-lab/*\/fixtures.ts`).
 */
import type { StaffColor } from "@/components/agenda/types";

/**
 * Postgres `extract(epoch from …) * 1000` (float8, millisekunder) → instant.
 * Samma mönster som `src/server/bookings/row.ts` — en ISO-sträng med `Z`,
 * aldrig beroende av sessionens tidszon (D-018).
 */
export function isoOf(ms: number): string {
  return new Date(Math.round(ms)).toISOString();
}

/** `staff.color` ('staff-1'…'staff-6', se D-014-migrationen) → siffran. */
export function staffColorOf(token: string): StaffColor {
  const n = Number(token.slice("staff-".length));
  return (n >= 1 && n <= 6 ? n : 1) as StaffColor;
}

/**
 * Ägarens visningsnamn: inget namnfält finns i `memberships`/`auth.users`
 * (bara e-post, magisk länk, WP-15) — namnet härleds ur e-postens lokaldel.
 * Ren data, ingen påhittad UI-text (hård regel 6): saknas allt, visas
 * e-posten oförändrad.
 */
export function ownerNameParts(email: string | null | undefined): {
  name: string;
  firstName: string;
} {
  const raw = email ?? "";
  const local = raw.split("@")[0] ?? raw;
  const cleaned = local.replace(/[._-]+/g, " ").trim();
  const display =
    cleaned.length > 0
      ? cleaned.charAt(0).toUpperCase() + cleaned.slice(1)
      : raw;
  return { name: display, firstName: display };
}
