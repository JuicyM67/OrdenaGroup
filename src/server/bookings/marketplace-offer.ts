import "server-only";

import { marketplaceEnabled, vouchersMarket } from "@/config/marketplace";
import type { Queryable } from "@/server/db/pool";

/**
 * D-060: bokning till erbjudandepris via marknadsplatsen
 * (`/{slug}?oferta=<id>`), bara där erbjudandet inte säljs som värdebevis
 * (CL, tills Mercado Pago finns). Kunden betalar erbjudandepriset i salongen.
 *
 * Räknas ALLTID på servern (inv. 6): klienten skickar aldrig pris eller
 * rabatt, och id:t binds i sidans server action (aldrig ur formuläret).
 * Giltigt = rätt företag, publicerat, inom försäljningsfönstret, ej
 * slutsålt, företaget aktivt och planen har `offers`. Tjänsten kontrolleras
 * av anroparen (erbjudandet gäller bara sin egen tjänst).
 */

export type MarketplaceOfferInfo = {
  id: string;
  serviceId: string;
  title: string;
  priceMinor: number;
  regularMinor: number;
};

/** Finns bokning till erbjudandepris i den här installationen? */
export function marketplaceOfferBookingEnabled(): boolean {
  return marketplaceEnabled() && !vouchersMarket();
}

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** Formkontroll innan någon fråga körs (skräp i `?oferta=` slår aldrig mot DB). */
export function isMarketplaceOfferIdShape(id: unknown): id is string {
  return typeof id === "string" && UUID.test(id);
}

type Row = {
  id: string;
  service_id: string;
  title: string;
  offer_price_minor: number;
  regular_price_minor: number;
};

export async function findBookableMarketplaceOfferIn(
  q: Queryable,
  input: { businessId: string; offerId: string; now: Date },
): Promise<MarketplaceOfferInfo | undefined> {
  if (!marketplaceOfferBookingEnabled()) return undefined;
  if (!isMarketplaceOfferIdShape(input.offerId)) return undefined;
  const r = await q.query<Row>(
    `select o.id, o.service_id, o.title, o.offer_price_minor,
            o.regular_price_minor
       from public.offers o
       join public.businesses b on b.id = o.business_id
      where o.business_id = $1 and o.id = $2
        and o.status = 'published'
        and (o.sale_starts_at is null or o.sale_starts_at <= $3::timestamptz)
        and (o.sale_ends_at is null or o.sale_ends_at > $3::timestamptz)
        and (o.quantity_total is null or o.quantity_sold < o.quantity_total)
        and b.status = 'active' and b.deletion_requested_at is null
        and private.plan_has_feature(b.plan::text, 'offers')`,
    [input.businessId, input.offerId, input.now.toISOString()],
  );
  const row = r.rows[0];
  if (!row) return undefined;
  return {
    id: row.id,
    serviceId: row.service_id,
    title: row.title,
    priceMinor: row.offer_price_minor,
    regularMinor: row.regular_price_minor,
  };
}

/** Rabatten så att kunden betalar erbjudandepriset (aldrig negativ). */
export function marketplaceOfferDiscountMinor(
  priceMinor: number,
  offerPriceMinor: number,
): number {
  return Math.max(0, priceMinor - offerPriceMinor);
}
