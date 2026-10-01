// ProfileFlowContext — WP-53 (D-040): profilvyn (`ProfileBrowse`,
// `profile-browse.tsx` m.fl.) renderas på servern, så att formateringen,
// i18n-texten och markupen inte längre hamnar i `/{slug}`s klientbunt
// (JS-budgeten). Bara de interaktiva bitarna — kategori-/mobilflik och
// "Boka"-knapparna — behöver nå tillbaka till `BookingScreen`s tillstånd.
// De få klientöarna i `profile-interactive.tsx` läser den här contexten i
// stället för att få kontroll/tillstånd nedärvt som props genom ett helt
// klientrenderat träd.
"use client";

import { createContext, useContext, type ReactNode } from "react";

export type MobileTab = "servicios" | "personal" | "nosotros" | "info";

export interface ProfileFlowValue {
  readonly categoryId: string;
  readonly onSelectCategory: (id: string) => void;
  readonly mobileTab: MobileTab;
  readonly onSelectMobileTab: (tab: MobileTab) => void;
  /** Väljer tjänsten och växlar `BookingScreen` till bokningsflödet (`viewMode = "picker"`). */
  readonly bookService: (serviceId: string) => void;
}

const ProfileFlowContext = createContext<ProfileFlowValue | null>(null);

export function ProfileFlowProvider({
  value,
  children,
}: {
  value: ProfileFlowValue;
  children: ReactNode;
}) {
  return (
    <ProfileFlowContext.Provider value={value}>
      {children}
    </ProfileFlowContext.Provider>
  );
}

/** Kastar hellre än att tysta ett användningsfel (samma mönster som
 * `mustParseInstant` i profile-view.ts): klientöarna renderas bara inuti
 * `ProfileFlowProvider` (booking-screen.tsx). */
export function useProfileFlow(): ProfileFlowValue {
  const ctx = useContext(ProfileFlowContext);
  if (!ctx) {
    throw new Error(
      "useProfileFlow: komponenten måste renderas inuti ProfileFlowProvider",
    );
  }
  return ctx;
}
