"use client";
// WP-42: `min-width: 1024px` (Tailwinds `lg`-brytpunkt, samma gräns som `hidden lg:flex`/
// `lg:hidden` i agenda-shell.tsx/agenda-screen.tsx) som en React-store i stället för
// `useEffect`+`setState` (react-hooks/set-state-in-effect varnar för kaskaderande
// omrenderingar). `getServerSnapshot` (SSR och klientens allra första render, innan
// hydreringen synkas mot det riktiga värdet) svarar `true` — agenda-screen.tsx monterar
// bara EN av de två dagvyerna (se `isDesktopLayout`), och skrivbord är det gamla,
// väntestade standardläget.
import { useSyncExternalStore } from "react";

const QUERY = "(min-width: 1024px)";

// jsdom (Vitest, `src/**/*.test.tsx`) implementerar inte `window.matchMedia` — utan vakten
// kastar `getSnapshot`/`subscribe` redan vid första rendern i varje test som monterar
// `AgendaScreen` (se `event-popover.test.tsx` samma mönster).
function hasMatchMedia(): boolean {
  return typeof window !== "undefined" && typeof window.matchMedia === "function";
}

function subscribe(callback: () => void): () => void {
  if (!hasMatchMedia()) return () => {};
  const mq = window.matchMedia(QUERY);
  mq.addEventListener("change", callback);
  return () => mq.removeEventListener("change", callback);
}

function getSnapshot(): boolean {
  if (!hasMatchMedia()) return true;
  return window.matchMedia(QUERY).matches;
}

function getServerSnapshot(): boolean {
  return true;
}

export function useIsDesktopLayout(): boolean {
  return useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
}
