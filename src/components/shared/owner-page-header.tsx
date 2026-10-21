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
//   primärknapp ("+ Nueva reserva"). Skicka EN enda nod (ett element eller en `<>…</>` med
//   flera, om flera knappar behövs).
//
// Data (klockans förfrågningar, ägarens namn, "Min profil", `onLogout` …) kommer INTE som
// props här — de hämtas från `<OwnerChromeProvider>` (owner-chrome.tsx) via kontext, satt av
// AppShell (dashboard/app-shell.tsx) eller av skärmen själv när den inte använder AppShell
// (Hoy, se mobile/hoy-screen.tsx). Det gör anropet på varje skärm till bara
// `<OwnerPageHeader title={…} />`.
//
// Responsivt: EN enda `<header>` (bygger inte på `ui/page-header.tsx` — den används
// oförändrad av skärmar som inte migrerat än, t.ex. Clientes/Caja/Blixttider/Ajustes, och
// stödjer inte en gemensam responsiv header utan att dupliceras). Titel/kontextrad byter
// plats och storlek med `order`/`lg:`-klasser (ingen duplicerad `<h1>`). `NotificationBell`
// renderas EN gång (den växlar redan själv mellan popover/bottenark via
// `useCompactViewport`). `UserMenu` renderas två gånger — pill (skrivbordet) och avatar
// (mobil), dolda med `hidden lg:…`/`…lg:hidden` — samma mönster som den gamla
// inicio-screen.tsx, och ofarligt i test: de två varianterna har olika tillgängliga namn
// (pillen visar namnet som text, avataren har `aria-label="Menú de …"`), till skillnad från
// om klockan hade duplicerats (samma namn två gånger kolliderar i t.ex. `getByRole`).
import type { ReactNode } from "react";
import { useRouter } from "next/navigation";

import { cn } from "@/components/ui/cn";
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
    <header
      className={cn("flex items-center gap-3 lg:h-13 lg:gap-4", className)}
    >
      <div className="flex min-w-0 flex-1 flex-col">
        {subtitle ? (
          <div className="order-1 text-13 text-muted lg:order-2 lg:text-14">
            {subtitle}
          </div>
        ) : null}
        <h1 className="order-2 mt-0.5 font-display text-30 font-semibold tracking-display lg:order-1 lg:mt-0 lg:text-32 lg:font-bold">
          {title}
        </h1>
      </div>
      {actions}
      {bell}
      <span className="hidden lg:contents">{profileMenu("pill")}</span>
      <span className="contents lg:hidden">{profileMenu("avatar")}</span>
    </header>
  );
}
