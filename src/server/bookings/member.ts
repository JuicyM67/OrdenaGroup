import "server-only";

import { can } from "@/config/plans";
import type { Queryable } from "@/server/db/pool";

/**
 * WP-54: medlemsrabatt. Räknas ALLTID på servern (inv. 6) — klienten skickar
 * aldrig något belopp eller någon "är medlem"-flagga. Medlemskapet känns igen
 * på kundraden (`business_id` + `phone_e164`, via `findOrCreateCustomer`).
 */
export type MemberDiscount = {
  /** Heltal i minor units (samma modell som `price_clp`). */
  discountMinor: number;
  pct: number;
  benefitText: string | null;
};

/** Ren funktion: `round(pris × pct / 100)`, aldrig mer än priset. `pct`
 * utanför 1–100 (eller null = av) ger ingen rabatt. */
export function memberDiscountMinor(
  priceMinor: number,
  pct: number | null,
): number {
  if (pct === null || !Number.isInteger(pct) || pct < 1 || pct > 100) return 0;
  if (!Number.isSafeInteger(priceMinor) || priceMinor <= 0) return 0;
  return Math.min(priceMinor, Math.round((priceMinor * pct) / 100));
}

type Row = {
  is_member: boolean;
  member_discount_pct: number | null;
  member_benefit_text: string | null;
  plan: string;
};

/**
 * Medlemsrabatten för kunden i anroparens transaktion, eller `undefined` om
 * kunden inte är medlem, företaget inte har rabatten påslagen, eller den
 * blir 0. Anonymiserade kunder får aldrig rabatt.
 */
export async function memberDiscountIn(
  q: Queryable,
  businessId: string,
  customerId: string,
  priceMinor: number,
): Promise<MemberDiscount | undefined> {
  const r = await q.query<Row>(
    `select c.is_member, b.member_discount_pct, b.member_benefit_text,
            b.plan::text as plan
       from public.customers c
       join public.businesses b on b.id = c.business_id
      where c.business_id = $1 and c.id = $2 and c.anonymized_at is null`,
    [businessId, customerId],
  );
  const row = r.rows[0];
  if (!row?.is_member || row.member_discount_pct === null) return undefined;
  // WP-73 (D-048): medlemsrabatt ingår från Team — pausad annars, även om
  // kolumnen satts direkt (t.ex. via PostgREST).
  if (!can(row.plan, "campaigns")) return undefined;
  const discountMinor = memberDiscountMinor(
    priceMinor,
    row.member_discount_pct,
  );
  if (discountMinor <= 0) return undefined;
  return {
    discountMinor,
    pct: row.member_discount_pct,
    benefitText: row.member_benefit_text?.trim() || null,
  };
}
