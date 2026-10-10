"use client";

// OwnerChromeProvider — WP-57 punkt 1 (ägarens UX-genomgång, "Ett gemensamt sidhuvud på
// alla flikar"). Bär klockans (NotificationBell) och profilmenyns (UserMenu) data genom
// React context, så varje ägarskärm bara behöver rendera `<OwnerPageHeader title=… />`
// (owner-page-header.tsx) i stället för att själv koppla ihop PageHeader + NotificationBell
// + UserMenu (som inicio-screen.tsx/hoy-screen.tsx gjorde var för sig innan).
//
// Vem sätter providern:
// - `AppShell` (dashboard/app-shell.tsx) sätter den runt sina `children` automatiskt — alla
//   skärmar som använder AppShell (Inicio, Clientes, Horas flash, Caja, Ajustes) får den
//   gratis så fort de skickar med de nya propsen till AppShell (annars `defaultChromeValue`,
//   se app-shell.tsx: tom klocka, ingen profilmeny-data döljer bara de delarna).
// - Skärmar som inte använder AppShell (Hoy, mobil-only) sätter `<OwnerChromeProvider>`
//   själva överst i sin egen skärmkomponent (se mobile/hoy-screen.tsx).
//
// `useOwnerChrome()` kastar om den används utanför en provider — OwnerPageHeader ska
// ALLTID ha kontext, annars är något kopplat fel (hellre ett tydligt fel i utveckling än en
// tyst halvfärdig header).
import { createContext, use, type ReactNode } from "react";

import type { AvatarProps } from "@/components/ui/avatar";
import type { SmsBellNotice } from "@/lib/validation/sms-credits";

import type { MyProfileActions, MyProfileData } from "./my-profile-dialog";
import type {
  NotificationBellResult,
  PendingRequestItem,
} from "./notification-bell";

export type OwnerChromeValue = {
  /** "Camila Rivas" — initialerna till UserPill/avataren räknas med `initialsOf()`
   * inuti OwnerPageHeader, aldrig lagrade som text i datan. */
  ownerName: string;
  avatarTone?: AvatarProps["tone"];
  /** `/${slug}` — "Ver mi página" i kontomenyn. */
  publicPageHref: string;
  /** WP-24 (D-034): döljer Caja i navigeringen. `undefined` (design lab/ingen
   * medlemsdata) visar den — samma "ingen inskränkning utan data"-mönster som
   * `main-nav.tsx`. Inte använt av OwnerPageHeader själv (sidomenyn läser den separat),
   * men delas här så en skärm bara behöver skicka EN uppsättning chrome-props. */
  canViewReports?: boolean;
  /** WP-45 (D-033): klockan. Tom lista som standard — se `onConfirmRequest`/
   * `onDeclineRequest` nedan för när knappen visas över huvud taget. */
  pendingRequests: readonly PendingRequestItem[];
  /** WP-76 (D-053): sms-varningar (80 %/slut) överst i klockan. */
  notices?: readonly SmsBellNotice[];
  /** Klockan (NotificationBell) visas bara när BÅDE `onConfirmRequest` och
   * `onDeclineRequest` finns (samma regel som tidigare i inicio-screen.tsx/hoy-screen.tsx) —
   * `undefined` i design lab döljer den helt i stället för att visa en klocka utan
   * fungerande knappar. */
  onConfirmRequest?: (bookingId: string) => Promise<NotificationBellResult>;
  onDeclineRequest?: (
    bookingId: string,
    reason?: string,
  ) => Promise<NotificationBellResult>;
  /** WP-56: se notification-bell.tsx. */
  onApproveCancelRequest?: (
    bookingId: string,
  ) => Promise<NotificationBellResult>;
  onDeclineCancelRequest?: (
    bookingId: string,
  ) => Promise<NotificationBellResult>;
  /** `logout` (server action). `undefined` i design lab. */
  onLogout?: () => void | Promise<void>;
  /** WP-46: "Min profil" i kontomenyn. `undefined` döljer menyposten (ägare utan egen
   * personalrad, design lab). */
  myProfile?: MyProfileData;
  myProfileActions?: MyProfileActions;
};

const OwnerChromeContext = createContext<OwnerChromeValue | null>(null);

export function OwnerChromeProvider({
  value,
  children,
}: {
  value: OwnerChromeValue;
  children: ReactNode;
}) {
  return <OwnerChromeContext value={value}>{children}</OwnerChromeContext>;
}

/** Som useOwnerChrome men null utanför providern (t.ex. mobilens flikrad i AgendaShell). */
export function useOptionalOwnerChrome(): OwnerChromeValue | null {
  return use(OwnerChromeContext);
}

export function useOwnerChrome(): OwnerChromeValue {
  const value = use(OwnerChromeContext);
  if (!value) {
    throw new Error(
      "useOwnerChrome() måste användas inom <OwnerChromeProvider> (se owner-chrome.tsx). " +
        "AppShell sätter den automatiskt — skärmar utan AppShell (t.ex. Hoy) sätter den själva.",
    );
  }
  return value;
}
