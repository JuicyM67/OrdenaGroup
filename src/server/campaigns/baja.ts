import "server-only";

import { hashOfferToken, isOfferTokenShape } from "@/server/bookings/offer";
import type { Queryable } from "@/server/db/pool";
import { withServiceTx } from "@/server/db/tx";
import { LEGAL_VERSION } from "@/i18n/legal/types";
import { recordConsent } from "@/server/privacy/consent";

/**
 * WP-31: `/baja/[token]` — avregistrering från marknadsföring. Samma token
 * som erbjudandelänken (`campaign_recipients.token_hash`, D-029-mönstret:
 * bara hashen sparas), men oberoende av erbjudandets giltighet/inlösen —
 * avregistrering ska fungera även om erbjudandet gått ut eller redan
 * lösts in. Nollar BARA `consent_marketing_at` (kundens övriga samtycken/
 * bokningar rörs inte).
 */

export type BajaTarget = {
  negocio: string;
  customerId: string;
  businessId: string;
  alreadyOptedOut: boolean;
};

export async function findBajaTargetByToken(
  token: string,
): Promise<BajaTarget | undefined> {
  if (!isOfferTokenShape(token)) return undefined;
  return withServiceTx(async (q) => {
    const r = await q.query<{
      negocio: string;
      customer_id: string;
      business_id: string;
      already_opted_out: boolean;
    }>(
      `select b.name as negocio, cu.id as customer_id, cr.business_id,
              (cu.consent_marketing_at is null) as already_opted_out
         from public.campaign_recipients cr
         join public.businesses b on b.id = cr.business_id
         join public.customers cu
           on cu.business_id = cr.business_id and cu.id = cr.customer_id
        where cr.token_hash = $1 and cu.anonymized_at is null`,
      [hashOfferToken(token)],
    );
    const row = r.rows[0];
    return row
      ? {
          negocio: row.negocio,
          customerId: row.customer_id,
          businessId: row.business_id,
          alreadyOptedOut: row.already_opted_out,
        }
      : undefined;
  });
}

async function unsubscribeCustomerIn(
  q: Queryable,
  businessId: string,
  customerId: string,
): Promise<void> {
  const r = await q.query(
    `update public.customers
        set consent_marketing_at = null
      where business_id = $1 and id = $2
        and anonymized_at is null and consent_marketing_at is not null`,
    [businessId, customerId],
  );
  if ((r.rowCount ?? 0) === 0) return; // redan avregistrerad — inget nytt att logga
  await recordConsent(q, {
    businessId,
    customerId,
    subject: "customer",
    kind: "marketing",
    version: LEGAL_VERSION,
    channel: "web",
    granted: false,
  });
}

export type UnsubscribeResult =
  { ok: true } | { ok: false; code: "invalid_token" };

/** Idempotent (en andra POST på samma länk är ett no-op, inte ett fel). */
export async function unsubscribeByToken(
  token: string,
): Promise<UnsubscribeResult> {
  const target = await findBajaTargetByToken(token);
  if (!target) return { ok: false, code: "invalid_token" };
  await withServiceTx((q) =>
    unsubscribeCustomerIn(q, target.businessId, target.customerId),
  );
  return { ok: true };
}
