import "server-only";

import { APP_TZ, parseTimeZone, type TimeZone } from "@/lib/format/dates";
import { resolveBusinessBySlug } from "@/server/bookings/business";
import { publicImageUrl } from "@/server/bookings/media";
import { withServiceTx } from "@/server/db/tx";

import { businessCanSellGiftCards, giftCardsEnabled } from "./checkout";

/** WP-77 (D-058): det köpsidan behöver om företaget (publikt, via servern). */
export type GiftCardShop = {
  id: string;
  name: string;
  slug: string;
  timeZone: TimeZone;
  coverUrl: string | null;
  address: string | null;
  canSell: boolean;
};

export async function loadGiftCardShop(
  slug: string,
): Promise<GiftCardShop | null> {
  if (!giftCardsEnabled()) return null;
  const found = await resolveBusinessBySlug(slug);
  if (!found) return null;
  const b = await withServiceTx(async (q) => {
    const r = await q.query<{
      id: string;
      name: string;
      timezone: string;
      cover_url: string | null;
      address: string | null;
      status: string;
    }>(
      `select id, name, timezone, cover_url, address, status::text as status
         from public.businesses where id = $1`,
      [found.id],
    );
    return r.rows[0];
  });
  if (!b || b.status !== "active") return null;
  const tz = parseTimeZone(b.timezone);
  return {
    id: b.id,
    name: b.name,
    slug,
    timeZone: tz.ok ? tz.value : APP_TZ,
    coverUrl: publicImageUrl(b.cover_url, b.id),
    address: b.address,
    canSell: await businessCanSellGiftCards(b.id),
  };
}

/** Kodfältet på `/[slug]`: visas när företaget säljer presentkort eller har
 * giltiga kort med saldo kvar (försäljningen kan ha stängts av). */
export async function businessAcceptsGiftCards(
  businessId: string,
): Promise<boolean> {
  if (!giftCardsEnabled()) return false;
  if (await businessCanSellGiftCards(businessId)) return true;
  return withServiceTx(async (q) => {
    const r = await q.query(
      `select 1 from public.gift_cards
        where business_id = $1 and status = 'active' and balance_minor > 0
          and expires_at > now()
        limit 1`,
      [businessId],
    );
    return r.rows.length > 0;
  });
}
