// WP-42: kompakt mörk topprad för ägarens app-skal på < lg (AppShell/AgendaShell), när
// sidomenyn (NavRail/AgendaRail) döljs. Logga (länk till /app/inicio) + varumärkesnamn
// (`src/config/brand.ts`, hård regel 10 — namnet finns bara där) och en riktig
// "Cerrar sesión" (`<form action={onLogout}>`, WP-47).
//
// `onLogout` tas emot som prop i stället för att importera `logout` (`@/app/auth/actions`)
// direkt: den importerar `server-only` transitivt, och den här filen kan renderas av
// komponenttester i Vitests "dom"-projekt (se main-nav.tsx för samma motiv).
//
// WP-61 (pilotfynd #3/ägarens UX-genomgång WP-57): `ownerName` är valfri och BAKÅTKOMPATIBEL
// — `undefined` (Clientes/Caja/Ajustes/Horas flash via AppShell, oförändrat) visar fortfarande
// bara den ensamma utloggningsknappen. Agenda (`agenda-shell.tsx`) skickar med den, och får då
// hela profilmenyn (`UserMenu`, "avatar"-varianten — "Cerrar sesión" ligger redan i den menyn,
// så den gamla fristående knappen tas bort när profilmenyn visas).
import { LogOut } from "lucide-react";
import Link from "next/link";

import { brand, market } from "@/config/brand";
import { appHref } from "@/config/routes";
import { nav } from "@/i18n";
import { initialsOf } from "@/lib/format/initials";

import { BrandLogo } from "@/components/marketing/brand-logo";
import { IconButton } from "@/components/ui/icon-button";
import { LogoMark } from "@/components/ui/logo-mark";
import type { AvatarProps } from "@/components/ui/avatar";
import {
  NotificationBell,
  type NotificationBellResult,
  type PendingRequestItem,
} from "@/components/shared/notification-bell";
import { UserMenu } from "@/components/shared/user-menu";
import type {
  MyProfileActions,
  MyProfileData,
} from "@/components/shared/my-profile-dialog";

export type OwnerMobileTopBarProps = {
  /** `logout` (server action), bunden av anroparens `page.tsx`. `undefined` i design lab. */
  onLogout?: () => void | Promise<void>;
  /** WP-45 (D-033): klockan — samma data/handlers som Inicio/Hoy/Ajustes,
   * delad här eftersom Agenda/Ajustes/Inicio alla visar den här mörka
   * topprraden på mobil ("mobil topprad där klockan finns"). Tomma listan
   * som standard (design lab skickar ingen) — knappen visas ändå, bara utan
   * prick. */
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
  /** WP-61: `undefined` (standard) behåller den gamla ensamma utloggningsknappen. Satt
   * (Agenda) visar i stället `UserMenu` ("avatar"), samma data som `OwnerChromeProvider`. */
  ownerName?: string;
  avatarTone?: AvatarProps["tone"];
  publicPageHref?: string;
  myProfile?: MyProfileData;
  myProfileActions?: MyProfileActions;
};

export function OwnerMobileTopBar({
  onLogout,
  pendingRequests = [],
  onConfirmRequest,
  onDeclineRequest,
  onApproveCancelRequest,
  onDeclineCancelRequest,
  ownerName,
  avatarTone,
  publicPageHref,
  myProfile,
  myProfileActions,
}: OwnerMobileTopBarProps) {
  return (
    <header
      data-surface="dark"
      className="flex shrink-0 items-center justify-between gap-3 bg-ink px-5 py-3 pt-safe-t lg:hidden"
    >
      <Link
        href={appHref("appInicio")}
        aria-label={nav.volverAlInicio}
        className="flex items-center gap-2.5 rounded-icon focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-lime focus-visible:transition-none"
      >
        {market === "SE" ? (
          <BrandLogo size="sm" decorative />
        ) : (
          <>
            <LogoMark label={nav.volverAlInicio} size={40} decorative />
            <span className="text-15 font-bold text-on-dark">{brand.name}</span>
          </>
        )}
      </Link>
      <div className="flex items-center gap-2">
        {onConfirmRequest && onDeclineRequest ? (
          <NotificationBell
            requests={pendingRequests}
            onConfirm={onConfirmRequest}
            onDecline={onDeclineRequest}
            onApproveCancel={onApproveCancelRequest}
            onDeclineCancel={onDeclineCancelRequest}
            triggerTone="ghost-dark"
            triggerSize={44}
          />
        ) : null}
        {ownerName ? (
          <UserMenu
            name={ownerName}
            initials={initialsOf(ownerName)}
            avatarTone={avatarTone}
            variant="avatar"
            publicPageHref={publicPageHref ?? "/"}
            onLogout={onLogout}
            myProfile={myProfile}
            myProfileActions={myProfileActions}
          />
        ) : (
          <form action={onLogout ?? (() => {})}>
            <IconButton
              type="submit"
              label={nav.cerrarSesion}
              tone="ghost-dark"
              size={44}
            >
              <LogOut aria-hidden="true" className="size-5" strokeWidth={1.9} />
            </IconButton>
          </form>
        )}
      </div>
    </header>
  );
}
