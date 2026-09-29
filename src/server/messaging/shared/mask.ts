import "server-only";

/**
 * Maskering av persondata för det fåtal ställen där vi behöver beskriva ett
 * meddelande utan att skriva ut hela numret/adressen (t.ex. felmeddelanden
 * som kan hamna i ett spårningsverktyg, eller `SendResult.toMasked` som
 * anropare kan logga tryggt). `src/server` får aldrig använda `console.*`
 * (se `boundaries.test.ts`) — det här är till för de ställen UTANFÖR
 * `src/server` (route handlers, cron) som faktiskt loggar.
 *
 * Regel hård 7 / INTEGRATIONS.md: aldrig persondata i loggar, telefonnummer
 * maskerat.
 */

/** "+56912345678" → "+56 9 12** **78" (bara de fyra sista siffrorna syns). */
export function maskPhone(e164: string): string {
  const digits = e164.replace(/[^\d]/g, "");
  if (digits.length < 4) return "***";
  const last = digits.slice(-2);
  const first = digits.slice(0, Math.max(digits.length - 6, 1));
  return `+${first}${"*".repeat(Math.max(digits.length - first.length - 2, 0))}${last}`;
}

/** "joaquin.perez@example.cl" → "jo***@example.cl". */
export function maskEmail(email: string): string {
  const at = email.indexOf("@");
  if (at <= 0) return "***";
  const local = email.slice(0, at);
  const domain = email.slice(at + 1);
  const visible = local.slice(0, Math.min(2, local.length));
  return `${visible}${"*".repeat(Math.max(local.length - visible.length, 1))}@${domain}`;
}
