// BookingScreen — orkestrerar Reserva (`/{slug}`), se docs/tasks/plans/WP-13.md.
// Klienten väljer bara bland det servern (eller fixturerna) redan skickat: inga
// priser eller lediga tider räknas ut här (hård regel 2).
"use client";

import { useEffect, useId, useReducer, useState } from "react";

import { comun, reserva } from "@/i18n";

import { BookingBar } from "./booking-bar";
import { BusinessHeader } from "./business-header";
import { Confirmation } from "./confirmation";
import { CustomerForm } from "./customer-form";
import { DayPicker } from "./day-picker";
import { serverError } from "./errors";
import {
  bookingFlowReducer,
  canContinue,
  initialFlowState,
  type BookingFlowState,
} from "./flow-state";
import type { CustomerFormOutput, WaitlistFormOutput } from "./form-schema";
import { ServiceCard } from "./service-card";
import { StaffPicker } from "./staff-picker";
import { barPrice, findDay, summaryText } from "./summary";
import { TimeSlotGrid } from "./time-slot-grid";
import type { BookingActionResult, BookingPageData } from "./types";
import { WaitlistCard } from "./waitlist-card";

const SELECTION_ALERT_CODES = new Set([
  "slot_taken",
  "too_soon",
  "outside_hours",
]);

export interface BookingScreenProps {
  data: BookingPageData;
  submitBooking: (input: CustomerFormOutput) => Promise<BookingActionResult>;
  joinWaitlist: (input: WaitlistFormOutput) => Promise<BookingActionResult>;
  /** Bara till design lab (`?estado=`): förvalt tillstånd i stället för det tomma. */
  initialState?: BookingFlowState;
  /** Bara till design lab (`?estado=cargando`): visar `vacios.cargandoHorarios`. */
  loadingHorarios?: boolean;
  /** Bara till design lab (`?estado=datos-errores`): fältfel utan att skicka. */
  initialFormErrors?: {
    name?: string;
    phone?: string;
    email?: string;
    terms?: string;
  };
  /** Bara till design lab (`?estado=sin-conexion`): tvingar offline-raden. */
  forceOffline?: boolean;
}

