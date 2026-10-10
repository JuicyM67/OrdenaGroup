// WP-67 (D-054): ett sparat företag (Favoriter-remsan i `Profil.dc.html` och
// listan i Favoriter). Bild = företagets omslag (eller en färgad platta).
import Link from "next/link";
import type { ReactNode } from "react";

import { cuenta } from "@/i18n";
import type { AccountFavorite } from "@/server/accounts/account";

export function FavoriteTile({
  favorite,
  action,
  fluid = false,
}: {
  favorite: AccountFavorite;
  /** I ett rutnät (Favoriter): full kolumnbredd även på mobil. */
  fluid?: boolean;
  /** T.ex. "Ta bort" i Favoriter. */
  action?: ReactNode;
}) {
  const rating =
    favorite.rating !== null && favorite.reviewCount > 0
      ? cuenta.favoritos.resenas({
          promedio: favorite.rating.toFixed(1).replace(".", ","),
          n: favorite.reviewCount,
        })
      : favorite.comuna;
  return (
    <li
      className={`flex flex-col overflow-hidden rounded-panel bg-surface ${fluid ? "" : "w-36 shrink-0 lg:w-auto"}`}
    >
      <Link
        href={`/${favorite.slug}`}
        className="flex flex-col focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-ink"
      >
        <span className="relative block h-21 w-full bg-staff-2">
          {favorite.coverUrl ? (
            // eslint-disable-next-line @next/next/no-img-element -- företagets omslag ligger i Supabase Storage (samma val som profile-header.tsx).
            <img
              src={favorite.coverUrl}
              alt=""
              loading="lazy"
              className="absolute inset-0 size-full object-cover"
            />
          ) : null}
        </span>
        <span className="flex flex-col px-2.5 py-2">
          <b className="truncate text-13 text-ink">{favorite.name}</b>
          <span className="truncate text-12 font-medium text-muted">
            {rating}
          </span>
        </span>
      </Link>
      {action ? <div className="px-2.5 pb-2.5">{action}</div> : null}
    </li>
  );
}
