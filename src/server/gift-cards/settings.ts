import "server-only";

import { hasPerm, loadMember } from "@/server/db/permissions";
import { withOwnerTx, withServiceTx } from "@/server/db/tx";
import { loadConnectState } from "@/server/payments/stripe/accounts";
import { businessCan } from "@/server/plans/entitlements";

import { giftCardsEnabled } from "./checkout";

/**
 * WP-77 (D-058): Inställningar → Betalningar, reglaget "Sälj presentkort"
 * (ägaren; av som standard). Påslaget kräver planfunktionen `online_payment`
 * (Starta och uppåt, D-048) och ett Stripe-konto som kan ta betalt. Kolumnen
 * har ingen grant till `authenticated` för update — servern skriver efter
 * ägarkontrollen (som `online_payment`).
 */
export type GiftCardSettingResult =
  | { ok: true }
  | {
      ok: false;
      code: "forbidden" | "unavailable" | "plan_locked" | "needs_account";
    };

async function isOwner(userId: string, businessId: string): Promise<boolean> {
  return withOwnerTx(userId, async (q) => {
    const m = await loadMember(q, userId, businessId);
    return m?.role === "owner" && hasPerm(m, "can_edit_settings");
  });
}

export async function loadGiftCardsSetting(
  businessId: string,
): Promise<boolean> {
  return withServiceTx(async (q) => {
    const r = await q.query<{ on: boolean }>(
      `select gift_cards_enabled as on from public.businesses where id = $1`,
      [businessId],
    );
    return r.rows[0]?.on ?? false;
  });
}

export async function setGiftCardsEnabled(
  userId: string,
  businessId: string,
  enabled: boolean,
): Promise<GiftCardSettingResult> {
  if (!giftCardsEnabled()) return { ok: false, code: "unavailable" };
  if (!(await isOwner(userId, businessId))) {
    return { ok: false, code: "forbidden" };
  }
  if (enabled) {
    if (!(await businessCan(businessId, "online_payment"))) {
      return { ok: false, code: "plan_locked" };
    }
    const state = await loadConnectState(businessId);
    if (!state.canCharge) return { ok: false, code: "needs_account" };
  }
  await withServiceTx((q) =>
    q.query(
      `update public.businesses set gift_cards_enabled = $2 where id = $1`,
      [businessId, enabled],
    ),
  );
  return { ok: true };
}
