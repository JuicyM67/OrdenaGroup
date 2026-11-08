"use client";

// Om den inloggade är plattformsadmin — sätts av `src/app/(app)/layout.tsx` så
// att profilmenyn (`user-menu.tsx`) kan visa en länk till /admin utan att
// varje skärm behöver skicka en prop. Utan provider (design lab) = false.
import { createContext, useContext, type ReactNode } from "react";

const PlatformAdminContext = createContext(false);

export function PlatformAdminProvider({
  isAdmin,
  children,
}: {
  isAdmin: boolean;
  children: ReactNode;
}) {
  return (
    <PlatformAdminContext.Provider value={isAdmin}>
      {children}
    </PlatformAdminContext.Provider>
  );
}

export function useIsPlatformAdmin(): boolean {
  return useContext(PlatformAdminContext);
}
