import "server-only";

import type Stripe from "stripe";

import { appHref } from "@/config/routes";
import { withServiceTx } from "@/server/db/tx";

import { appBaseUrl, getStripe, stripeEnabled } from "./client";

/**
 * WP-64 (D-044): företagets anslutna Stripe-konto (Express, Stripe-värd
 * onboarding via Account Links). Anroparen (ägarens server action) har redan
 * kontrollerat behörigheten; `businessId` kommer alltid från sessionen.
 * Kontoraden skrivs bara här och av webhooken (service role).
 */

export type ConnectStatus =
  | "unavailable" // nyckeln saknas / fel marknad
  | "none" // inget konto kopplat
  | "onboarding" // konto skapat, onboarding inte klar
  | "active" // kan ta betalt, inget som saknas
  | "action_required"; // Stripe behöver mer information / granskar

export type ConnectState = {
  status: ConnectStatus;
  /** Kan ta emot betalningar just nu (charges_enabled). */
  canCharge: boolean;
  payoutsEnabled: boolean;
};

type AccountRow = {
  stripe_account_id: string;
  charges_enabled: boolean;
  payouts_enabled: boolean;
  details_submitted: boolean;
  requirements_due: boolean;
};

export function statusOfAccount(
  row: Pick<
    AccountRow,
    "charges_enabled" | "details_submitted" | "requirements_due"
  >,
): Exclude<ConnectStatus, "unavailable" | "none"> {
  if (row.charges_enabled && !row.requirements_due) return "active";
  if (row.details_submitted) return "action_required";
  return "onboarding";
}

async function loadRow(businessId: string): Promise<AccountRow | undefined> {
  return withServiceTx(async (q) => {
    const r = await q.query<AccountRow>(
      `select stripe_account_id, charges_enabled, payouts_enabled,
              details_submitted, requirements_due
         from public.stripe_accounts where business_id = $1`,
      [businessId],
    );
    return r.rows[0];
  });
}

/** Kan företaget ta emot kundbetalningar online just nu? Används av bokningssidan. */
export async function businessCanTakeOnlinePayments(
  businessId: string,
): Promise<boolean> {
  if (!stripeEnabled()) return false;
  const row = await loadRow(businessId);
  return row?.charges_enabled === true;
}

export async function loadConnectState(
  businessId: string,
): Promise<ConnectState> {
  if (!stripeEnabled()) {
    return { status: "unavailable", canCharge: false, payoutsEnabled: false };
  }
  const row = await loadRow(businessId);
  if (!row) return { status: "none", canCharge: false, payoutsEnabled: false };
  return {
    status: statusOfAccount(row),
    canCharge: row.charges_enabled,
    payoutsEnabled: row.payouts_enabled,
  };
}

/** Skriver Stripes kontostatus till raden (hämtad från API:t, aldrig ur payloaden). */
export async function syncAccount(accountId: string): Promise<void> {
  const acct = await getStripe().accounts.retrieve(accountId);
  const due =
    (acct.requirements?.currently_due?.length ?? 0) > 0 ||
    (acct.requirements?.past_due?.length ?? 0) > 0;
  await withServiceTx(async (q) => {
    await q.query(
      `update public.stripe_accounts
          set charges_enabled = $2, payouts_enabled = $3,
              details_submitted = $4, requirements_due = $5
        where stripe_account_id = $1`,
      [
        accountId,
        acct.charges_enabled === true,
        acct.payouts_enabled === true,
        acct.details_submitted === true,
        due,
      ],
    );
  });
}

/** Uppdaterar status för företagets konto (anropas när ägaren kommer tillbaka från Stripe). */
export async function refreshConnectState(
  businessId: string,
): Promise<ConnectState> {
  if (!stripeEnabled()) return loadConnectState(businessId);
  const row = await loadRow(businessId);
  if (row) {
    try {
      await syncAccount(row.stripe_account_id);
    } catch {
      // Stripe nåddes inte: visa senast kända status; webhooken rättar senare.
    }
  }
  return loadConnectState(businessId);
}

export type OnboardingResult =
  { ok: true; url: string } | { ok: false; code: "unavailable" | "failed" };

/**
 * Skapar kontot första gången och returnerar en engångslänk till Stripes
 * onboarding (Account Link). Samma funktion används för att fortsätta en
 * påbörjad onboarding och för "åtgärd krävs" (Stripe visar vad som saknas).
 */
export async function startOnboarding(
  businessId: string,
  businessName: string,
): Promise<OnboardingResult> {
  if (!stripeEnabled()) return { ok: false, code: "unavailable" };
  try {
    const stripe = getStripe();
    let row = await loadRow(businessId);
    if (!row) {
      const acct = await stripe.accounts.create(
        {
          type: "express",
          country: "SE",
          business_profile: { name: businessName },
          capabilities: {
            card_payments: { requested: true },
            transfers: { requested: true },
          },
          metadata: { business_id: businessId },
        },
        { idempotencyKey: `acct-create:${businessId}` },
      );
      await withServiceTx(async (q) => {
        await q.query(
          `insert into public.stripe_accounts (business_id, stripe_account_id)
           values ($1, $2) on conflict (business_id) do nothing`,
          [businessId, acct.id],
        );
      });
      row = await loadRow(businessId);
      if (!row) return { ok: false, code: "failed" };
    }
    const page = `${appBaseUrl()}${appHref("appAjustesPagos")}`;
    const link = await stripe.accountLinks.create({
      account: row.stripe_account_id,
      type: "account_onboarding",
      refresh_url: `${page}?stripe=refresh`,
      return_url: `${page}?stripe=return`,
    });
    return { ok: true, url: link.url };
  } catch {
    return { ok: false, code: "failed" };
  }
}

export type DashboardLinkResult =
  { ok: true; url: string } | { ok: false; code: "unavailable" | "failed" };

/** Engångslänk till företagets Stripe Express-dashboard. */
export async function createDashboardLink(
  businessId: string,
): Promise<DashboardLinkResult> {
  if (!stripeEnabled()) return { ok: false, code: "unavailable" };
  const row = await loadRow(businessId);
  if (!row?.details_submitted) return { ok: false, code: "unavailable" };
  try {
    const link: Stripe.LoginLink = await getStripe().accounts.createLoginLink(
      row.stripe_account_id,
    );
    return { ok: true, url: link.url };
  } catch {
    return { ok: false, code: "failed" };
  }
}
