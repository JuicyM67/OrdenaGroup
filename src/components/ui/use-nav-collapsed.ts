"use client";

// WP-57 (punkt 2, UX-genomgång "Menyn med etiketter"): håller sidomenyns ihopfällda/
// utfällda läge (etiketter bredvid ikonerna vs. bara ikoner), delat mellan `MainNav` och
// `AgendaRail` (samma nyckel i `localStorage` — ett val gäller hela ägarappen). Standard:
// utfälld (etiketter synliga) tills användaren själv fäller ihop den, vilket är det
// granskningen efterfrågar ("nya användare måste hovra för att förstå").
//
// `localStorage` är inte tillgängligt i alla miljöer (privat läge, SSR, jsdom-tester utan
// den) — alla anrop skyddas med try/catch, ett fel ignoreras tyst och läget gäller bara den
// här sessionen (samma "best effort"-mönster som övriga lokala preferenser i appen).
import { useCallback, useEffect, useState } from "react";

const STORAGE_KEY = "llena:nav-collapsed";

function readStored(): boolean | null {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (raw === "1") return true;
    if (raw === "0") return false;
    return null;
  } catch {
    return null;
  }
}

function writeStored(collapsed: boolean): void {
  try {
    window.localStorage.setItem(STORAGE_KEY, collapsed ? "1" : "0");
  } catch {
    // Ingen lagring tillgänglig — läget gäller bara den här sessionen.
  }
}

/**
 * `[collapsed, setCollapsed]`. Första renderingen (och SSR) svarar alltid `false`
 * (utfälld) — `useEffect` synkar sedan mot den lagrade preferensen om det finns en, precis
 * efter montering (samma "svara med standardläget direkt, synka till det riktiga strax
 * efter"-mönster som `use-desktop-layout.ts`/`use-compact-viewport.ts`, fast här räcker en
 * vanlig `useState` + `useEffect` eftersom värdet bara ändras av användaren själv, inte av
 * webbläsarens fönsterstorlek).
 */
export function useNavCollapsed(): [boolean, (next: boolean) => void] {
  const [collapsed, setCollapsed] = useState(false);

  useEffect(() => {
    const stored = readStored();
    if (stored !== null) setCollapsed(stored);
  }, []);

  const update = useCallback((next: boolean) => {
    setCollapsed(next);
    writeStored(next);
  }, []);

  return [collapsed, update];
}
