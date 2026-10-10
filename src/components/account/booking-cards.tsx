// WP-67 (D-054): kundkontots bokningskort. `NextBookingCard` = det mörka
// kortet "Nästa bokning" i `Profil.dc.html`; `BookingRow` = en rad i
// Bokningar (kommande/tidigare). Serverkomponenter; bara avbokningsknappen
// är en klientö.
import { MapPin, Star } from "lucide-react";
import Link from "next/link";

import { cuentaHref } from "@/config/routes";
import { cuenta } from "@/i18n";
import { formatMoney } from "@/lib/format/money";
import type { AccountBooking } from "@/server/accounts/view";

import { CancelButton } from "./cancel-button";
import { datePill, dateTimeShort, timeOf } from "./format";
import { StatusBadge } from "./status-badge";

type CancelAction = (
  bookingId: string,
) => Promise<{ ok: true; pending: boolean } | { ok: false; code: string }>;

function mapsHref(b: AccountBooking): string | undefined {
  const parts = [b.business.address, b.business.comuna].filter(Boolean);
  if (!b.business.address) return undefined;
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(`${b.business.name}, ${parts.join(", ")}`)}`;
}

export function NextBookingCard({
  booking,
  onCancel,
}: {
  booking: AccountBooking;
  onCancel: CancelAction;
}) {
  const t = cuenta.perfil;
  const pill = datePill(booking.start, booking.business.timezone);
  const maps = mapsHref(booking);
  return (
    <section className="flex flex-col gap-3 rounded-card bg-dark p-4.5 text-on-dark">
      <div className="flex items-center justify-between gap-3">
        <span className="text-12 font-bold tracking-caps text-on-dark-muted uppercase">
          {t.proxima}
        </span>
        <StatusBadge booking={booking} />
      </div>
      <div className="flex items-center gap-3">
        <div className="flex h-16 w-15 shrink-0 flex-col items-center justify-center rounded-control bg-lime text-ink">
          <span className="text-11 font-bold">{pill.wd}</span>
          <span className="font-display text-24 leading-none font-bold">
            {pill.day}
          </span>
        </div>
        <div className="flex min-w-0 flex-col gap-0.5">
          <b className="truncate text-16">{booking.serviceName}</b>
          <span className="text-13 text-on-dark-soft">
            {timeOf(booking.start, booking.business.timezone)} ·{" "}
            {booking.business.name} ·{" "}
            {cuenta.reservas.conProfesional({
              profesional: booking.staffName,
            })}
          </span>
        </div>
      </div>
      <div className="flex flex-wrap gap-2">
        {booking.canCancel ? (
          <CancelButton
            bookingId={booking.bookingId}
            needsApproval={booking.cancelNeedsApproval}
            cancelWindowHours={booking.cancelWindowHours}
            onCancel={onCancel}
            tone="dark"
          />
        ) : null}
        {maps ? (
          <a
            href={maps}
            target="_blank"
            rel="noopener noreferrer"
            className="flex h-11 flex-1 items-center justify-center gap-2 rounded-control bg-dark-2 px-4 text-13 font-bold text-on-dark transition-opacity duration-150 ease-out hover:opacity-90 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-lime"
          >
            <MapPin className="size-4" strokeWidth={2} aria-hidden="true" />
            {t.comoLlegar}
          </a>
        ) : null}
      </div>
    </section>
  );
}

export function BookingRow({
  booking,
  onCancel,
}: {
  booking: AccountBooking;
  onCancel: CancelAction;
}) {
  const t = cuenta.reservas;
  return (
    <li className="flex flex-col gap-3 rounded-card bg-surface p-4">
      <div className="flex items-start justify-between gap-3">
        <div className="flex min-w-0 flex-col gap-0.5">
          <b className="truncate text-15 text-ink">{booking.serviceName}</b>
          <span className="text-13 text-ink-soft">
            {dateTimeShort(booking.start, booking.business.timezone)}
          </span>
          <span className="text-13 text-muted">
            {booking.business.name} ·{" "}
            {t.conProfesional({ profesional: booking.staffName })} ·{" "}
            {formatMoney(booking.priceClp)}
          </span>
        </div>
        <StatusBadge booking={booking} />
      </div>
      {booking.reviewRating !== null ? (
        <p className="flex items-center gap-1.5 text-13 font-semibold text-ink">
          <Star
            className="size-4 fill-current text-ink"
            strokeWidth={2}
            aria-hidden="true"
          />
          {t.tuResena({ n: booking.reviewRating })}
        </p>
      ) : null}
      <div className="flex flex-wrap gap-2">
        {booking.canCancel ? (
          <CancelButton
            bookingId={booking.bookingId}
            needsApproval={booking.cancelNeedsApproval}
            cancelWindowHours={booking.cancelWindowHours}
            onCancel={onCancel}
          />
        ) : null}
        {booking.reviewable ? (
          <Link
            href={cuentaHref("cuentaResena", booking.bookingId)}
            className="flex h-11 flex-1 items-center justify-center rounded-control bg-ink px-4 text-13 font-bold text-surface transition-opacity duration-150 ease-out hover:opacity-90 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink"
          >
            {booking.reviewRating !== null ? t.editarResena : t.dejarResena}
          </Link>
        ) : null}
        {!booking.upcoming ? (
          <Link
            href={`/${booking.business.slug}`}
            className="flex h-11 flex-1 items-center justify-center rounded-control border border-border bg-surface px-4 text-13 font-bold text-ink transition-colors duration-150 ease-out hover:bg-field focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink"
          >
            {t.reservarOtraVez}
          </Link>
        ) : null}
      </div>
    </li>
  );
}
