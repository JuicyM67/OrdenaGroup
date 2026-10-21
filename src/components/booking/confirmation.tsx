// Confirmation — steg 6 (R1: ingen referens, samma formspråk). Ingen BookingBar.
// WP-61 (pilotfynd #1): "Ver mi reserva"/"Ver mi solicitud" länkar till kundens
// egen `/r/[manageToken]` (samma token som bekräftelsemejlet, se
// `src/app/[slug]/actions.ts`) — en vanlig `<a>`, inget extra klient-JS
// (D-039: JS-budget 190 kB på `/[slug]`).
"use client";

import { Check } from "lucide-react";
import { useEffect, useRef } from "react";

import { Card } from "@/components/ui/card";
import { reserva } from "@/i18n";
import { formatMoney } from "@/lib/format/money";

import type { BookingSelection } from "./flow-state";
import { summaryText } from "./summary";
import type { BookingPageData, DayAvailability } from "./types";

export function Confirmation({
  data,
  selection,
  day,
  memberDiscountMinor,
  discountReason,
  manageToken,
}: {
  data: BookingPageData;
  selection: BookingSelection;
  day: DayAvailability | null;
  memberDiscountMinor?: number | null;
  /** WP-31: erbjudande i stället för medlemsrabatt (servern avgör). */
  discountReason?: "member" | "offer" | undefined;
  /** WP-61: `undefined` döljer länken (idempotent omförsök utan token, eller
   * design lab/fixturer som inte skickar en). */
  manageToken?: string | undefined;
}) {
  // Fokus vid stegbyte (qa-granskning, item 8): h1 får fokus när bekräftelsen
  // monteras.
  const titleRef = useRef<HTMLHeadingElement>(null);
  useEffect(() => {
    titleRef.current?.focus();
  }, []);

  // WP-45 (D-033): "Solicitud enviada" (`reserva.confirmacionSolicitud`) i
  // stället för "Reserva confirmada" när negocio tiene apagada la
  // confirmación automática — bokningen är `requested`, inte `confirmed`
  // (`src/app/[slug]/actions.ts`).
  const isRequest = !data.business.autoConfirmBookings;

  return (
    <div className="flex flex-col gap-6">
      <div
        aria-hidden="true"
        className="flex size-14 items-center justify-center rounded-icon bg-lime"
      >
        <Check className="size-6" strokeWidth={2.6} />
      </div>
      <h1
        ref={titleRef}
        tabIndex={-1}
        className="font-display text-24 font-semibold tracking-title text-ink outline-none"
      >
        {isRequest
          ? reserva.confirmacionSolicitud.titulo
          : reserva.confirmacion.titulo}
      </h1>

      <section className="flex flex-col gap-2">
        <h2 className="text-16 leading-event font-bold text-ink">
          {isRequest
            ? reserva.confirmacionSolicitud.resumenTitulo
            : reserva.confirmacion.resumenTitulo}
        </h2>
        <Card radius="tile" padding="lg">
          <div className="text-15 font-bold text-ink">
            {summaryText(selection, data, day)}
          </div>
          {memberDiscountMinor ? (
            <div className="mt-1 text-14 font-semibold text-success-fg">
              {(discountReason === "offer"
                ? reserva.confirmacion.descuentoOferta
                : reserva.confirmacion.descuentoSocio)({
                descuento: formatMoney(memberDiscountMinor),
              })}
            </div>
          ) : null}
        </Card>
      </section>

      <p className="text-14 leading-body text-muted">
        {isRequest
          ? reserva.confirmacionSolicitud.aviso({ negocio: data.business.name })
          : reserva.confirmacion.avisoWhatsapp}
      </p>
      <p className="text-13 leading-body text-muted">
        {reserva.antesDeConfirmar.politicaCancelacion({
          horas: data.business.cancelWindowHours,
        })}
      </p>
      {/* vendidoPor (qa-granskning, item 15): FRÅGA 5b i planen säger "i
       * datasteget (före bekräftelsen) och i bekräftelsen" — fanns bara i
       * CustomerForm, saknades här. */}
      <p className="text-12 text-muted">
        {reserva.meta.vendidoPor({ negocio: data.business.name })}
      </p>
      {manageToken ? (
        <a
          href={`/r/${manageToken}`}
          className="text-14 font-bold text-ink underline underline-offset-2 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink"
        >
          {isRequest
            ? reserva.confirmacionSolicitud.verMiSolicitud
            : reserva.confirmacion.verMiReserva}
        </a>
      ) : null}
    </div>
  );
}
