"use client";

// WP-57 (punkt 2, UX-genomgång "Menyn med etiketter"): håller sidomenyns ihopfällda/
// utfällda läge (etiketter bredvid ikonerna vs. bara ikoner), delat mellan `MainNav` och
// `AgendaRail` (samma nyckel i `localStorage` — ett val gäller hela ägarappen). Standard:
// utfälld (etiketter synliga) tills användaren själv fäller ihop den, vilket är det
// granskningen efterfrågar ("nya användare måste hovra för att förstå").
//
// `useSyncExternalStore` (inte `useState`+`useEffect`, som skulle kräva ett `setState`
// synkront i en effekt — flaggas av `react-hooks/set-state-in-effect`): samma "svara med
// standardläget direkt (SSR/första renderingen), synka till det riktiga strax efter"-mönster
// som `use-compact-viewport.ts`/`use-desktop-layout.ts`, fast här är källan en modulvariabel
// (`localStorage`) i stället för `matchMedia`.
//
// `localStorage` är inte tillgängligt i alla miljöer (privat läge, SSR, jsdom-tester utan
// den) — alla anrop skyddas med try/catch, ett fel ignoreras tyst och läget gäller bara den
// här sessionen (samma "best effort"-mönster som övriga lokala preferenser i appen).
import { useCallback, useSyncExternalStore } from "react";

const STORAGE_KEY = "llena:nav-collapsed";

const listeners = new Set<() => void>();
let cached: boolean | null = null;

function hasLocalStorage(): boolean {
  try {
    return typeof window !== "undefined" && !!window.localStorage;
  } catch {
    return false;
  }
}

function readStored(): boolean {
  if (cached !== null) return cached;
  try {
    cached = hasLocalStorage()
      ? window.localStorage.getItem(STORAGE_KEY) === "1"
      : false;
  } catch {
    cached = false;
  }
  return cached;
}

function writeStored(next: boolean): void {
  cached = next;
  try {
    if (hasLocalStorage()) {
      window.localStorage.setItem(STORAGE_KEY, next ? "1" : "0");
    }
  } catch {
    // Ingen lagring tillgänglig — läget gäller bara den här sessionen.
  }
  for (const listener of listeners) listener();
}

function subscribe(onStoreChange: () => void): () => void {
  listeners.add(onStoreChange);
  return () => listeners.delete(onStoreChange);
}

function getServerSnapshot(): boolean {
  return false;
}

/** `[collapsed, setCollapsed]`. SSR och den allra första renderingen svarar alltid `false`
 * (utfälld) — synkar sedan till den lagrade preferensen utan en hydreringsvarning. */
export function useNavCollapsed(): [boolean, (next: boolean) => void] {
  const collapsed = useSyncExternalStore(
    subscribe,
    readStored,
    getServerSnapshot,
  );
  const setCollapsed = useCallback((next: boolean) => writeStored(next), []);
  return [collapsed, setCollapsed];
}
