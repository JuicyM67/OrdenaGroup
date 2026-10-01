"use client";

// OwnerPageHeader — WP-57 punkt 1 (ägarens UX-genomgång, "Ett gemensamt sidhuvud på alla
// flikar"): klockan och profilmenyn fanns tidigare bara på Inicio och Inställningar, med
// olika uppkoppling på varje skärm. Nu: EN komponent, samma plats för klockan
// (NotificationBell) och profilmenyn (UserMenu) på varje skärm som väljer att använda den.
//
// API:
//   <OwnerPageHeader title={…} subtitle={…}? actions={…}? />
// - `title` (obligatorisk): skärmens rubrik (page-title, t.ex. "Inicio", "Hoy").
// - `subtitle` (valfri): en kort kontextrad under/ovan titeln (samma roll som `PageHeader`s
//   `meta`, t.ex. "Jueves 1 de octubre · 3 reservas hoy").
// - `actions` (valfri): extra innehåll FÖRE klockan och profilmenyn — t.ex. en skärms egen
//   primärknapp ("+ Nueva reserva"). Renderas som ytterligare syskon i headerns egen
//   flex-rad (samma `gap` som mellan titel/klocka/profil, se ui/page-header.tsx) — skicka
//   EN enda nod (ett element eller en `<>…</>` med flera, om flera knappar behövs).
//
// Data (klockans förfrågningar, ägarens namn, "Min profil", `onLogout` …) kommer INTE som
// props här — de hämtas från `<OwnerChromeProvider>` (owner-chrome.tsx) via kontext, satt av
// AppShell (dashboard/app-shell.tsx) eller av skärmen själv när den inte använder AppShell
// (Hoy, se mobile/hoy-screen.tsx). Det gör anropet på varje skärm till bara
// `<OwnerPageHeader title={…} />`.
//
// Responsivt: headern renderas två gånger (en `variant="desktop"` dold under `lg`, en
// `variant="mobile"` dold från `lg`) — samma `hidden lg:…`/`…lg:hidden`-mönster som resten
// av ägarskalet (t.ex. UserMenus pill/avatar-växling i den gamla inicio-screen.tsx). Den
// dolda varianten har `display:none` och försvinner därför helt ur tillgänglighetsträdet,
// så det finns aldrig två hörbara `<h1>`/knappar samtidigt för skärmläsare.
import type { ReactNode } from "react";
import { useRouter } from "next/navigation";

import { PageHeader } from "@/components/ui/page-header";
import { initialsOf } from "@/lib/format/initials";

import { useOwnerChrome } from "./owner-chrome";
import { NotificationBell } from "./notification-bell";
import { UserMenu } from "./user-menu";

export type OwnerPageHeaderProps = {
  title: ReactNode;
  subtitle?: ReactNode;
  actions?: ReactNode;
  className?: string;
};

export function OwnerPageHeader({
  title,
  subtitle,
  actions,
  className,
}: OwnerPageHeaderProps) {
  const chrome = useOwnerChrome();
  const router = useRouter();
  const initials = initialsOf(chrome.ownerName);

  const onConfirmRequest = chrome.onConfirmRequest;
  const onDeclineRequest = chrome.onDeclineRequest;
  const bell =
    onConfirmRequest && onDeclineRequest ? (
      <NotificationBell
        requests={chrome.pendingRequests}
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
        onApproveCancel={
          chrome.onApproveCancelRequest
            ? async (bookingId) => {
                const result = await chrome.onApproveCancelRequest!(bookingId);
                if (result.ok) router.refresh();
                return result;
              }
            : undefined
        }
        onDeclineCancel={
          chrome.onDeclineCancelRequest
            ? async (bookingId) => {
                const result = await chrome.onDeclineCancelRequest!(bookingId);
                if (result.ok) router.refresh();
                return result;
              }
            : undefined
        }
        withTooltip
      />
    ) : null;

  function profileMenu(variant: "pill" | "avatar") {
    return (
      <UserMenu
        name={chrome.ownerName}
        initials={initials}
        avatarTone={chrome.avatarTone}
        variant={variant}
        publicPageHref={chrome.publicPageHref}
        onLogout={chrome.onLogout}
        myProfile={chrome.myProfile}
        myProfileActions={chrome.myProfileActions}
      />
    );
  }

  return (
    <>
      <div className="hidden lg:block">
        <PageHeader
          variant="desktop"
          title={title}
          meta={subtitle}
          className={className}
          actions={
            <>
              {actions}
              {bell}
              {profileMenu("pill")}
            </>
          }
        />
      </div>
      <div className="lg:hidden">
        <PageHeader
          variant="mobile"
          title={title}
          meta={subtitle}
          className={className}
          actions={
            <>
              {actions}
              {bell}
              {profileMenu("avatar")}
            </>
          }
        />
      </div>
    </>
  );
}