export function BookingScreen({
  data,
  submitBooking,
  joinWaitlist,
  initialState,
  loadingHorarios,
  initialFormErrors,
  forceOffline,
}: BookingScreenProps) {
  const [state, dispatch] = useReducer(
    bookingFlowReducer,
    initialState ?? initialFlowState,
  );
  const [isOffline, setIsOffline] = useState(
    () =>
      !!forceOffline || (typeof navigator !== "undefined" && !navigator.onLine),
  );
  const formId = useId();

  useEffect(() => {
    const onOffline = () => {
      setIsOffline(true);
    };
    const onOnline = () => {
      setIsOffline(false);
    };
    window.addEventListener("offline", onOffline);
    window.addEventListener("online", onOnline);
    return () => {
      window.removeEventListener("offline", onOffline);
      window.removeEventListener("online", onOnline);
    };
  }, []);

  // Historik (planens steg 5): `datos` läggs som `?paso=datos` (pushState) så att
  // bakåtknappen på Android går tillbaka till valen med allt kvar. Bekräftelsen
  // ersätter posten (replaceState), så att bakåt inte skickar formuläret igen.
  useEffect(() => {
    if (state.step === "datos") {
      if (window.location.search !== "?paso=datos") {
        window.history.pushState({ paso: "datos" }, "", "?paso=datos");
      }
    } else if (state.step === "confirmacion") {
      window.history.replaceState({}, "", window.location.pathname);
    }
  }, [state.step]);

  useEffect(() => {
    const onPopState = () => {
      dispatch({ type: "go_back" });
    };
    window.addEventListener("popstate", onPopState);
    return () => {
      window.removeEventListener("popstate", onPopState);
    };
  }, []);

  if (data.business.status === "frozen") {
    return (
      <div className="flex flex-col gap-6 p-5 pb-10">
        <BusinessHeader business={data.business} />
        <p className="text-14 text-muted">
          {reserva.vacios.negocioNoDisponible}
        </p>
      </div>
    );
  }

  if (data.services.length === 0) {
    return (
      <div className="flex flex-col gap-6 p-5 pb-10">
        <BusinessHeader business={data.business} />
        <p className="text-14 text-muted">{reserva.vacios.sinServicios}</p>
      </div>
    );
  }

  const { selection } = state;
  const day = findDay(data, selection, selection.date);
  const dayIsFull = day?.state === "full";
  const barVisible = canContinue(selection, dayIsFull);

  const daysForSelection = selection.serviceId
    ? (data.availability[selection.serviceId]?.[selection.staffId] ??
      data.availability[selection.serviceId]?.any ??
      [])
    : [];

  const visibleSlots = (day?.slots ?? []).filter(
    (s) => !state.removedSlotIds.includes(s.id),
  );

  function selectService(serviceId: string) {
    const keepDay = !!findDay(
      data,
      { serviceId, staffId: selection.staffId },
      selection.date,
    );
    dispatch({ type: "select_service", serviceId, keepDay });
  }

  function selectStaff(staffId: string) {
    const keepDay =
      !!selection.serviceId &&
      !!findDay(
        data,
        { serviceId: selection.serviceId, staffId },
        selection.date,
      );
    dispatch({ type: "select_staff", staffId, keepDay });
  }

  async function handleSubmitBooking(input: CustomerFormOutput) {
    dispatch({ type: "submit_start" });
    const result = await submitBooking(input);
    if (result.ok) dispatch({ type: "submit_success" });
    else dispatch({ type: "submit_error", code: result.code });
  }

  async function handleSubmitWaitlist(input: WaitlistFormOutput) {
    dispatch({ type: "join_waitlist_start" });
    const result = await joinWaitlist(input);
    if (result.ok) dispatch({ type: "join_waitlist_success" });
    else dispatch({ type: "join_waitlist_error", code: result.code });
  }

  const summary = summaryText(selection, data, day);
  const slot = day?.slots.find((s) => s.id === selection.slotId) ?? null;
  const price = slot ? barPrice(slot) : null;

  let ctaLabel: string = reserva.bookingBar.ctaReservar;
  let ctaDisabled = false;
  let ctaAction: (() => void) | undefined = () => {
    dispatch({ type: "go_to_datos" });
  };

  if (dayIsFull) {
    if (state.waitlistJoined) {
      ctaLabel = reserva.waitlist.ctaEnLaLista;
      ctaDisabled = true;
      ctaAction = undefined;
    } else {
      ctaLabel = reserva.waitlist.ctaAvisame;
    }
  }

  if (state.step === "datos") {
    ctaLabel = dayIsFull
      ? reserva.waitlist.ctaUnirme
      : reserva.antesDeConfirmar.ctaConfirmar;
    ctaDisabled = state.formStatus === "submitting";
    ctaAction = undefined;
  }

  return (
    <div className="relative flex min-h-full flex-col gap-6 p-5 pb-35">
      {state.step === "seleccion" ? (
        <>
          <BusinessHeader business={data.business} />

          <section
            aria-labelledby="paso-servicio"
            className="flex flex-col gap-2.5"
          >
            <h2 id="paso-servicio" className="text-16 font-bold text-ink">
              {reserva.pasos.servicio}
            </h2>
            <div className="flex flex-col gap-2.5">
              {data.services.map((service) => (
                <ServiceCard
                  key={service.id}
                  service={service}
                  selected={selection.serviceId === service.id}
                  onSelect={() => {
                    selectService(service.id);
                  }}
                />
              ))}
            </div>
          </section>

          <section
            aria-labelledby="paso-profesional"
            className="flex flex-col gap-2.5"
          >
            <h2 id="paso-profesional" className="text-16 font-bold text-ink">
              {reserva.pasos.profesional}
            </h2>
            <StaffPicker
              staff={data.staff}
              selectedId={selection.staffId}
              onSelect={selectStaff}
            />
          </section>

          <section
            aria-labelledby="paso-dia-hora"
            className="flex flex-col gap-2.5"
          >
            {selection.serviceId && daysForSelection.length > 0 ? (
              <DayPicker
                headingId="paso-dia-hora"
                days={daysForSelection}
                selectedDate={selection.date}
                onSelect={(date) => {
                  dispatch({ type: "select_day", date });
                }}
              />
            ) : (
              <>
                <h2 id="paso-dia-hora" className="text-16 font-bold text-ink">
                  {reserva.pasos.diaYHora}
                </h2>
                <p className="text-14 text-muted">
                  {!selection.serviceId
                    ? reserva.vacios.eligeServicio
                    : reserva.vacios.sinHorariosEnRango}
                </p>
              </>
            )}

            {selection.date && day ? (
              loadingHorarios ? (
                <p
                  role="status"
                  aria-busy="true"
                  className="text-14 text-muted"
                >
                  {reserva.vacios.cargandoHorarios}
                </p>
              ) : day.state === "full" ? (
                <WaitlistCard
                  date={day.date}
                  joined={state.waitlistJoined}
                  duplicate={state.errorCode === "waitlist_duplicate"}
                />
              ) : visibleSlots.length === 0 ? (
                <p className="text-14 text-muted">
                  {reserva.vacios.sinHorariosEseDia}
                </p>
              ) : (
                <>
                  {state.errorCode &&
                  SELECTION_ALERT_CODES.has(state.errorCode) ? (
                    <div
                      role="alert"
                      className="rounded-tile bg-peach-50 p-3 text-13 text-ink"
                    >
                      {serverError(state.errorCode)}
                    </div>
                  ) : null}
                  <TimeSlotGrid
                    slots={visibleSlots}
                    selectedSlotId={selection.slotId}
                    onSelect={(slotId) => {
                      dispatch({ type: "select_slot", slotId });
                    }}
                  />
                </>
              )
            ) : null}
          </section>
        </>
      ) : state.step === "datos" ? (
        <CustomerForm
          formId={formId}
          data={data}
          selection={selection}
          day={day}
          submitting={state.formStatus === "submitting"}
          serverErrorCode={state.errorCode}
          onBack={() => {
            dispatch({ type: "go_back" });
          }}
          onSubmitBooking={handleSubmitBooking}
          onSubmitWaitlist={handleSubmitWaitlist}
          initialErrors={initialFormErrors}
        />
      ) : (
        <Confirmation data={data} selection={selection} day={day} />
      )}

      {isOffline && state.step !== "confirmacion" ? (
        <p role="status" className="text-13 text-ink">
          {comun.sinConexion}
        </p>
      ) : null}

      {state.step === "seleccion" && barVisible ? (
        <BookingBar
          summary={summary}
          price={dayIsFull ? null : price}
          ctaLabel={ctaLabel}
          ctaDisabled={ctaDisabled}
          onCta={ctaAction}
        />
      ) : null}

      {state.step === "datos" ? (
        <BookingBar
          summary={summary}
          price={dayIsFull ? null : price}
          ctaLabel={ctaLabel}
          ctaDisabled={ctaDisabled}
          formId={formId}
        />
      ) : null}
    </div>
  );
}
