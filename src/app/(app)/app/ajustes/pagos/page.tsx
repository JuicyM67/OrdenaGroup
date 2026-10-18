// /app/ajustes/pagos (WP-64, D-044): Stripe Connect — bara SE och bara när
// Stripe är konfigurerat (`requireAjustesTab` omdirigerar annars).
import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { logout } from "@/app/auth/actions";
import { UpgradeNotice } from "@/components/plans/upgrade-notice";
import { AjustesShell } from "@/components/settings/ajustes-shell";
import { PaymentsSection } from "@/components/settings/payments-section";
import { appHref, regaloHref } from "@/config/routes";
import { nav, regalo } from "@/i18n";
import { giftCardsEnabled } from "@/server/gift-cards";
import { loadGiftCardsSetting } from "@/server/gift-cards/settings";
import { loadPaymentSettings } from "@/server/payments/stripe/settings";

import { planCan } from "@/server/plans/entitlements";

import { requireAjustesTab } from "../access";
import {
  approveCancelRequestAction,
  confirmRequestAction,
  declineCancelRequestAction,
  declineRequestAction,
} from "../actions";
import {
  openStripeDashboardAction,
  startStripeOnboardingAction,
  updateGiftCardsAction,
  updateOnlinePaymentModeAction,
} from "../pagos-actions";

export const metadata: Metadata = {
  title: nav.ajustes,
  robots: { index: false, follow: false },
};

export const dynamic = "force-dynamic";

type SearchParams = Promise<Record<string, string | string[] | undefined>>;

export default async function AjustesPagosPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const ctx = await requireAjustesTab("pagos");
  const sp = await searchParams;
  // Tillbaka från Stripe: läs kontots status direkt (webhooken kan vara en stund efter).
  const refresh = sp.stripe === "return" || sp.stripe === "refresh";
  const loaded = await loadPaymentSettings(
    ctx.userId,
    ctx.current.business.id,
    {
      refresh,
    },
  );
  if (!loaded.ok) redirect(appHref("appAgenda"));
  const { state, mode, feeBps } = loaded.settings;
  // `unavailable` kan inte nås här (fliken är dold utan nycklar), men typen kräver ett val.
  const status = state.status === "unavailable" ? "none" : state.status;
  // WP-77 (D-058): "Sälj presentkort" — bara när Stripe är aktivt och planen
  // har onlinebetalning.
  const planOk = planCan(ctx.plan, "online_payment");
  const showGiftCards = giftCardsEnabled() && planOk && state.canCharge;
  const giftCardsOn = showGiftCards
    ? await loadGiftCardsSetting(ctx.current.business.id)
    : false;
  const tg = regalo.ajustes;
  const giftNotice =
    sp.presentkort === "ok"
      ? tg.guardado
      : typeof sp.presentkort === "string"
        ? sp.presentkort === "needs_account"
          ? tg.requiereStripe
          : tg.error
        : null;

  return (
    <AjustesShell
      active="pagos"
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
      {planCan(ctx.plan, "online_payment") ? null : (
        <UpgradeNotice
          feature="online_payment"
          linkHref={ctx.plansHref}
          manualBilling={ctx.plan.billingMode === "manual"}
        />
      )}
      <PaymentsSection
        status={status}
        canCharge={state.canCharge}
        mode={mode}
        feeBps={feeBps}
        onStart={startStripeOnboardingAction}
        onOpenDashboard={openStripeDashboardAction}
        onSaveMode={updateOnlinePaymentModeAction}
      />
      {showGiftCards ? (
        <section
          id="presentkort"
          aria-labelledby="presentkort-h"
          className="mt-5 flex flex-col gap-3 rounded-card bg-surface p-5"
        >
          <h2
            id="presentkort-h"
            className="font-display text-18 font-semibold text-ink"
          >
            {tg.titulo}
          </h2>
          <p className="text-14 leading-body text-ink-soft">{tg.texto}</p>
          {giftNotice ? (
            <p role="status" className="text-13 font-semibold text-ink">
              {giftNotice}
            </p>
          ) : null}
          <form
            action={updateGiftCardsAction}
            className="flex flex-wrap items-center gap-3"
          >
            <label className="flex items-center gap-2.5 text-14 font-semibold text-ink">
              <input
                type="checkbox"
                name="giftCards"
                defaultChecked={giftCardsOn}
                className="size-4.5 accent-ink"
              />
              {tg.toggle}
            </label>
            <button
              type="submit"
              className="h-10 rounded-control bg-ink px-4 text-14 font-bold text-on-dark focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink"
            >
              {tg.guardar}
            </button>
            {giftCardsOn ? (
              <a
                href={regaloHref(ctx.current.business.slug)}
                className="text-13 font-semibold text-ink underline underline-offset-2"
              >
                {tg.verPagina}
              </a>
            ) : null}
          </form>
        </section>
      ) : null}
    </AjustesShell>
  );
}
