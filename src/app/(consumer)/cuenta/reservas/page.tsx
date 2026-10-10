// WP-67 (D-054): Mina bokningar (CL `/cuenta/reservas`, SE `/konto/bokningar`):
// kommande och tidigare hos alla kopplade företag. Avboka (samma regler som
// `/r/[token]`), lämna recension, boka igen.
import type { Metadata } from "next";

import { AccountShell } from "@/components/account/account-shell";
import { BookingRow } from "@/components/account/booking-cards";
import { cuenta } from "@/i18n";
import { loadMyBookings } from "@/server/accounts/account";
import { splitBookings } from "@/server/accounts/view";
import { systemClock } from "@/server/scheduling/clock";

import { cancelAccountBooking } from "../actions";
import { requireAccount } from "../session";

export const metadata: Metadata = {
  title: cuenta.meta.reservas,
  robots: { index: false, follow: false },
};

export const dynamic = "force-dynamic";

export default async function CuentaReservasPage() {
  const session = await requireAccount();
  const { upcoming, past } = splitBookings(
    await loadMyBookings(session.userId, systemClock()),
  );
  const t = cuenta.reservas;
  const sections = [
    { title: t.proximas, list: upcoming, empty: t.vacioProximas },
    { title: t.anteriores, list: past, empty: t.vacioAnteriores },
  ];
  return (
    <AccountShell active="reservas">
      <h1 className="font-display text-30 font-semibold tracking-title text-ink lg:text-36">
        {t.titulo}
      </h1>
      <div className="mt-5 grid gap-6 lg:grid-cols-2">
        {sections.map((s) => (
          <section key={s.title} className="flex flex-col gap-3">
            <h2 className="font-display text-20 font-semibold text-ink">
              {s.title}
            </h2>
            {s.list.length > 0 ? (
              <ul className="flex flex-col gap-3">
                {s.list.map((b) => (
                  <BookingRow
                    key={b.bookingId}
                    booking={b}
                    onCancel={cancelAccountBooking}
                  />
                ))}
              </ul>
            ) : (
              <p className="rounded-card bg-surface p-4 text-14 text-ink-soft">
                {s.empty}
              </p>
            )}
          </section>
        ))}
      </div>
    </AccountShell>
  );
}
