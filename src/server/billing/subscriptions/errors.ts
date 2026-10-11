import "server-only";

/**
 * WP-78 (D-059): synliga fel i synken/webhooken (500 → Stripe skickar igen).
 * Bär bara en kod och ett Stripe-/företags-id, aldrig persondata.
 */
export class BillingError extends Error {
  constructor(
    readonly code:
      | "price_missing"
      | "unknown_price"
      | "metadata_missing"
      | "customer_mismatch"
      | "no_customer"
      | "duplicate_subscription",
    readonly ref: string,
  ) {
    super(`billing:${code}:${ref}`);
  }
}
