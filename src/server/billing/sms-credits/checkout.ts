import "server-only";

import {
  smsCreditPackage,
  smsCreditPrice,
  SMS_CREDIT_VALIDITY_MONTHS,
  SMS_CREDIT_VAT_BPS,
} from "@/config/sms-credits";
import { appHref } from "@/config/routes";
import { smsCreditPackageSchema } from "@/lib/validation/sms-credits";
import { hitRateLimit } from "@/server/db/rate-limit";
import { withOwnerTx, withServiceTx } from "@/server/db/tx";
import { appBaseUrl, getStripe } from "@/server/payments/stripe/client";

import { smsCreditsPurchasable, smsVatRateId } from "./config";

/**
 * WP-76 (D-053): köp av sms-krediter via Stripe Checkout på PLATTFORMENS
 * konto (`mode: "payment"`, inget `stripeAccount`, D-044 gäller inte här —
 * plattformen är säljare). Priset räknas här från `src/config/sms-credits.ts`,
 * aldrig från klienten. Moms 25 % läggs på av Stripe via den fasta
 * skattesatsen `STRIPE_SMS_VAT_RATE_ID`; Stripe skapar faktura/kvitto.
 * Krediteras först när betalningen verifierats (`fulfill.ts`).
 */

/** Stripe kräver minst 30 min; vi tar 31 (som WP-64). */
const SESSION_TTL_MINUTES = 31;

export type SmsCheckoutResult =
  | { ok: true; url: string }
  | {
      ok: false;
      code:
        | "sms_credits_unavailable"
        | "sms_credits_invalid_package"
        | "forbidden"
        | "rate_limited"
        | "failed";
    };

/** Skattesatsen kontrolleras en gång per process: 25 %, exklusiv, aktiv.
 * Fel konfigurerad → köpet avvisas (`sms_credits_unavailable`). */
let vatRateCheck: { id: string; ok: Promise<boolean> } | undefined;

function vatRateValid(id: string): Promise<boolean> {
  if (vatRateCheck?.id !== id) {
    const ok = getStripe()
      .taxRates.retrieve(id)
      .then(
        (tr) =>
          tr.active &&
          !tr.inclusive &&
          tr.percentage === SMS_CREDIT_VAT_BPS / 100,
      );
    // Nätverksfel cachas inte (nästa köp provar igen).
    ok.catch(() => {
      vatRateCheck = undefined;
    });
    vatRateCheck = { id, ok };
  }
  return vatRateCheck.ok;
}

export async function createSmsCreditCheckout(input: {
  businessId: string;
  userId: string;
  /** Ägarens e-post (för Stripes kvitto), från sessionen. */
  email: string | null;
  packageSize: unknown;
  now?: Date;
}): Promise<SmsCheckoutResult> {
  if (!smsCreditsPurchasable()) {
    return { ok: false, code: "sms_credits_unavailable" };
  }
  const parsed = smsCreditPackageSchema.safeParse(input.packageSize);
  const pkg = parsed.success ? smsCreditPackage(parsed.data) : undefined;
  if (!pkg) return { ok: false, code: "sms_credits_invalid_package" };

  // Bara företagets ägare (RLS-hjälparen, samma som Betalningar/Plan).
  const isOwner = await withOwnerTx(input.userId, async (q) => {
    const r = await q.query<{ ok: boolean }>(
      `select private.is_member($1, array['owner', 'admin']::public.member_role[]) as ok`,
      [input.businessId],
    );
    return r.rows[0]?.ok ?? false;
  });
  if (!isOwner) return { ok: false, code: "forbidden" };

  const allowed = await hitRateLimit({
    scope: "sms_credits:checkout",
    subject: input.businessId,
    windowSeconds: 3600,
    max: 5,
  });
  if (!allowed) return { ok: false, code: "rate_limited" };

  const price = smsCreditPrice(pkg);
  const vatRate = smsVatRateId();
  if (!vatRate) return { ok: false, code: "sms_credits_unavailable" };
  try {
    if (!(await vatRateValid(vatRate))) {
      return { ok: false, code: "sms_credits_unavailable" };
    }
  } catch {
    return { ok: false, code: "failed" };
  }
  const now = input.now ?? new Date();

  const purchaseId = await withServiceTx(async (q) => {
    const r = await q.query<{ id: string }>(
      `insert into public.sms_credit_purchases
         (business_id, created_by, package_size, amount_net, amount_vat,
          amount_total, currency, credits_total)
       values ($1, $2, $3, $4, $5, $6, 'sek', $3)
       returning id`,
      [
        input.businessId,
        input.userId,
        pkg.credits,
        price.netOre,
        price.vatOre,
        price.totalOre,
      ],
    );
    return r.rows[0]!.id;
  });

  const base = `${appBaseUrl()}${appHref("appAjustesPlan")}`;
  const metadata = {
    kind: "sms_credits",
    business_id: input.businessId,
    purchase_id: purchaseId,
  };
  try {
    const session = await getStripe().checkout.sessions.create(
      {
        mode: "payment",
        locale: "sv",
        client_reference_id: purchaseId,
        ...(input.email ? { customer_email: input.email } : {}),
        line_items: [
          {
            quantity: 1,
            price_data: {
              currency: "sek",
              unit_amount: price.netOre,
              product_data: {
                name: `${pkg.credits} SMS`,
                description: `SMS-krediter, giltiga i ${SMS_CREDIT_VALIDITY_MONTHS} månader`,
              },
            },
            tax_rates: [vatRate],
          },
        ],
        invoice_creation: { enabled: true },
        tax_id_collection: { enabled: true },
        metadata,
        payment_intent_data: { metadata },
        expires_at: Math.floor(now.getTime() / 1000) + SESSION_TTL_MINUTES * 60,
        success_url: `${base}?sms=klart&session={CHECKOUT_SESSION_ID}`,
        cancel_url: `${base}?sms=avbrutet`,
      },
      { idempotencyKey: `sms_credits:${purchaseId}` },
    );
    if (!session.url) return { ok: false, code: "failed" };
    await withServiceTx((q) =>
      q.query(
        `update public.sms_credit_purchases
            set stripe_checkout_session_id = $3
          where id = $1 and business_id = $2 and status = 'pending'`,
        [purchaseId, input.businessId, session.id],
      ),
    );
    return { ok: true, url: session.url };
  } catch {
    // Ingen persondata i loggar; raden står kvar som `pending` utan session.
    return { ok: false, code: "failed" };
  }
}
