// /app/caja/regalos (SE `/app/kassa/presentkort`) — WP-77 (D-058): Kassa →
// Presentkort (designen `presentkort/Kassa.dc.html`). "Lös in presentkort"
// med kod + siffror: sålt i år och kvar att lösa in är en SKULD, inte
// försäljning; inlösen räknas som betalning på bokningen. Listan utan kod och
// köpare (RLS + kolumn-grants). Samma spärr som Kassan (`can_view_reports`).
import { ArrowLeft, Info } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";

import { logout } from "@/app/auth/actions";
import { AppShell } from "@/components/dashboard/app-shell";
import { MainNav } from "@/components/dashboard/main-nav";
import { TillRedeem } from "@/components/gift-cards/till-redeem";
import { OwnerMobileTabBar } from "@/components/mobile/owner-tab-bar";
import { OwnerPageHeader } from "@/components/shared/owner-page-header";
import { IconButton } from "@/components/ui/icon-button";
import { strokeArrow } from "@/components/ui/icons";
import { appHref } from "@/config/routes";
import { comun, regalo } from "@/i18n";
import { APP_TZ, formatDate } from "@/lib/format/dates";
import { formatMoney } from "@/lib/format/money";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { giftCardsEnabled, loadBusinessGiftCards } from "@/server/gift-cards";
import { formatGiftCardDate } from "@/server/gift-cards/rules";
import { getCurrentMember } from "@/server/onboarding/owner-business";
import { ownerNameParts } from "@/server/owner/shared";
import { systemClock } from "@/server/scheduling/clock";

import {
  confirmMyPhotoUploadAction,
  createMyPhotoUploadAction,
  deleteMyPhotoAction,
  loadMyProfileAction,
  updateMyTitleAction,
} from "../../my-profile-actions";
import { tillGiftCardAction } from "./actions";

export const metadata: Metadata = {
  robots: { index: false, follow: false },
};

export const dynamic = "force-dynamic";

const t = regalo.caja;

function day(iso: string): string {
  return formatDate(new Date(iso), APP_TZ, "weekdayDayMonthShort");
}

export default async function CajaRegalosPage() {
  if (!giftCardsEnabled()) notFound();
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");
  const current = await getCurrentMember(user.id);
  if (!current) redirect(appHref("appOnboarding"));
  if (!current.view.perms.can_view_reports) redirect(appHref("appAgenda"));

  const owner = ownerNameParts(user.email);
  const [myProfile, summary] = await Promise.all([
    loadMyProfileAction(),
    loadBusinessGiftCards(user.id, current.business.id, systemClock()),
  ]);

  const stats = [
    { label: t.vendidoAno, value: summary.soldYearMinor },
    { label: t.pendiente, value: summary.outstandingMinor },
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
        <div className="min-w-0 flex-1">
          <TillRedeem
            action={tillGiftCardAction}
            texts={{
              title: t.canjear,
              code: t.codigo,
              lookup: t.buscar,
              balance: t.saldo,
              validUntil: t.validoHasta,
              status: t.estado,
              useFor: t.usarEn,
              noBooking: t.sinReserva,
              amount: t.monto,
              cardLabel: regalo.compra.tarjeta.etiqueta,
              redeemTpl: t.descontar({ monto: "{monto}" }),
              redeemNoAmount: t.descontarSinMonto,
            }}
          />
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
          <p className="flex gap-2.5 text-13 leading-relaxed text-muted">
            <span className="inline-flex size-6.5 flex-none items-center justify-center rounded-full bg-sky text-ink">
              <Info aria-hidden="true" className="size-3.5" strokeWidth={2.2} />
            </span>
            {t.nota}
          </p>
          <p className="text-13 leading-relaxed text-muted">{t.notaDeuda}</p>
          <a href="#pk-lista" className="text-14 font-bold text-ink">
            {t.lista}
          </a>
        </aside>
      </div>

      <section id="pk-lista" className="mt-6 flex flex-col gap-3">
        <h2 className="font-display text-20 font-semibold text-ink">
          {t.lista}
        </h2>
        {summary.items.length === 0 ? (
          <p className="rounded-card bg-surface p-5 text-14 text-ink-soft">
            {t.vacio}
          </p>
        ) : (
          <ul className="flex flex-col divide-y divide-line overflow-hidden rounded-card bg-surface">
            {summary.items.map((g) => (
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
                    {t.comprada({ fecha: day(g.purchasedAt) })} ·{" "}
                    {t.vence({
                      fecha: formatGiftCardDate(new Date(g.expiresAt), APP_TZ),
                    })}
                  </span>
                </span>
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
              </li>
            ))}
          </ul>
        )}
      </section>
    </AppShell>
  );
}
