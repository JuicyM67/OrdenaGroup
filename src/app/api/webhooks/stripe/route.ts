// WP-64 (D-044): Stripe-webhooken. Signatur över rå body, idempotens via
// `inbound_events`, se `src/server/payments/stripe/webhook.ts`. Ingen
// persondata i loggar (bara händelsetyp och SQLSTATE).
import { NextResponse } from "next/server";

import { BillingError } from "@/server/billing/subscriptions";
import { pgErrorCode } from "@/server/db/errors";
import {
  stripeEnabled,
  stripeWebhookSecrets,
} from "@/server/payments/stripe/client";
import {
  processStripeEvent,
  verifyStripeEvent,
} from "@/server/payments/stripe/webhook";
import { systemClock } from "@/server/scheduling/clock";

export const dynamic = "force-dynamic";

export async function POST(request: Request): Promise<NextResponse> {
  const secrets = stripeWebhookSecrets();
  if (!stripeEnabled() || secrets.length === 0) {
    return NextResponse.json({ error: "not_configured" }, { status: 503 });
  }
  const signature = request.headers.get("stripe-signature");
  if (!signature) {
    return NextResponse.json({ error: "missing_signature" }, { status: 400 });
  }
  // Rå body: får aldrig parsas innan signaturen är kontrollerad.
  const raw = await request.text();
  const event = verifyStripeEvent(raw, signature, secrets);
  if (!event) {
    return NextResponse.json({ error: "invalid_signature" }, { status: 400 });
  }
  try {
    const outcome = await processStripeEvent(event, systemClock());
    return NextResponse.json({ received: true, outcome });
  } catch (e) {
    console.error("stripe webhook: hantering misslyckades", {
      type: event.type,
      code:
        pgErrorCode(e) ??
        // WP-78: abonnemangens felkod (ingen persondata, bara koden).
        (e instanceof BillingError ? `billing_${e.code}` : "unknown"),
    });
    return NextResponse.json({ error: "processing_failed" }, { status: 500 });
  }
}
