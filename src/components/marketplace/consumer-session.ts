// Konsumentens inloggning i Upptäck — kopplad till kundkontona (WP-67, D-054).
// Läser bara sessionen när en Supabase-cookie finns (`optionalAccount`) och skapar
// aldrig ett konto. Favoriterna (hjärtat) är WP-67:s `favorites` via dess server
// action `toggleFavorite` (formulär, ingen klient-JS).
import "server-only";

import { optionalAccount } from "@/app/(consumer)/cuenta/session";
import { cuentaHref } from "@/config/routes";
import { loadMyFavorites } from "@/server/accounts/account";

export type ConsumerNav = {
  /** Initial i profilknappen ("E"), eller null om utloggad. */
  initial: string | null;
  /** Bottenmenyns kontolänkar (utloggad leder `proxy.ts` till inloggningen). */
  links: readonly { id: "reservas" | "perfil" | "ingresar"; href: string }[];
  /** Inloggad kund: företags-id:n som är favoriter. `null` = utloggad (inget hjärta). */
  favorites: ReadonlySet<string> | null;
};

export async function getConsumerNav(): Promise<ConsumerNav> {
  const links = [
    { id: "reservas" as const, href: cuentaHref("cuentaReservas") },
    { id: "perfil" as const, href: cuentaHref("cuenta") },
  ];
  const account = await optionalAccount();
  if (!account) return { initial: null, links, favorites: null };
  const favs = await loadMyFavorites(account.userId).catch(() => []);
  const name = (account.displayName ?? account.email).trim();
  return {
    initial: name ? name.charAt(0).toUpperCase() : null,
    links,
    favorites: new Set(favs.map((f) => f.businessId)),
  };
}
