// Favorit-hjärtat i Upptäck: WP-67:s `FavoriteHeart` + server action
// `toggleFavorite` (formulär, fungerar utan JS). Visas bara för inloggad kund.
import { toggleFavorite } from "@/app/(consumer)/cuenta/actions";
import { FavoriteHeart } from "@/components/account/favorite-heart";

import type { ConsumerNav } from "./consumer-session";

/** Hjärtat för ett företag, eller null om besökaren inte är inloggad. `back` är
 * sidan att komma tillbaka till (bara sökväg, ingen query — se `toggleFavorite`). */
export function favoriteFor(
  nav: ConsumerNav,
  businessId: string,
  back: string,
) {
  if (!nav.favorites) return null;
  return (
    <FavoriteHeart
      businessId={businessId}
      saved={nav.favorites.has(businessId)}
      back={back}
      action={toggleFavorite}
    />
  );
}
