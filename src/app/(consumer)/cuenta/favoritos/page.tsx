// WP-67 (D-054): Favoriter (CL `/cuenta/favoritos`, SE `/konto/favoriter`).
// "Ta bort" är ett vanligt formulär (server action, fungerar utan JS).
import type { Metadata } from "next";

import { AccountShell } from "@/components/account/account-shell";
import { FavoriteTile } from "@/components/account/favorite-tile";
import { cuentaHref } from "@/config/routes";
import { cuenta } from "@/i18n";
import { loadMyFavorites } from "@/server/accounts/account";

import { toggleFavorite } from "../actions";
import { requireAccount } from "../session";

export const metadata: Metadata = {
  title: cuenta.meta.favoritos,
  robots: { index: false, follow: false },
};

export const dynamic = "force-dynamic";

export default async function CuentaFavoritosPage() {
  const session = await requireAccount();
  const favorites = await loadMyFavorites(session.userId);
  const t = cuenta.favoritos;
  return (
    <AccountShell active="favoritos">
      <h1 className="font-display text-30 font-semibold tracking-title text-ink lg:text-36">
        {t.titulo}
      </h1>
      {favorites.length > 0 ? (
        <ul className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
          {favorites.map((f) => (
            <FavoriteTile
              key={f.businessId}
              favorite={f}
              fluid
              action={
                <form action={toggleFavorite}>
                  <input type="hidden" name="businessId" value={f.businessId} />
                  <input type="hidden" name="on" value="0" />
                  <input
                    type="hidden"
                    name="back"
                    value={cuentaHref("cuentaFavoritos")}
                  />
                  <button
                    type="submit"
                    className="h-9 w-full rounded-control border border-border text-12 font-bold text-ink transition-colors duration-150 ease-out hover:bg-field focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink"
                  >
                    {t.quitar}
                  </button>
                </form>
              }
            />
          ))}
        </ul>
      ) : (
        <p className="mt-5 max-w-xl rounded-card bg-surface p-4 text-14 leading-body text-ink-soft">
          {t.vacio}
        </p>
      )}
    </AccountShell>
  );
}
