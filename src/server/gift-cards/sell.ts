import "server-only";

import { GIFT_CARD_VALIDITY_MONTHS } from "@/config/gift-cards";
import {
  giftCardSaleInput,
  giftCardSaleSchema,
  type GiftCardSaleErrorCode,
} from "@/lib/validation/gift-cards";
import { pgErrorCode } from "@/server/db/errors";
import { hasPerm, loadMember } from "@/server/db/permissions";
import { savepoint, withOwnerTx } from "@/server/db/tx";
import { loadPlanIn, planCan } from "@/server/plans/entitlements";

import { generateGiftCardCode, newGiftCardToken } from "./rules";

/**
 * WP-87 (D-073): sälj en tarjeta de regalo i salongen (Caja). Ingen
 * onlinebetalning: kunden betalar i kassan (efectivo/tarjeta/transferencia)
 * och försäljningen registreras med metoden. Körs med medlemmens JWT:
 * behörigheten (`can_view_reports`, som kassan) och planen kontrolleras här
 * OCH i `private.gift_card_issue_in_store` (databasens sista ord). Kort,
 * order, ledger `issue` och mejlen i utkorgen skapas i en transaktion.
 *
 * Koden och kortets länk (`viewToken`) returneras EN gång till ägaren (för
 * utskrift); databasen har bara koden (ej läsbar för medlemmar) och SHA-256
 * av token.
 */

export type SellGiftCardError =
  | GiftCardSaleErrorCode
  | "forbidden"
  | "plan_locked"
  | "unavailable"
  | "unexpected";

export type SellGiftCardResult =
  | {
      ok: true;
      giftCardId: string;
      code: string;
      viewToken: string;
      amount: number;
      expiresAt: Date;
      emailed: boolean;
    }
  | { ok: false; code: SellGiftCardError };

const MAX_CODE_ATTEMPTS = 3;

export async function sellGiftCard(
  userId: string,
  businessId: string,
  fd: FormData,
  now: Date,
): Promise<SellGiftCardResult> {
  const parsed = giftCardSaleSchema.safeParse(giftCardSaleInput(fd));
  if (!parsed.success) {
    const msg = parsed.error.issues[0]?.message;
    const known: readonly GiftCardSaleErrorCode[] = [
      "amount",
      "method",
      "theme",
      "name",
      "email",
      "greeting",
      "greeting_url",
    ];
    return {
      ok: false,
      code:
        msg && (known as readonly string[]).includes(msg)
          ? (msg as GiftCardSaleErrorCode)
          : "amount",
    };
  }
  const sale = parsed.data;
  const buyerToken = newGiftCardToken();
  const viewToken = newGiftCardToken();

  try {
    return await withOwnerTx(userId, async (q) => {
      const member = await loadMember(q, userId, businessId);
      if (!hasPerm(member, "can_view_reports")) {
        return { ok: false, code: "forbidden" } as const;
      }
      if (!planCan(await loadPlanIn(q, businessId), "gift_cards")) {
        return { ok: false, code: "plan_locked" } as const;
      }
      for (let attempt = 1; ; attempt++) {
        const code = generateGiftCardCode();
        try {
          const row = await savepoint(q, async () => {
            const r = await q.query<{
              outcome: string;
              gift_card_id: string | null;
              expires_at: Date | null;
            }>(
              `select outcome, gift_card_id, expires_at
                 from private.gift_card_issue_in_store(
                   $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)`,
              [
                businessId,
                sale.amount,
                sale.method,
                sale.buyerName,
                sale.buyerEmail,
                sale.recipientName,
                sale.recipientEmail,
                sale.greeting,
                sale.theme,
                GIFT_CARD_VALIDITY_MONTHS,
                code,
                buyerToken,
                viewToken,
                now,
              ],
            );
            return r.rows[0];
          });
          if (!row || row.outcome !== "issued" || !row.gift_card_id) {
            const outcome = row?.outcome;
            return {
              ok: false,
              code:
                outcome === "plan_locked" || outcome === "unavailable"
                  ? outcome
                  : outcome === "invalid"
                    ? "amount"
                    : "unexpected",
            } as const;
          }
          return {
            ok: true,
            giftCardId: row.gift_card_id,
            code,
            viewToken,
            amount: sale.amount,
            expiresAt: row.expires_at ?? now,
            emailed: sale.buyerEmail !== null || sale.recipientEmail !== null,
          } as const;
        } catch (e) {
          // Kodkollision (60 bitar, i praktiken aldrig): ny kod.
          if (pgErrorCode(e) === "23505" && attempt < MAX_CODE_ATTEMPTS) {
            continue;
          }
          throw e;
        }
      }
    });
  } catch (e) {
    if (pgErrorCode(e) === "42501") return { ok: false, code: "forbidden" };
    return { ok: false, code: "unexpected" };
  }
}
