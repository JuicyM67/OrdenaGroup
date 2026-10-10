// Konsumentens inloggning i Upptäck — ett litet gränssnitt mot WP-67 (kundkonton).
//
// TODO(WP-67): när kundkonton är mergade ska `getConsumerNav()` läsa den riktiga
// sessionen (Supabase-auth + `customer_accounts`) och `ACCOUNT_LINKS` peka på
// `/konto`-rutterna i `routes.ts` (Bokningar, Profil, Logga in/Skapa konto).
// Hjärtat (favoriter) på korten och erbjudandesidan kopplas in via
// `FavoriteSlot` på samma sätt. Till dess visas inga kontolänkar (D-035:
// det som inte är byggt syns inte).
import type { ReactNode } from "react";

export type ConsumerNav = {
  /** Initial i profilknappen ("E"), eller null om utloggad. */
  initial: string | null;
  /** Länkar i bottenmenyn/toppbaren; tomma tills WP-67 finns. */
  links: readonly { id: "reservas" | "perfil" | "ingresar"; href: string }[];
};

export async function getConsumerNav(): Promise<ConsumerNav> {
  return { initial: null, links: [] };
}

/** Plats för favorit-hjärtat (WP-67). `null` = ingenting renderas. */
export type FavoriteSlot = (businessSlug: string) => ReactNode;

export const noFavorite: FavoriteSlot = () => null;
