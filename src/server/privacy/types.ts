import "server-only";

/**
 * Gemensamma typer för `src/server/privacy/` (WP-26, F12). Samma
 * `MutationResult`-mönster som `src/server/owner/ajustes.ts`.
 */
export type MutationResult = { ok: true } | { ok: false; code: string };

export type ConsentSubject = "customer" | "owner";
/** `whatsapp` (D-063): kundens separata, valfria samtycke till WhatsApp för
 * bokningens meddelanden — `granted: false` = återkallat. */
export type ConsentKind =
  "terms" | "marketing" | "waitlist" | "whatsapp" | "owner_terms" | "dpa";
/** Samma betydelse som `customers.consent_channel` (D-019). */
export type ConsentChannel = "web" | "whatsapp" | "manual";
