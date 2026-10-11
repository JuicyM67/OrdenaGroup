// WP-67 (D-054): Min profil (CL `/cuenta`, SE `/konto`). Referens
// `docs/design/reference/marketplace/Profil.dc.html` (riktning A): hälsning,
// nästa bokning (mörkt kort), recensionspåminnelse, favoriter och kontomenyn.
// "Mina värdebevis" byggs i WP-69 (D-035: dold tills den finns).
import { ChevronRight, Settings, Star } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";

import { AccountShell } from "@/components/account/account-shell";
import { NextBookingCard } from "@/components/account/booking-cards";
import { FavoriteTile } from "@/components/account/favorite-tile";
import { appHref, cuentaHref } from "@/config/routes";
import { cuenta } from "@/i18n";
import { initialsOf } from "@/lib/format/initials";
import { loadMyBookings, loadMyFavorites } from "@/server/accounts/account";
import { splitBookings } from "@/server/accounts/view";
import { getOwnerBusiness } from "@/server/onboarding/owner-business";
import { systemClock } from "@/server/scheduling/clock";

import { cancelAccountBooking, logoutAccount } from "./actions";
import { requireAccount } from "./session";

export const metadata: Metadata = {
  title: cuenta.meta.perfil,
  robots: { index: false, follow: false },
};

export const dynamic = "force-dynamic";

const rowClass =
  "flex h-13 items-center justify-between gap-3 px-4 text-14 font-semibold text-ink transition-colors duration-150 ease-out hover:bg-canvas focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-ink";

export default async function CuentaPage() {
  const session = await requireAccount();
  const now = systemClock();
  const [bookings, favorites, business] = await Promise.all([
    loadMyBookings(session.userId, now),
    loadMyFavorites(session.userId),
    getOwnerBusiness(session.userId),
  ]);
  const { upcoming, past } = splitBookings(bookings);
  const next = upcoming[0];
  const toReview = past.find((b) => b.reviewable && b.reviewRating === null);
  const t = cuenta.perfil;
  const firstName = session.displayName?.split(" ")[0];
  const initial = initialsOf(session.displayName ?? session.email ?? "?").slice(
    0,
    1,
  );

  return (
    <AccountShell active="perfil">
      <div className="grid gap-4 lg:grid-cols-3 lg:gap-6">
        <div className="flex min-w-0 flex-col gap-4 lg:col-span-2">
          <header className="flex items-center gap-3">
            <span
              aria-hidden="true"
              className="flex size-14 shrink-0 items-center justify-center rounded-icon bg-lilac-100 font-display text-22 font-bold text-ink"
            >
              {initial}
            </span>
            <div className="flex min-w-0 flex-1 flex-col">
              <h1 className="font-display text-26 font-semibold tracking-title text-ink lg:text-32">
                {firstName ? t.hola({ nombre: firstName }) : t.holaSinNombre}
              </h1>
              <span className="truncate text-13 text-muted">
                {t.subtitulo({ email: session.email })}
              </span>
            </div>
            <Link
              href={cuentaHref("cuentaPrivacidad")}
              aria-label={t.menuPrivacidad}
              className="flex size-11 shrink-0 items-center justify-center rounded-control bg-surface text-ink focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink"
            >
              <Settings
                className="size-4.5"
                strokeWidth={2}
                aria-hidden="true"
              />
            </Link>
          </header>

          {next ? (
            <NextBookingCard booking={next} onCancel={cancelAccountBooking} />
          ) : (
            <section className="flex flex-col gap-1.5 rounded-card bg-dark p-5 text-on-dark">
              <h2 className="font-display text-20 font-semibold">
                {t.sinReservasTitulo}
              </h2>
              <p className="text-14 leading-body text-on-dark-soft">
                {t.sinReservasTexto}
              </p>
            </section>
          )}

          {toReview ? (
            <Link
              href={cuentaHref("cuentaResena", toReview.bookingId)}
              className="flex items-center gap-3 rounded-tile bg-peach-50 p-3.5 text-on-peach-soft focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink"
            >
              <span
                aria-hidden="true"
                className="flex size-11 shrink-0 items-center justify-center rounded-full bg-surface text-ink"
              >
                <Star className="size-5" strokeWidth={2} />
              </span>
              <span className="flex min-w-0 flex-1 flex-col">
                <b className="text-14">
                  {t.resenaPregunta({
                    servicio: toReview.serviceName,
                    negocio: toReview.business.name,
                  })}
                </b>
                <span className="text-12">{t.resenaTexto}</span>
              </span>
              <ChevronRight
                className="size-5 shrink-0"
                strokeWidth={2}
                aria-hidden="true"
              />
            </Link>
          ) : null}

          <nav
            aria-label={t.menuAria}
            className="flex flex-col divide-y divide-line overflow-hidden rounded-card bg-surface"
          >
            <Link href={cuentaHref("cuentaReservas")} className={rowClass}>
              {t.menuReservas}
              <ChevronRight
                className="size-4.5 text-muted"
                aria-hidden="true"
              />
            </Link>
            <Link href={cuentaHref("cuentaFavoritos")} className={rowClass}>
              {t.menuFavoritos}
              <ChevronRight
                className="size-4.5 text-muted"
                aria-hidden="true"
              />
            </Link>
            <Link href={cuentaHref("cuentaPrivacidad")} className={rowClass}>
              {t.menuPrivacidad}
              <ChevronRight
                className="size-4.5 text-muted"
                aria-hidden="true"
              />
            </Link>
            <form action={logoutAccount}>
              <button type="submit" className={`${rowClass} w-full text-left`}>
                {t.cerrarSesion}
              </button>
            </form>
          </nav>

          <Link
            href={business ? appHref("appInicio") : appHref("appOnboarding")}
            className="self-start text-13 font-semibold text-ink underline underline-offset-4 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink"
          >
            {t.negocio}
          </Link>
        </div>

        <section className="flex min-w-0 flex-col gap-2.5">
          <div className="flex items-baseline justify-between">
            <h2 className="font-display text-20 font-semibold text-ink">
              {t.favoritosTitulo}
            </h2>
            {favorites.length > 0 ? (
              <Link
                href={cuentaHref("cuentaFavoritos")}
                className="text-13 font-semibold text-ink underline underline-offset-4"
              >
                {t.verTodos}
              </Link>
            ) : null}
          </div>
          {favorites.length > 0 ? (
            <ul className="-mx-4 flex gap-2.5 overflow-x-auto px-4 pb-1 lg:mx-0 lg:grid lg:grid-cols-2 lg:overflow-visible lg:px-0">
              {favorites.slice(0, 6).map((f) => (
                <FavoriteTile key={f.businessId} favorite={f} />
              ))}
            </ul>
          ) : (
            <p className="rounded-card bg-surface p-4 text-14 leading-body text-ink-soft">
              {t.favoritosVacio}
            </p>
          )}
        </section>
      </div>
    </AccountShell>
  );
}
