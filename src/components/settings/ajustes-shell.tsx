"use client";

// Skalet för /app/ajustes/[flik] (WP-55): ägarens feedback 2026-09-30 ("Inställningsfliken
// är extremt lång — bättre att separera i flikar. En riktig användarvänlig panel.") — en
// lång skärm med alla sektioner staplade som kort blir nio flikar, varje flik en egen rutt
// (`ajustes-tabs.ts`). Ingen *.dc.html-referens för den här navigeringen: Ajustes har aldrig
// haft en egen skalenlig skärmreferens (se `ajustes-screen.tsx`s gamla filkommentar, borttagen
// här) — bara tokens och redan godkända mönster: Pill-formspråket (`ui/pill.tsx`, `bg-ink`/
// `text-on-dark` vs `bg-surface`/`text-muted`) för flikarna, `NavRailLink`s
// `aria-current="page"`-mönster (`ui/nav-rail.tsx`) i stället för `role="tablist"`/
// `aria-pressed`: varje flik är en egen sida (riktig `<Link>`, fungerar utan JS), inte ett
// enda widgets tillstånd.
//
// Dator (≥ lg): vänsterkolumn (ikon + namn, aktiv = `bg-ink`/`text-on-dark`), innehållet
// använder bredden (max 4xl, inte en smal centrerad kolumn som förut). Mobil: horisontellt
// rullande pill-rad överst, innehållet under.
import Link from "next/link";
import { useRouter } from "next/navigation";
import type { ReactNode } from "react";

import { AppShell } from "@/components/dashboard/app-shell";
import { MainNav } from "@/components/dashboard/main-nav";
import { OwnerMobileTabBar } from "@/components/mobile/owner-tab-bar";
import type {
  MyProfileActions,
  MyProfileData,
} from "@/components/shared/my-profile-dialog";
import {
  NotificationBell,
  type NotificationBellResult,
  type PendingRequestItem,
} from "@/components/shared/notification-bell";
import { TuLinkCard } from "@/components/shared/tu-link-card";
import { UserMenu } from "@/components/shared/user-menu";
import { cn } from "@/components/ui/cn";
import { PageHeader } from "@/components/ui/page-header";
import { nav } from "@/i18n";
import { initialsOf } from "@/lib/format/initials";

import type { AjustesTabItem, AjustesTabKey } from "./ajustes-tabs";

function TabLink({
  tab,
  active,
  className,
}: {
  tab: AjustesTabItem;
  active: boolean;
  className?: string;
}) {
  return (
    <Link
      href={tab.href}
      prefetch={false}
      aria-current={active ? "page" : undefined}
      className={cn(
        "flex items-center gap-2 rounded-control text-13 font-semibold whitespace-nowrap transition-colors duration-150 ease-out focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink focus-visible:transition-none",
        active
          ? "bg-ink font-bold text-on-dark"
          : "text-muted hover:bg-surface",
        className,
      )}
    >
      {tab.icon}
      {tab.label}
    </Link>
  );
}

export type AjustesShellProps = {
  active: AjustesTabKey;
  tabs: readonly AjustesTabItem[];
  business: { slug: string; name: string };
  /** WP-47: namnet till profilmenyn (UserMenu), samma `ownerNameParts` som Inicio/Hoy. */
  owner: { name: string };
  /** `logout` (server action). `undefined` i design lab. */
  onLogout?: () => void | Promise<void>;
  /** WP-24 (D-034): döljer länken till Caja i `MainNav`/`OwnerMobileTabBar`. */
  canViewReports?: boolean;
  /** WP-45 (D-033): klockan i topprraden. `undefined` döljer den. */
  pendingRequests?: readonly PendingRequestItem[];
  onConfirmRequest?: (bookingId: string) => Promise<NotificationBellResult>;
  onDeclineRequest?: (
    bookingId: string,
    reason?: string,
  ) => Promise<NotificationBellResult>;
  /** WP-46: "Min profil" i kontomenyn. `undefined` döljer menyposten (ägare utan egen
   * personalrad, design lab). */
  myProfile?: MyProfileData;
  myProfileActions?: MyProfileActions;
  children: ReactNode;
};

export function AjustesShell({
  active,
  tabs,
  business,
  owner,
  onLogout,
  canViewReports,
  pendingRequests,
  onConfirmRequest,
  onDeclineRequest,
  myProfile,
  myProfileActions,
  children,
}: AjustesShellProps) {
  const router = useRouter();
  const publicPageHref = `/${business.slug}`;

  return (
    <AppShell
      rail={
        <MainNav
          active="ajustes"
          onLogout={onLogout}
          canViewReports={canViewReports}
        />
      }
      mobileTabBar={
        <OwnerMobileTabBar
          active="ajustes"
          className="lg:hidden"
          canViewReports={canViewReports}
        />
      }
      onLogout={onLogout}
      pendingRequests={pendingRequests}
      onConfirmRequest={onConfirmRequest}
      onDeclineRequest={onDeclineRequest}
    >
      <PageHeader
        variant="desktop"
        title={nav.ajustes}
        actions={
          <>
            {onConfirmRequest && onDeclineRequest ? (
              <NotificationBell
                requests={pendingRequests ?? []}
                onConfirm={async (bookingId) => {
                  const result = await onConfirmRequest(bookingId);
                  if (result.ok) router.refresh();
                  return result;
                }}
                onDecline={async (bookingId, reason) => {
                  const result = await onDeclineRequest(bookingId, reason);
                  if (result.ok) router.refresh();
                  return result;
                }}
                withTooltip
              />
            ) : null}
            <span className="hidden lg:contents">
              <UserMenu
                name={owner.name}
                initials={initialsOf(owner.name)}
                variant="pill"
                publicPageHref={publicPageHref}
                onLogout={onLogout}
                myProfile={myProfile}
                myProfileActions={myProfileActions}
              />
            </span>
            <span className="contents lg:hidden">
              <UserMenu
                name={owner.name}
                initials={initialsOf(owner.name)}
                variant="avatar"
                publicPageHref={publicPageHref}
                onLogout={onLogout}
                myProfile={myProfile}
                myProfileActions={myProfileActions}
              />
            </span>
          </>
        }
      />

      <TuLinkCard slug={business.slug} businessName={business.name} />

      <nav
        aria-label={nav.secciones}
        className="-mx-5 flex gap-2 overflow-x-auto px-5 lg:hidden"
      >
        {tabs.map((tab) => (
          <TabLink
            key={tab.key}
            tab={tab}
            active={tab.key === active}
            className="h-11 shrink-0 px-4"
          />
        ))}
      </nav>

      <div className="flex flex-col gap-6 lg:min-h-0 lg:flex-1 lg:flex-row lg:items-start lg:gap-8">
        <nav
          aria-label={nav.secciones}
          className="hidden shrink-0 flex-col gap-1 lg:flex lg:w-60"
        >
          {tabs.map((tab) => (
            <TabLink
              key={tab.key}
              tab={tab}
              active={tab.key === active}
              className="px-3 py-2.5"
            />
          ))}
        </nav>

        <div className="flex w-full max-w-4xl flex-col gap-6 lg:min-h-0 lg:flex-1 lg:self-stretch lg:overflow-y-auto lg:pb-2">
          {children}
        </div>
      </div>
    </AppShell>
  );
}
