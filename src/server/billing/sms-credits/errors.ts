import "server-only";

/**
 * WP-76 (D-053): synligt fel för sms-krediter. Meddelandet bär bara en kod och
 * köpets id (ingen persondata), så att webhooken svarar 500 (Stripe skickar
 * igen och felet syns i Stripe Dashboard/loggarna) i stället för att tyst
 * markera händelsen som hanterad.
 */
export class SmsCreditsError extends Error {
  constructor(
    readonly code:
      "mismatch" | "metadata_missing" | "purchase_missing" | "not_granted_yet",
    readonly purchaseId: string,
  ) {
    super(`sms_credits_${code}:${purchaseId}`);
    this.name = "SmsCreditsError";
  }
}
