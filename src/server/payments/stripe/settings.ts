import "server-only";

import { z } from "zod";

import { platformFeeBps } from "@/config/platform-fee";
import { can } from "@/config/plans";
import { hasPerm, loadMember } from "@/server/db/permissions";
import { withOwnerTx, withServiceTx } from "@/server/db/tx";
import { businessCan } from "@/server/plans/entitlements";

import {
  createDashboardLink,
  loadConnectState,
  refreshConnectState,
  startOnboarding,
  type ConnectState,
} from "./accounts";
import { stripeEnabled } from "./client";
import type { OnlinePaymentMode } from "./checkout";

/**
 * WP-64 (D-044): ägarens sida av Stripe Connect (fliken Betalningar).
 * Behörighet: bara ägaren (utbetalningskonto och pengar, D-034). Alla
 * funktioner kontrollerar rollen själva — `businessId` kommer från sessionen.
 */

export type PaymentSettings = {
  state: ConnectState;
  mode: OnlinePaymentMode;
  /** Plattformens avgift i baspunkter för företagets plan. */
  feeBps: number;
  /** WP-73 (D-048): planen saknar betalning vid bokning (Gratis). */
  planLocked: boolean;
};

export type PaymentSettingsResult =
  | { ok: true; settings: PaymentSettings }
  | { ok: false; code: "forbidden" | "unavailable" };

async function isOwner(userId: string, businessId: string): Promise<boolean> {
  return withOwnerTx(userId, async (q) => {
    const m = await loadMember(q, userId, businessId);
    return m?.role === "owner" && hasPerm(m, "can_edit_settings");
  });
}

export async function loadPaymentSettings(
  userId: string,
  businessId: string,
  opts: { refresh?: boolean } = {},
): Promise<PaymentSettingsResult> {
  if (!stripeEnabled()) return { ok: false, code: "unavailable" };
  if (!(await isOwner(userId, businessId))) {
    return { ok: false, code: "forbidden" };
  }
  const state = opts.refresh
    ? await refreshConnectState(businessId)
    : await loadConnectState(businessId);
  const row = await withServiceTx(async (q) => {
    const r = await q.query<{
      online_payment: OnlinePaymentMode;
      plan: string;
    }>(
      `select online_payment, plan::text as plan from public.businesses where id = $1`,
      [businessId],
    );
    return r.rows[0];
  });
  return {
    ok: true,
    settings: {
      state,
      mode: row?.online_payment ?? "off",
      feeBps: platformFeeBps(row?.plan ?? "free"),
      planLocked: !can(row?.plan ?? "free", "online_payment"),
    },
  };
}

export type PaymentActionError =
  | "forbidden"
  | "unavailable"
  | "failed"
  | "needs_account"
  | "invalid_input"
  | "plan_locked";

const modeSchema = z.enum(["off", "optional", "required"]);

/** Av / Valfri / Obligatorisk. Valfri och Obligatorisk kräver ett konto som kan ta betalt. */
export async function setOnlinePaymentMode(
  userId: string,
  businessId: string,
  rawMode: unknown,
): Promise<{ ok: true } | { ok: false; code: PaymentActionError }> {
  const parsed = modeSchema.safeParse(rawMode);
  if (!parsed.success) return { ok: false, code: "invalid_input" };
  if (!stripeEnabled()) return { ok: false, code: "unavailable" };
  if (!(await isOwner(userId, businessId))) {
    return { ok: false, code: "forbidden" };
  }
  if (parsed.data !== "off") {
    // WP-73 (D-048): betalning vid bokning ingår från Starta.
    if (!(await businessCan(businessId, "online_payment"))) {
      return { ok: false, code: "plan_locked" };
    }
    const state = await loadConnectState(businessId);
    if (!state.canCharge) return { ok: false, code: "needs_account" };
  }
  // Servern skriver (service role) först efter ägarkontrollen ovan; kolumnen har
  // medvetet ingen grant till `authenticated` (personal kan annars gå via PostgREST).
  await withServiceTx(async (q) => {
    await q.query(
      `update public.businesses set online_payment = $2 where id = $1`,
      [businessId, parsed.data],
    );
  });
  return { ok: true };
}

export async function beginStripeOnboarding(
  userId: string,
  businessId: string,
  businessName: string,
): Promise<
  { ok: true; url: string } | { ok: false; code: PaymentActionError }
> {
  if (!(await isOwner(userId, businessId))) {
    return { ok: false, code: "forbidden" };
  }
  if (!(await businessCan(businessId, "online_payment"))) {
    return { ok: false, code: "plan_locked" };
  }
  return startOnboarding(businessId, businessName);
}

export async function openStripeDashboard(
  userId: string,
  businessId: string,
): Promise<
  { ok: true; url: string } | { ok: false; code: PaymentActionError }
> {
  if (!(await isOwner(userId, businessId))) {
    return { ok: false, code: "forbidden" };
  }
  return createDashboardLink(businessId);
}
