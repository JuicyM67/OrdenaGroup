"use client";
// WP-45 (D-033): `max-width: 1023px` (under Tailwinds `lg`-brytpunkt, samma gräns som
// `use-desktop-layout.ts`/`event-popover.tsx`) som en React-store i stället för
// `useState`+`useEffect` (den senare gav en hydreringskrock i `NotificationBell`: till
// skillnad från `event-popover.tsx` avgör `compact` här hur TRIGGERN — som alltid
// renderas, även stängd — ser ut, inte bara popoverns `side`/`align` på ett innehåll som
// bara monteras öppet). `getServerSnapshot` (SSR och klientens allra första render)
// svarar `false` (skrivbordsläget, det gamla standardläget) — `useSyncExternalStore`
// synkar sedan till det riktiga värdet utan en varning, se `use-desktop-layout.ts`.
import { useSyncExternalStore } from "react";

const QUERY = "(max-width: 1023px)";

// jsdom (Vitest) implementerar inte `window.matchMedia` — samma vakt som
// `use-desktop-layout.ts`.
function hasMatchMedia(): boolean {
  return (
    typeof window !== "undefined" && typeof window.matchMedia === "function"
  );
}

function subscribe(callback: () => void): () => void {
  if (!hasMatchMedia()) return () => {};
  const mq = window.matchMedia(QUERY);
  mq.addEventListener("change", callback);
  return () => mq.removeEventListener("change", callback);
}

function getSnapshot(): boolean {
  if (!hasMatchMedia()) return false;
  return window.matchMedia(QUERY).matches;
}

function getServerSnapshot(): boolean {
  return false;
}

export function useCompactViewport(): boolean {
  return useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
}
