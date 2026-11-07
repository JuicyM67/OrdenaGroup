import "server-only";

import type { TimeZone } from "@/lib/format/dates";
import { getClientIp, hitRateLimit } from "@/server/db/rate-limit";
import { withServiceTx } from "@/server/db/tx";

import {
  hashGiftCardToken,
  isGiftCardTokenShape,
  tzOrDefault,
  type GiftCardStatus,
} from "./rules";

/**
 * WP-87 (D-073, som SE D-058): tarjetan bakom en länk
 * (`/<slug>/tarjeta-regalo/tarjeta?t=<token>`) — köparens länk i kvittot
 * eller mottagarens i leveransmejlet/utskriften. Token är 32 slumpbyte;
 * databasen har bara SHA-256. Bara hos företaget i URL:en. Misslyckade
 * uppslag rate-limitas per IP (30/timme) — token går inte att gissa, men
 * sidan ska inte heller kunna användas som orakel.
 */

export type GiftCardView = {
  id: string;
  code: string;
  initialMinor: number;
  balanceMinor: number;
  status: GiftCardStatus;
  expiresAt: Date;
  recipientName: string | null;
  buyerName: string | null;
  greeting: string | null;
  theme: "lime" | "lilac";
  timeZone: TimeZone;
};

export type GiftCardViewResult =
  | { ok: true; view: GiftCardView }
  | { ok: false; code: "not_found" | "rate_limited" };

const FAILED_PER_IP_HOUR = 30;

async function failedAllowed(): Promise<boolean> {
  return hitRateLimit({
    scope: "gift_card:view:ip",
    subject: await getClientIp(),
    windowSeconds: 60 * 60,
    max: FAILED_PER_IP_HOUR,
  });
}

export async function loadGiftCardByToken(
  businessId: string,
  token: string,
  now: Date,
): Promise<GiftCardViewResult> {
  const row = isGiftCardTokenShape(token)
    ? await withServiceTx(async (q) => {
        const r = await q.query<{
          id: string;
          code: string;
          initial_minor: number;
          balance_minor: number;
          status: GiftCardStatus;
          expires_at: Date;
          recipient_name: string | null;
          buyer_name: string | null;
          greeting: string | null;
          theme: string;
          timezone: string;
        }>(
          `select g.id, g.code, g.initial_minor, g.balance_minor, g.status,
                  g.expires_at, o.recipient_name, o.buyer_name, o.greeting,
                  o.theme, b.timezone
             from public.gift_cards g
             join public.gift_card_orders o
               on o.business_id = g.business_id and o.id = g.order_id
             join public.businesses b on b.id = g.business_id
            where g.business_id = $1
              and (g.view_token_hash = $2 or o.buyer_token_hash = $2)`,
          [businessId, hashGiftCardToken(token)],
        );
        return r.rows[0];
      })
    : undefined;
  if (!row) {
    return (await failedAllowed())
      ? { ok: false, code: "not_found" }
      : { ok: false, code: "rate_limited" };
  }
  return {
    ok: true,
    view: {
      id: row.id,
      code: row.code,
      initialMinor: row.initial_minor,
      balanceMinor: row.balance_minor,
      // Utgånget men inte svept än: visas som utgånget.
      status:
        row.status === "active" && row.expires_at <= now
          ? "expired"
          : row.status,
      expiresAt: row.expires_at,
      recipientName: row.recipient_name,
      buyerName: row.buyer_name,
      greeting: row.greeting,
      theme: row.theme === "lime" ? "lime" : "lilac",
      timeZone: tzOrDefault(row.timezone),
    },
  };
}
