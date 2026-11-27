"use client";

// WP-98 (D-082): kontots företag för väljaren i profilmenyn — sätts av
// `src/app/(app)/layout.tsx`, samma mönster som `platform-admin-context.tsx`.
// Tom lista (ett enda företag, design lab) = ingen väljare.
import { createContext, useContext, type ReactNode } from "react";

export type SwitcherBusiness = {
  id: string;
  name: string;
  active: boolean;
  /** `switchBusinessAction` bunden till företaget (server action). */
  select: () => void | Promise<void>;
};

const BusinessSwitcherContext = createContext<readonly SwitcherBusiness[]>([]);

export function BusinessSwitcherProvider({
  businesses,
  children,
}: {
  businesses: readonly SwitcherBusiness[];
  children: ReactNode;
}) {
  return (
    <BusinessSwitcherContext.Provider value={businesses}>
      {children}
    </BusinessSwitcherContext.Provider>
  );
}

export function useMyBusinesses(): readonly SwitcherBusiness[] {
  return useContext(BusinessSwitcherContext);
}
