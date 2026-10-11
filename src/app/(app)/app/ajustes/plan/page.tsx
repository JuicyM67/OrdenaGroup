// /app/ajustes/plan (SE /app/installningar/plan), WP-73 (D-048): aktuell plan,
// användning denna månad och vad planen innehåller. Bara ägaren (`ajustesTabVisible`).
// WP-76 (D-053): i SE även sms-krediter (saldo, köp, marknadsföring, historik).
// Retur från Stripe Checkout: `?sms=klart&session=…` krediterar idempotent här
// också (säkerhetsnät om webhooken dröjer), `?sms=avbrutet` visar en rad.
import type { Metadata } from "next";

import { logout } from "@/app/auth/actions";
import { AjustesShell } from "@/components/settings/ajustes-shell";
import {
  PlanBillingSection,
  type PlanBillingData,
} from "@/components/settings/plan-billing-section";
import { PlanSection } from "@/components/settings/plan-section";
import {
  SmsCreditsSection,
  type SmsCreditsSectionData,
  type SmsHistoryItem,
  type SmsReturnState,
} from "@/components/settings/sms-credits-card";
import { brand } from "@/config/brand";
import { can, minPlanFor } from "@/config/plans";
import { appHref, href } from "@/config/routes";
import { SMS_CREDIT_VALIDITY_MONTHS } from "@/config/sms-credits";
import { nav, planes, smsCreditos } from "@/i18n";
import {
  APP_TZ,
  formatLocalDate,
  toLocalDate,
  type LocalDate,
} from "@/lib/format/dates";
import { formatSek } from "@/lib/format/money";
import type { SmsCreditHistoryRow } from "@/lib/validation/sms-credits";
import {
  fulfillSmsCreditCheckout,
  loadSmsCreditsOverview,
  smsCreditsMarket,
  smsCreditsPurchasable,
} from "@/server/billing/sms-credits";
import {
  billingAvailable,
  loadBillingOverview,
  loadUpcomingAmount,
  syncFromCheckoutReturn,
} from "@/server/billing/subscriptions";
import { loadPlanUsage } from "@/server/plans/entitlements";

import { requireAjustesTab } from "../access";
import {
  approveCancelRequestAction,
  confirmRequestAction,
  declineCancelRequestAction,
  declineRequestAction,
} from "../actions";
import {
  buySmsCreditsAction,
  cancelSubscriptionAction,
  changePlanAction,
  openBillingPortalAction,
  previewPlanChangeAction,
  resumeSubscriptionAction,
  startSubscriptionAction,
} from "./actions";
import { buildBillingView } from "./billing-view";

export const metadata: Metadata = {
  title: nav.ajustes,
  robots: { index: false, follow: false },
};

export const dynamic = "force-dynamic";

type SearchParams = Record<string, string | string[] | undefined>;

const t = smsCreditos;

/** "12 augusti 2027" (dag, månad, år; installationens tidszon). */
function longDate(d: LocalDate): string {
  return `${formatLocalDate(d, "dayMonthLong")} ${d.slice(0, 4)}`;
}

/** Samma dag N månader fram (kalendermånad; 31:a → sista dagen). */
function addMonths(d: LocalDate, months: number): LocalDate {
  const [y, m, day] = d.split("-").map(Number) as [number, number, number];
  const total = y * 12 + (m - 1) + months;
  const ny = Math.floor(total / 12);
  const nm = (total % 12) + 1;
  const last = new Date(Date.UTC(ny, nm, 0)).getUTCDate();
  const dd = Math.min(day, last);
  return `${ny}-${String(nm).padStart(2, "0")}-${String(dd).padStart(2, "0")}` as LocalDate;
}

function historyItem(h: SmsCreditHistoryRow): SmsHistoryItem {
  const date = toLocalDate(new Date(h.at), APP_TZ);
  if (h.kind === "usage") {
    const month = (h.month ?? date) as LocalDate;
    return {
      id: h.id,
      date: `${formatLocalDate(month, "month")} ${month.slice(0, 4)}`,
      kind: "usage",
      credits: h.credits,
    };
  }
  const statusLabel =
    h.status === "refunded"
      ? t.historial.estado.reembolsado
      : h.status === "partially_refunded"
        ? t.historial.estado.reembolsoParcial
        : h.status === "expired"
          ? t.historial.estado.expirado
          : null;
  return {
    id: h.id,
    date: longDate(date),
    kind: "purchase",
    credits: h.credits,
    amount: formatSek(h.amountTotalOre ?? 0),
    statusLabel,
    ...(h.receiptUrl ? { receiptUrl: h.receiptUrl } : {}),
  };
}

async function returnState(
  sp: SearchParams,
  businessId: string,
): Promise<SmsReturnState> {
  const sms = typeof sp.sms === "string" ? sp.sms : undefined;
  if (sms === "avbrutet") return { kind: "cancelled" };
  if (sms !== "klart") return null;
  const session = typeof sp.session === "string" ? sp.session : "";
  if (!/^cs_[A-Za-z0-9_]{1,250}$/.test(session) || !smsCreditsPurchasable()) {
    return { kind: "processing" };
  }
  try {
    const r = await fulfillSmsCreditCheckout(session, {
      expectBusinessId: businessId,
    });
    if (r.status === "granted" || r.status === "already") {
      return { kind: "done", added: r.credits };
    }
    return r.status === "pending" ? { kind: "processing" } : null;
  } catch {
    // Stripe svarade inte: webhooken krediterar ändå.
    return { kind: "processing" };
  }
}

