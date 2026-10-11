// /app/caja/vales (SE `/app/kassa/vardebevis`) — WP-69 (D-057): företagets
// sålda värdebevis. Minsta möjliga yta: en serverrenderad lista under Kassan
// (samma spärr som Kassan, `can_view_reports`), utan kod och köpare (RLS +
// kolumn-grants). Försäljningen räknas på köpdagen; en tid bokad med
// värdebevis har inget kvar att ta betalt för (rabatt = pris), så intäkten
// räknas aldrig två gånger.
import { ArrowLeft } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";

import { logout } from "@/app/auth/actions";
import { AppShell } from "@/components/dashboard/app-shell";
import { MainNav } from "@/components/dashboard/main-nav";
import { OwnerMobileTabBar } from "@/components/mobile/owner-tab-bar";
import { OwnerPageHeader } from "@/components/shared/owner-page-header";
import { IconButton } from "@/components/ui/icon-button";
import { strokeArrow } from "@/components/ui/icons";
import { marketplaceEnabled } from "@/config/marketplace";
import { appHref } from "@/config/routes";
import { comun, vales } from "@/i18n";
import { APP_TZ, formatDate, formatTime } from "@/lib/format/dates";
import { formatMoney } from "@/lib/format/money";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { getCurrentMember } from "@/server/onboarding/owner-business";
import { ownerNameParts } from "@/server/owner/shared";
import { loadBusinessVouchers } from "@/server/vouchers";

import {
  confirmMyPhotoUploadAction,
  createMyPhotoUploadAction,
  deleteMyPhotoAction,
  loadMyProfileAction,
  updateMyTitleAction,
} from "../../my-profile-actions";

export const metadata: Metadata = {
  robots: { index: false, follow: false },
};

export const dynamic = "force-dynamic";

const t = vales.caja;

function day(iso: string): string {
  return formatDate(new Date(iso), APP_TZ, "weekdayDayMonthShort");
}

export default async function CajaValesPage() {
  if (!marketplaceEnabled()) notFound();
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
    loadBusinessVouchers(user.id, current.business.id),
  ]);

  const stats = [
    { label: t.vendidos, value: String(summary.sold) },
    { label: t.ingresos, value: formatMoney(summary.soldMinor) },
    { label: t.usados, value: String(summary.redeemed) },
    { label: t.pendientes, value: String(summary.open) },
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

      <div className="flex flex-col gap-5">
        <dl className="grid grid-cols-2 gap-3 lg:grid-cols-4">
          {stats.map((s) => (
            <div
              key={s.label}
              className="flex flex-col gap-1 rounded-tile bg-surface p-4"
            >
              <dt className="text-13 text-muted">{s.label}</dt>
              <dd className="font-display text-26 font-semibold text-ink">
                {s.value}
              </dd>
            </div>
          ))}
        </dl>
        <p className="text-13 leading-body text-muted">{t.nota}</p>

        {summary.items.length === 0 ? (
          <p className="rounded-card bg-surface p-5 text-14 text-ink-soft">
            {t.vacio}
          </p>
        ) : (
          <ul className="flex flex-col divide-y divide-line overflow-hidden rounded-card bg-surface">
            {summary.items.map((v) => (
              <li
                key={v.id}
                className="flex flex-wrap items-center justify-between gap-x-4 gap-y-1 px-4 py-3"
              >
                <span className="flex min-w-0 flex-1 flex-col">
                  <b className="truncate text-14 text-ink">{v.title}</b>
                  <span className="text-12 text-muted">
                    {t.columnas.comprado} {day(v.purchasedAt)}
                    {v.bookingStart
                      ? ` · ${t.hora({ fecha: `${day(v.bookingStart)} ${formatTime(new Date(v.bookingStart), APP_TZ)}` })}`
                      : ""}
                  </span>
                </span>
                <span className="text-14 font-semibold text-ink">
                  {formatMoney(v.priceMinor)}
                </span>
                <span
                  className={`rounded-badge px-2 py-0.5 text-11 font-bold ${
                    v.status === "active"
                      ? "bg-success-bg text-success-fg"
                      : v.status === "reserved"
                        ? "bg-pending-bg text-pending-fg"
                        : "bg-line text-muted"
                  }`}
                >
                  {vales.cuenta.estados[v.status]}
                </span>
              </li>
            ))}
          </ul>
        )}
      </div>
    </AppShell>
  );
}
