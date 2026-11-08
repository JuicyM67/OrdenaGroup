// /app/caja/tarjetas-regalo — WP-87 (D-073, port av SE WP-77/D-058):
// Caja → Tarjetas de regalo. "Vender" (betalt i salongen, metoden
// registreras), "Usar" (kod → saldo → valfri koppling till en bokning, som då
// blir betald), siffror (sålda kort är en skuld, inte försäljning), raden på
// bokningssidan och listan utan kod/köpare (RLS + kolumn-grants). Samma spärr
// som Caja (`can_view_reports`). Att sälja kräver planen (Emprende+); att
// använda ett kort gör det inte (kundens pengar).
import { ArrowLeft, Info } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";

import { logout } from "@/app/auth/actions";
import { AppShell } from "@/components/dashboard/app-shell";
import { MainNav } from "@/components/dashboard/main-nav";
import { GiftCardSellForm } from "@/components/gift-cards/sell-form";
import { ShowOnPageToggle } from "@/components/gift-cards/show-on-page-toggle";
import { TillRedeem } from "@/components/gift-cards/till-redeem";
import { VoidGiftCardButton } from "@/components/gift-cards/void-button";
import { OwnerMobileTabBar } from "@/components/mobile/owner-tab-bar";
import { UpgradeNotice } from "@/components/plans/upgrade-notice";
import { OwnerPageHeader } from "@/components/shared/owner-page-header";
import { IconButton } from "@/components/ui/icon-button";
import { strokeArrow } from "@/components/ui/icons";
import { GIFT_CARD_VALIDITY_MONTHS } from "@/config/gift-cards";
import { appHref, href } from "@/config/routes";
import { caja, comun, regalo } from "@/i18n";
import { formatMoney } from "@/lib/format/money";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { withServiceTx } from "@/server/db/tx";
import { loadBusinessGiftCards } from "@/server/gift-cards";
import { formatGiftCardDate } from "@/server/gift-cards/rules";
import { getCurrentMember } from "@/server/onboarding/owner-business";
import { ownerNameParts } from "@/server/owner/shared";
import { loadBusinessTz } from "@/server/payments/business-tz";
import { loadBusinessPlan } from "@/server/plans/entitlements";
import { systemClock } from "@/server/scheduling/clock";

import {
  confirmMyPhotoUploadAction,
  createMyPhotoUploadAction,
  deleteMyPhotoAction,
  loadMyProfileAction,
  updateMyTitleAction,
} from "../../my-profile-actions";
import {
  sellGiftCardAction,
  setGiftCardsOnPageAction,
  tillGiftCardAction,
  voidGiftCardAction,
} from "./actions";

export const metadata: Metadata = {
  robots: { index: false, follow: false },
};

export const dynamic = "force-dynamic";

const t = regalo.caja;

type SearchParams = Promise<Record<string, string | string[] | undefined>>;

function methodLabel(m: string | null): string | null {
  return m === "cash" || m === "card_terminal" || m === "transfer"
    ? caja.metodo[m]
    : null;
}

export default async function CajaTarjetasRegaloPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");
  const current = await getCurrentMember(user.id);
  if (!current) redirect(appHref("appOnboarding"));
  if (!current.view.perms.can_view_reports) redirect(appHref("appAgenda"));

  const sp = await searchParams;
  const reserva =
    typeof sp.reserva === "string" && /^[0-9a-f-]{36}$/i.test(sp.reserva)
      ? sp.reserva
      : "";
  const owner = ownerNameParts(user.email);
  const now = systemClock();
  const [myProfile, summary, tz, plan] = await Promise.all([
    loadMyProfileAction(),
    loadBusinessGiftCards(user.id, current.business.id, now),
    withServiceTx((q) => loadBusinessTz(q, current.business.id)),
    loadBusinessPlan(current.business.id),
  ]);

  const stats = [
    { label: t.vendidoHoy, value: summary.soldTodayMinor },
    { label: t.pendiente, value: summary.outstandingMinor },
    { label: t.vendidoAno, value: summary.soldYearMinor },
    { label: t.usado, value: summary.redeemedMinor },
    { label: t.vencido, value: summary.expiredMinor },
  ];

  return (
    <AppShell
      rail={<MainNav active="caja" onLogout={logout} canViewReports />}
      mobileTabBar={
        <OwnerMobileTabBar active="caja" className="lg:hidden" canViewReports />
      }
      onLogout={logout}
      ownerName={owner.name}
      publicPageHref={`/${current.business.slug}`}
      canViewReports
      myProfile={myProfile ?? undefined}
      myProfileActions={
        myProfile
          ? {
              updateTitle: updateMyTitleAction,
              createPhotoUpload: createMyPhotoUploadAction,
              confirmPhotoUpload: confirmMyPhotoUploadAction,
              deletePhoto: deleteMyPhotoAction,
            }
          : undefined
      }
      hideMobileTopBar
    >
      <OwnerPageHeader
        title={
          <span className="flex items-center gap-3">
            <IconButton label={comun.volver} tone="ghost" size={36} asChild>
              <Link href={appHref("appCaja")}>
                <ArrowLeft
                  aria-hidden="true"
                  className="size-4.5"
                  strokeWidth={strokeArrow}
                />
              </Link>
            </IconButton>
            {t.titulo}
          </span>
        }
      />

      <div className="flex flex-col gap-5 lg:flex-row lg:items-start">
        <div className="flex min-w-0 flex-1 flex-col gap-5">
          <TillRedeem action={tillGiftCardAction} initialBookingId={reserva} />
          {summary.canSell ? (
            <GiftCardSellForm
              action={sellGiftCardAction}
              businessName={current.business.name}
              validityMonths={GIFT_CARD_VALIDITY_MONTHS}
            />
          ) : (
            <UpgradeNotice
              feature="gift_cards"
              manualBilling={plan.billingMode === "manual"}
              linkHref={
                current.view.role === "owner" ? undefined : href("precios")
              }
            />
          )}
        </div>
        <aside className="flex flex-col gap-3.5 rounded-card bg-surface p-5.5 lg:w-90 lg:shrink-0">
          <h2 className="font-display text-18 font-extrabold">{t.cifras}</h2>
          <dl className="grid grid-cols-2 gap-2.5">
            {stats.map((s) => (
              <div key={s.label} className="rounded-control bg-canvas p-3.5">
                <dt className="text-12 text-muted">{s.label}</dt>
                <dd className="font-display text-24 font-extrabold">
                  {formatMoney(s.value)}
                </dd>
              </div>
            ))}
          </dl>
          {summary.soldToday.length > 0 ? (
            <ul className="flex flex-col gap-1 text-13 text-ink-soft">
              {summary.soldToday.map((m) => (
                <li key={m.method}>
                  {t.porMetodo({
                    metodo: methodLabel(m.method) ?? m.method,
                    monto: formatMoney(m.amountMinor),
                  })}
                </li>
              ))}
            </ul>
          ) : null}
          <p className="flex gap-2.5 text-13 leading-relaxed text-muted">
            <span className="inline-flex size-6.5 flex-none items-center justify-center rounded-full bg-sky text-ink">
              <Info aria-hidden="true" className="size-3.5" strokeWidth={2.2} />
            </span>
            {t.notaDeuda}
          </p>
          {summary.canEditSettings && summary.canSell ? (
            <div className="flex flex-col gap-2 border-t border-line pt-3.5">
              <h3 className="text-14 font-bold text-ink">{t.mostrar.titulo}</h3>
              <ShowOnPageToggle
                initial={summary.showOnPage}
                action={setGiftCardsOnPageAction}
              />
            </div>
          ) : null}
          <a href="#tr-lista" className="text-14 font-bold text-ink">
            {t.lista}
          </a>
        </aside>
      </div>

      <section id="tr-lista" className="mt-6 flex flex-col gap-3">
        <h2 className="font-display text-20 font-semibold text-ink">
          {t.lista}
        </h2>
        {summary.items.length === 0 ? (
          <p className="rounded-card bg-surface p-5 text-14 text-ink-soft">
            {t.vacio}
          </p>
        ) : (
          <ul className="flex flex-col divide-y divide-line overflow-hidden rounded-card bg-surface">
            {summary.items.map((g) => {
              const metodo = methodLabel(g.method);
              return (
                <li
                  key={g.id}
                  className="flex flex-wrap items-center justify-between gap-x-4 gap-y-1 px-4 py-3"
                >
                  <span className="flex min-w-0 flex-1 flex-col">
                    <b className="text-14 text-ink">
                      {formatMoney(g.balanceMinor)} /{" "}
                      {formatMoney(g.initialMinor)}
                    </b>
                    <span className="text-12 text-muted">
                      {t.vendida({
                        fecha: formatGiftCardDate(g.purchasedAt, tz),
                      })}
                      {metodo ? ` · ${metodo}` : ""} ·{" "}
                      {t.vence({ fecha: formatGiftCardDate(g.expiresAt, tz) })}
                    </span>
                  </span>
                  <span className="flex items-center gap-3">
                    {g.canVoid ? (
                      <VoidGiftCardButton
                        giftCardId={g.id}
                        action={voidGiftCardAction}
                      />
                    ) : null}
                    <span
                      className={`rounded-badge px-2 py-0.5 text-11 font-bold ${
                        g.status === "active"
                          ? "bg-success-bg text-success-fg"
                          : "bg-line text-muted"
                      }`}
                    >
                      {g.status === "active" && g.balanceMinor < g.initialMinor
                        ? regalo.estados.parcial
                        : regalo.estados[g.status]}
                    </span>
                  </span>
                </li>
              );
            })}
          </ul>
        )}
      </section>
    </AppShell>
  );
}