// ---------------------------------------------------------------------------
// WP-78 (D-059): abonnemanget (SE, `billingAvailable()`). Retur från Stripe
// Checkout: `?abonnemang=klart&session=…` synkar idempotent här också
// (samma funktion som webhooken), `?abonnemang=avbrutet` visar en rad.
// ---------------------------------------------------------------------------

async function billingReturn(
  sp: SearchParams,
  businessId: string,
): Promise<PlanBillingData["returnState"] | "done"> {
  const v = typeof sp.abonnemang === "string" ? sp.abonnemang : undefined;
  if (v === "avbrutet") return { kind: "cancelled" };
  if (v !== "klart") return null;
  const session = typeof sp.session === "string" ? sp.session : "";
  if (!/^cs_[A-Za-z0-9_]{1,250}$/.test(session)) return { kind: "processing" };
  try {
    const r = await syncFromCheckoutReturn(session, businessId);
    if (r === "done") return "done";
    return r === "processing" ? { kind: "processing" } : null;
  } catch {
    // Stripe svarade inte: webhooken synkar ändå.
    return { kind: "processing" };
  }
}

async function buildBilling(
  businessId: string,
  sp: SearchParams,
): Promise<PlanBillingData | null> {
  if (!billingAvailable()) return null;
  const ret = await billingReturn(sp, businessId);
  const ov = await loadBillingOverview(businessId);
  const sub = ov.subscription;
  const upcoming =
    sub &&
    (sub.status === "trialing" || sub.status === "active") &&
    !sub.cancelAtPeriodEnd
      ? await loadUpcomingAmount(businessId)
      : null;
  return buildBillingView(ov, upcoming, ret);
}

export default async function AjustesPlanPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  const sp = await searchParams;
  const ctx = await requireAjustesTab("plan");
  const businessId = ctx.current.business.id;
  const showSms = smsCreditsMarket();
  // Abonnemanget synkar retur först, så att planen nedan redan är uppdaterad.
  const billing = await buildBilling(businessId, sp);
  // Returen krediterar först, så att saldot nedan redan är uppdaterat.
  const ret = showSms ? await returnState(sp, businessId) : null;
  const allHistory = sp.historik === "alla";
  const [usage, overview] = await Promise.all([
    loadPlanUsage(businessId),
    showSms
      ? loadSmsCreditsOverview(businessId, { allHistory })
      : Promise.resolve(null),
  ]);

  let smsData: SmsCreditsSectionData | null = null;
  if (overview) {
    const today = toLocalDate(new Date(), APP_TZ);
    const firstNext = addMonths(`${today.slice(0, 8)}01` as LocalDate, 1);
    const planHref = appHref("appAjustesPlan");
    smsData = {
      planName: planes.nombres[usage.plan],
      month: formatLocalDate(today, "month").toLowerCase(),
      refillDate: formatLocalDate(firstNext, "dayMonthLong"),
      quota: usage.sms,
      balance: overview.balance,
      oldestExpiry: overview.nextExpiry
        ? longDate(toLocalDate(new Date(overview.nextExpiry), APP_TZ))
        : null,
      validUntil: longDate(addMonths(today, SMS_CREDIT_VALIDITY_MONTHS)),
      history: overview.history.map(historyItem),
      historyAllHref: overview.hasMoreHistory
        ? `${planHref}?historik=alla`
        : null,
      purchasable: smsCreditsPurchasable(),
      campaignsHref: can(usage.plan, "campaigns")
        ? appHref("appClientesUtskickNytt")
        : null,
      campaignsPlanName: planes.nombres[minPlanFor("campaigns")],
      plansHref: href("precios"),
      exampleLink: `${brand.domain ?? ""}/${ctx.current.business.slug}`,
      returnState: ret,
    };
  }

  return (
    <AjustesShell
      active="plan"
      tabs={ctx.tabs}
      business={ctx.current.business}
      owner={ctx.owner}
      onLogout={logout}
      canViewReports={ctx.current.view.perms.can_view_reports}
      pendingRequests={ctx.pendingRequests}
      notices={ctx.notices}
      onConfirmRequest={confirmRequestAction}
      onDeclineRequest={declineRequestAction}
      onApproveCancelRequest={approveCancelRequestAction}
      onDeclineCancelRequest={declineCancelRequestAction}
      myProfile={ctx.myProfile ?? undefined}
      myProfileActions={ctx.myProfileActions}
    >
      {billing ? (
        <PlanBillingSection
          data={billing}
          actions={{
            onStart: startSubscriptionAction,
            onPreview: previewPlanChangeAction,
            onChange: changePlanAction,
            onCancel: cancelSubscriptionAction,
            onResume: resumeSubscriptionAction,
            onPortal: openBillingPortalAction,
          }}
        />
      ) : null}
      {smsData ? (
        <SmsCreditsSection data={smsData} onBuy={buySmsCreditsAction} />
      ) : null}
      <PlanSection
        data={{
          plan: usage.plan,
          staff: usage.staff,
          services: usage.services,
          sms: usage.sms,
        }}
        hideSmsNotice={smsData !== null}
        hideChangeCard={billing !== null}
      />
    </AjustesShell>
  );
}
