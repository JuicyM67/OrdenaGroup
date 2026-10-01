// Se DESIGN.md §7 "AppShell (desktop)"/"AppShell (mobil)" och docs/tasks/plans/WP-11.md §4
// steg 3. Generell ram för ägarens sidor (Inicio, Clientes, Horas flash, Caja, Ajustes) —
// Agenda använder en annan ram/rail (WP-12, `agenda-shell.tsx`, samma mobilmönster). `h-dvh`
// som standard på skrivbordet (`lg:`); i design lab ersätts den med artboardens fasta höjd
// via `className` (samma höjdklassgrupp, tailwind-merge väljer den sista, se cn.ts) — design
// lab renderas alltid ≥ `lg` bred (1440 px, `npm run visual`), så mobilklasserna nedan
// påverkar aldrig skärmdumparna.
//
// WP-42: under `lg` döljs `rail` helt (sidomenyn tar annars hela bredden) och ersätts av
// `OwnerMobileTopBar` (logga + "Cerrar sesión", delad med `agenda-shell.tsx`) och
// `mobileTabBar` (fast i botten, se `owner-tab-bar.tsx`). `main` tappar den mörka ramens
// padding/radie på mobil (canvas fyller hela bredden, ingen `overflow-hidden` — sidan får
// skrolla normalt i stället för att klippa innehåll).
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

export type AppShellProps = {
  rail: ReactNode;
  children: ReactNode;
  /** `<OwnerMobileTabBar active="…" />` — döljs automatiskt på skrivbordet av anroparen
   * (samma mönster som `rail`). Valfri: design lab skickar ingen. */
  mobileTabBar?: ReactNode;
  /** WP-47: `logout` (server action), vidarebefordras till `OwnerMobileTopBar`. */
  onLogout?: () => void | Promise<void>;
  /** WP-45: klockan i `OwnerMobileTopBar` (mobil, < lg). `undefined` döljer
   * den (design lab). */
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
   * WP-57: data till `<OwnerChromeProvider>` (owner-chrome.tsx), som AppShell nu alltid
   * sätter runt `children` — skärmar som renderar `<OwnerPageHeader>` (owner-page-header.tsx,
   * se Inicio) behöver då inte koppla ihop klockan/profilmenyn själva. Skärmar som ännu inte
   * använder OwnerPageHeader kan strunta i de här propsen helt (providern sätts ändå, men
   * ingen läser den förrän skärmen byter till `<OwnerPageHeader>`).
   */
  ownerName?: string;
  avatarTone?: AvatarProps["tone"];
  publicPageHref?: string;
  canViewReports?: boolean;
  myProfile?: MyProfileData;
  myProfileActions?: MyProfileActions;
  /** WP-57: döljer den mörka `OwnerMobileTopBar` på mobil — för skärmar som själva
   * renderar en fullständig `<OwnerPageHeader>` (klocka + profilmeny ingår redan där),
   * så att de inte får utloggning/klocka dubblerat. `undefined`/`false` behåller den
   * tidigare `OwnerMobileTopBar` för skärmar som inte använder OwnerPageHeader än. */
  hideMobileTopBar?: boolean;
  className?: string;
};

export function AppShell({
  rail,
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
  hideMobileTopBar = false,
  className,
}: AppShellProps) {
  return (
    <div
      className={cn(
        "flex min-h-dvh flex-col bg-canvas lg:h-dvh lg:flex-row lg:gap-4 lg:bg-ink lg:p-4",
        className,
      )}
    >
      <div className="hidden lg:contents">{rail}</div>
      {hideMobileTopBar ? null : (
        <OwnerMobileTopBar
          onLogout={onLogout}
          pendingRequests={pendingRequests}
          onConfirmRequest={onConfirmRequest}
          onDeclineRequest={onDeclineRequest}
          onApproveCancelRequest={onApproveCancelRequest}
          onDeclineCancelRequest={onDeclineCancelRequest}
        />
      )}
      <main className="relative flex flex-1 flex-col gap-6 px-5 py-5 pb-28 lg:min-h-0 lg:overflow-hidden lg:rounded-shell lg:bg-canvas lg:px-8 lg:py-7 lg:pb-7">
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
          {children}
        </OwnerChromeProvider>
      </main>
      {mobileTabBar}
    </div>
  );
}
