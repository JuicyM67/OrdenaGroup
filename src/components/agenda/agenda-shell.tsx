// Se DESIGN.md §7 "AppShell (mobil)" och docs/design/reference/Agenda.dc.html (yttre <div>).
//
// WP-42: under `lg` döljs `rail` (profesional-remsan) och `aside` (månadskalender,
// personalfilter, teckenförklaring, väntelista) helt — de ryms inte och har redan en
// mobilväg (staff-växlaren i `agenda-screen.tsx`s mobila dagvy respektive
// `waitlist-summary`/filter som bara är skrivbordsgenvägar). `OwnerMobileTopBar` (delad med
// `app-shell.tsx`) ersätter dem, `mobileTabBar` läggs fast i botten av anroparen.
//
// WP-61 (ägarens UX-genomgång WP-57, "ett gemensamt sidhuvud på alla flikar"): sätter nu
// `OwnerChromeProvider` precis som `AppShell` gör, så `AgendaToolbar` kan läsa klockan/
// profilmenyn via `useOwnerChrome()` i stället för att varje anropare kopplar ihop dem själv.
// Samma data skickas vidare till `OwnerMobileTopBar` (`ownerName` m.fl.) för profilmenyn i den
// mobila topprraden — `ownerName` odefinierad (design lab) behåller den gamla ensamma
// utloggningsknappen där (bakåtkompatibelt, se owner-top-bar.tsx).
import type { ReactNode } from "react";

import { OwnerMobileTopBar } from "@/components/mobile/owner-top-bar";
import type { AvatarProps } from "@/components/ui/avatar";
import type {
  MyProfileActions,
  MyProfileData,
} from "@/components/shared/my-profile-dialog";
import type {
  NotificationBellResult,
  PendingRequestItem,
} from "@/components/shared/notification-bell";
import { OwnerChromeProvider } from "@/components/shared/owner-chrome";
import { cn } from "@/components/ui/cn";

export type AgendaShellProps = {
  rail: ReactNode;
  aside: ReactNode;
  children: ReactNode;
  /** `<OwnerMobileTabBar active="agenda" className="lg:hidden" />`. Valfri: design lab
   * skickar ingen. */
  mobileTabBar?: ReactNode;
  /** WP-47: `logout` (server action), vidarebefordras till `OwnerMobileTopBar`. */
  onLogout?: () => void | Promise<void>;
  /** WP-45: klockan i `OwnerMobileTopBar` (mobil, < lg) och (WP-61) `AgendaToolbar`
   * (skrivbordet, via `OwnerChromeProvider`). `undefined` döljer den (design lab). */
  pendingRequests?: readonly PendingRequestItem[];
  onConfirmRequest?: (bookingId: string) => Promise<NotificationBellResult>;
  onDeclineRequest?: (
    bookingId: string,
    reason?: string,
  ) => Promise<NotificationBellResult>;
  /** WP-56: se `notification-bell.tsx`. */
  onApproveCancelRequest?: (
    bookingId: string,
  ) => Promise<NotificationBellResult>;
  onDeclineCancelRequest?: (
    bookingId: string,
  ) => Promise<NotificationBellResult>;
  /**
   * WP-61: profilmenyn (`UserMenu`), samma data som `AppShell` sätter i sin
   * `OwnerChromeProvider`. `ownerName` odefinierad = design lab (ingen profilmeny, varken i
   * toolbaren eller i den mobila topprraden).
   */
  ownerName?: string;
  avatarTone?: AvatarProps["tone"];
  publicPageHref?: string;
  canViewReports?: boolean;
  myProfile?: MyProfileData;
  myProfileActions?: MyProfileActions;
  className?: string;
};

export function AgendaShell({
  rail,
  aside,
  children,
  mobileTabBar,
  onLogout,
  pendingRequests,
  onConfirmRequest,
  onDeclineRequest,
  onApproveCancelRequest,
  onDeclineCancelRequest,
  ownerName,
  avatarTone,
  publicPageHref,
  canViewReports,
  myProfile,
  myProfileActions,
  className,
}: AgendaShellProps) {
  return (
    <OwnerChromeProvider
      value={{
        ownerName: ownerName ?? "",
        avatarTone,
        publicPageHref: publicPageHref ?? "/",
        canViewReports,
        pendingRequests: pendingRequests ?? [],
        onConfirmRequest,
        onDeclineRequest,
        onApproveCancelRequest,
        onDeclineCancelRequest,
        onLogout,
        myProfile,
        myProfileActions,
      }}
    >
      <div
        className={cn(
          "flex h-dvh flex-col bg-night lg:flex-row lg:gap-4 lg:p-4",
          className,
        )}
      >
        <div className="hidden lg:contents">{rail}</div>
        <OwnerMobileTopBar
          onLogout={onLogout}
          pendingRequests={pendingRequests}
          onConfirmRequest={onConfirmRequest}
          onDeclineRequest={onDeclineRequest}
          onApproveCancelRequest={onApproveCancelRequest}
          onDeclineCancelRequest={onDeclineCancelRequest}
          ownerName={ownerName}
          avatarTone={avatarTone}
          publicPageHref={publicPageHref}
          myProfile={myProfile}
          myProfileActions={myProfileActions}
        />
        <div className="hidden lg:flex lg:w-75 lg:shrink-0 lg:flex-col lg:gap-3">
          {aside}
        </div>
        <main className="flex min-h-0 min-w-0 flex-1 flex-col bg-agenda p-4 pb-28 lg:rounded-hero lg:p-5 lg:pb-5">
          {children}
        </main>
        {mobileTabBar}
      </div>
    </OwnerChromeProvider>
  );
}
