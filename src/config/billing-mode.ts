// WP-80 (D-061): "Facturación manual". Delad av servern (/admin) och
// klientformulären; databasen har samma regler (check-constraints).
export type BillingMode = "app" | "manual";

export const BILLING_NOTE_MAX = 500;

export function isBillingMode(v: unknown): v is BillingMode {
  return v === "app" || v === "manual";
}
