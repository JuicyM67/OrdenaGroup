// BookingScreen — orkestrerar Reserva (`/{slug}`), se docs/tasks/plans/WP-13.md.
// Klienten väljer bara bland det servern (eller fixturerna) redan skickat: inga
// priser eller lediga tider räknas ut här (hård regel 2).
"use client";

import { queryString } from "@/config/url-params";
import {
  type ReactNode,
  useEffect,
  useId,
  useReducer,
  useState,
  useSyncExternalStore,
} from "react";

import { comun, formulario, reserva } from "@/i18n";

import { BookingBar } from "./booking-bar";
import { BusinessHeader } from "./business-header";
import {
  ALL_CATEGORY_ID,
  categoryTabs,
  servicesForCategory,
} from "./categories";
import { CategoryTabs } from "./category-tabs";
import { Confirmation } from "./confirmation";
import { CustomerForm } from "./customer-form";
import { DayPicker } from "./day-picker";
import { serverError } from "./errors";
import {
  bookingFlowReducer,
  canContinue,
  initialFlowState,
  type BookingFlowState,
  type BookingSelection,
} from "./flow-state";
import type { CustomerFormOutput, WaitlistFormOutput } from "./form-schema";
import { ProfileFlowProvider, type MobileTab } from "./profile-flow-context";
import { ServiceCard } from "./service-card";
import { StaffPicker } from "./staff-picker";
import { barPrice, findDay, summaryText } from "./summary";
import { TimeSlotGrid } from "./time-slot-grid";
import type {
  BookingActionResult,
  BookingPageData,
  CustomerContact,
} from "./types";
import { WaitlistCard } from "./waitlist-card";

const SELECTION_ALERT_CODES = new Set([
  "slot_taken",
  "too_soon",
  "outside_hours",
]);

const NO_CONTACT: CustomerContact = { name: "", phone: "", email: "" };

// useSyncExternalStore (qa-granskning, item 1): `navigator.onLine` finns inte
// på servern (Node), så en `useState`-initializer som läser den ger olika
// resultat på server och klient → hydreringsfel #418 på varje sidladdning.
// Servergissningen är "online" (`getServerSnapshot` → true); klienten synkar
// till det riktiga värdet i samma commit som hydreringen, utan ett extra
// render-steg som en `useEffect`-baserad lösning skulle kräva.
function subscribeOnline(callback: () => void): () => void {
  window.addEventListener("online", callback);
  window.addEventListener("offline", callback);
  return () => {
    window.removeEventListener("online", callback);
    window.removeEventListener("offline", callback);
  };
}
function getOnlineSnapshot(): boolean {
  return navigator.onLine;
}
function getServerOnlineSnapshot(): boolean {
  return true;
}

export interface BookingScreenProps {
  data: BookingPageData;
  /** WP-53 (D-040): hela profilvyn (`ProfileBrowse`), färdigrenderad av
   * servern — ingen av dess markup/text/formatering är med i klientbunten.
   * `undefined` när `data.profile` saknas (fixturer/tester utan profil). */
  profileContent?: ReactNode;
  /** WP-31: erbjudanderaden (`?o=`), färdigrenderad av servern. Token
   * binds i `submitBooking`-closuren på servern, aldrig här. */
  offerNotice?: ReactNode;
  submitBooking: (input: CustomerFormOutput) => Promise<BookingActionResult>;
  joinWaitlist: (input: WaitlistFormOutput) => Promise<BookingActionResult>;
  /** Bara till design lab (`?estado=`): förvalt tillstånd i stället för det tomma. */
  initialState?: BookingFlowState;
  /** WP-30: `/{slug}?flash=<id>` — förvald tjänst/profesional/dag/tid,
   * beräknad på servern. Hoppar direkt till valvyn. */
  initialSelection?: BookingSelection;
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
  /** WP-65: `?resenas=N` (Ver más reseñas) öppnar mobilens Reseñas-flik. */
  initialMobileTab?: MobileTab;
}

export function BookingScreen({
  data,
  submitBooking,
  joinWaitlist,
  initialState,
  initialSelection,
  loadingHorarios,
  initialFormErrors,
  forceOffline,
  profileContent,
  offerNotice,
  initialMobileTab,
}: BookingScreenProps) {
  const [state, dispatch] = useReducer(
    bookingFlowReducer,
    initialState ??
      (initialSelection
        ? { ...initialFlowState, selection: initialSelection }
        : initialFlowState),
  );
  const isBrowserOnline = useSyncExternalStore(
    subscribeOnline,
    getOnlineSnapshot,
    getServerOnlineSnapshot,
  );
  const isOffline = !!forceOffline || !isBrowserOnline;
  const formId = useId();

  // Kundens namn/telefon/e-post (qa-granskning, item 9): hör till skärmen, inte
  // till formulärkomponenten, så att de överlever `slot_taken` och "Volver"
  // (CustomerForm avmonteras när steget går tillbaka till "seleccion").
  // Samtyckena bor kvar lokalt i CustomerForm och nollställs alltså varje gång
  // den monteras igen — de är aldrig förkryssade.
  const [contact, setContact] = useState<CustomerContact>(NO_CONTACT);
  const [memberDiscount, setMemberDiscount] = useState<number | null>(null);
  const [discountReason, setDiscountReason] = useState<
    "member" | "offer" | undefined
  >(undefined);
  // WP-61: kundens egen `/r/[token]`-länk i `Confirmation`.
  const [manageToken, setManageToken] = useState<string | undefined>(undefined);
  function updateContact(patch: Partial<CustomerContact>) {
    setContact((prev) => ({ ...prev, ...patch }));
  }

  // WP-40 (D-031): vald kategoriflik. Ren UI-state (ingen historik/URL,
  // samma nivå som `contact`) — filtret gäller bara steg 1, tjänstevalet
  // (`selection.serviceId`) i flödesreducern rörs inte av bytet.
  const [categoryId, setCategoryId] = useState<string>(ALL_CATEGORY_ID);
  const tabs = categoryTabs(data.categories ?? [], data.services);
  const visibleServices =
    tabs.length > 0
      ? servicesForCategory(data.services, categoryId)
      : data.services;

  // WP-41: företagsprofilen (`ProfileBrowse`, serverrenderad till
  // `profileContent` sedan WP-53/D-040) är den nya starten på `/{slug}` —
  // "Boka" på en tjänst väljer den (samma reducer som förut) och växlar till
  // den befintliga profesional/dag/hora-vyn ("picker"). Fixturer utan
  // `data.profile` (design lab, `e2e/design-lab-reserva.spec.ts`) saknar
  // `profileContent` och hoppar rakt till "picker" — oförändrat beteende
  // där. `mobileTab` är profilens egen flikstat (Tjänster/Personal/Om
  // oss/Info), skild från `categoryId`; båda delas med profilvyn via
  // `ProfileFlowProvider` (profile-flow-context.tsx).
  const [viewMode, setViewMode] = useState<"profile" | "picker">(
    profileContent && !initialSelection ? "profile" : "picker",
  );
  const [mobileTab, setMobileTab] = useState<MobileTab>(
    initialMobileTab ?? "servicios",
  );
  function bookService(serviceId: string) {
    selectService(serviceId);
    setViewMode("picker");
  }

  // Historik (planens steg 5): `datos` läggs som `?paso=datos` (pushState) så att
  // bakåtknappen på Android går tillbaka till valen med allt kvar. Bekräftelsen
  // ersätter posten (replaceState), så att bakåt inte skickar formuläret igen.
  useEffect(() => {
    if (state.step === "datos") {
      const datosQuery = queryString("paso", "datos");
      if (window.location.search !== datosQuery) {
        window.history.pushState({ paso: "datos" }, "", datosQuery);
      }
    } else if (state.step === "confirmacion") {
      window.history.replaceState({}, "", window.location.pathname);
    }
  }, [state.step]);

  useEffect(() => {
    const onPopState = () => {
      // Bakåt från bekräftelsen (qa-granskning, item 7): nollställ i stället
      // för att öppna valen med den redan bokade tiden.
      if (state.step === "confirmacion") {
        dispatch({ type: "reset" });
        setContact(NO_CONTACT);
      } else {
        dispatch({ type: "go_back" });
      }
    };
    window.addEventListener("popstate", onPopState);
    return () => {
      window.removeEventListener("popstate", onPopState);
    };
  }, [state.step]);

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
  // WP-73 (D-048): utan väntelista i planen visas bara "dagen är full".
  const waitlistOn = data.business.waitlist !== false;
  const dayIsFull = day?.state === "full" && waitlistOn;
  const barVisible = canContinue(selection, dayIsFull);

  // Ingen fallback till "any" (qa-granskning, item 13): annars visas
  // Cualquieras dagar/tider som om de vore en namngiven profesionals.
  const daysForSelection = selection.serviceId
    ? (data.availability[selection.serviceId]?.[selection.staffId] ?? [])
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

  // try/catch (qa-granskning, item 2): ett avbrutet/nätverksfel (t.ex.
  // `page.route(...).abort()`) kastar i `fetch`, inte ett `{ ok: false }`-svar.
  // Utan fångst skulle det bli en okontrollerad avvisad Promise och `submitting`
  // skulle stå kvar i "submitting" för alltid. `submittingRef` i CustomerForm
  // släpps av att `submitting`-propen går tillbaka till `false`, och samma
  // `idempotencyKey` (state i CustomerForm, avmonteras inte vid ett fel) används
  // automatiskt igen vid ett nytt försök.
  async function handleSubmitBooking(input: CustomerFormOutput) {
    dispatch({ type: "submit_start" });
    try {
      const result = await submitBooking(input);
      if (result.ok && result.checkoutUrl) {
        // WP-64 (D-044): vidare till Stripes hostade betalsida. `submitting`
        // står kvar så att knappen inte kan tryckas igen under omdirigeringen.
        window.location.assign(result.checkoutUrl);
        return;
      }
      if (result.ok) {
        setMemberDiscount(result.memberDiscountMinor ?? null);
        setDiscountReason(result.discountReason);
        setManageToken(result.manageToken);
        dispatch({ type: "submit_success" });
      } else dispatch({ type: "submit_error", code: result.code });
    } catch {
      dispatch({ type: "submit_error", code: "network" });
    }
  }

  async function handleSubmitWaitlist(input: WaitlistFormOutput) {
    dispatch({ type: "join_waitlist_start" });
    try {
      const result = await joinWaitlist(input);
      if (result.ok) dispatch({ type: "join_waitlist_success" });
      else dispatch({ type: "join_waitlist_error", code: result.code });
    } catch {
      dispatch({ type: "join_waitlist_error", code: "network" });
    }
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
      : data.business.autoConfirmBookings
        ? reserva.antesDeConfirmar.ctaConfirmar
        : reserva.antesDeConfirmar.ctaEnviarSolicitud;
    ctaDisabled = state.formStatus === "submitting";
    ctaAction = undefined;
  }

  // WP-41: `ProfileBrowse` (viewMode "profile") svämmar över hela bredden
  // (omslagsbild, sidopanel på dator) och sköter sin egen padding/sticky
  // bokningsrad per brytpunkt — den ärver inte den gamla mobilpaddingen
  // (`p-5 pb-35`) som resten av flödet fortfarande använder.
  const isProfileBrowse = state.step === "seleccion" && viewMode === "profile";

  return (
    <div
      className={
        isProfileBrowse
          ? "relative flex min-h-full flex-col"
          : "relative flex min-h-full flex-col gap-6 p-5 pb-35"
      }
    >
      {offerNotice && state.step !== "confirmacion" ? (
        <div className={isProfileBrowse ? "px-5 pt-4" : undefined}>
          {offerNotice}
        </div>
      ) : null}
      {state.step === "seleccion" ? (
        isProfileBrowse && profileContent ? (
          <ProfileFlowProvider
            value={{
              categoryId,
              onSelectCategory: setCategoryId,
              mobileTab,
              onSelectMobileTab: setMobileTab,
              bookService,
            }}
          >
            {profileContent}
          </ProfileFlowProvider>
        ) : (
          <>
            {profileContent ? (
              // WP-41: ingen referens för den här länken (ny, bara i "picker"-läget
              // — se kommentaren vid `viewMode` ovan). Vanlig `<button>`, inte
              // `TextLink` (den är till riktig navigation via `next/link`, det här
              // är bara ett lokalt vy-byte).
              <button
                type="button"
                onClick={() => setViewMode("profile")}
                className="self-start text-13 font-semibold text-ink underline transition-colors duration-150 ease-out hover:text-pending-fg focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink focus-visible:transition-none"
              >
                {comun.volver}
              </button>
            ) : null}
            <BusinessHeader business={data.business} />

            <section
              aria-labelledby="paso-servicio"
              className="flex flex-col gap-2.5"
            >
              <h2
                id="paso-servicio"
                className="text-16 leading-event font-bold text-ink"
              >
                {reserva.pasos.servicio}
              </h2>
              {tabs.length > 0 ? (
                <CategoryTabs
                  tabs={tabs}
                  selectedId={categoryId}
                  onSelect={setCategoryId}
                />
              ) : null}
              <div className="flex flex-col gap-2.5">
                {visibleServices.length === 0 ? (
                  <p className="text-14 text-muted">
                    {formulario.categorias.vacia}
                  </p>
                ) : (
                  visibleServices.map((service) => (
                    <ServiceCard
                      key={service.id}
                      service={service}
                      selected={selection.serviceId === service.id}
                      onSelect={() => {
                        selectService(service.id);
                      }}
                    />
                  ))
                )}
              </div>
            </section>

            <section
              aria-labelledby="paso-profesional"
              className="flex flex-col gap-2.5"
            >
              <h2
                id="paso-profesional"
                className="text-16 leading-event font-bold text-ink"
              >
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
                  <h2
                    id="paso-dia-hora"
                    className="text-16 leading-event font-bold text-ink"
                  >
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
                    waitlist={waitlistOn}
                  />
                ) : (
                  <>
                    {/* Felrutan ska synas även när tiden som togs bort var den
                     * sista kvarvarande (qa-granskning, item 14) — den står
                     * alltså som ett eget villkor, inte nästlad i grenen som
                     * bara gäller när `visibleSlots` inte är tom. */}
                    {state.errorCode &&
                    SELECTION_ALERT_CODES.has(state.errorCode) ? (
                      <div
                        role="alert"
                        className="rounded-tile bg-peach-50 p-3 text-13 text-ink"
                      >
                        {serverError(state.errorCode)}
                      </div>
                    ) : null}
                    {visibleSlots.length === 0 ? (
                      <p className="text-14 text-muted">
                        {reserva.vacios.sinHorariosEseDia}
                      </p>
                    ) : (
                      <TimeSlotGrid
                        slots={visibleSlots}
                        selectedSlotId={selection.slotId}
                        onSelect={(slotId) => {
                          dispatch({ type: "select_slot", slotId });
                        }}
                      />
                    )}
                  </>
                )
              ) : null}
            </section>
          </>
        )
      ) : state.step === "datos" ? (
        <CustomerForm
          formId={formId}
          data={data}
          selection={selection}
          day={day}
          submitting={state.formStatus === "submitting"}
          serverErrorCode={state.errorCode}
          contact={contact}
          onContactChange={updateContact}
          onBack={() => {
            dispatch({ type: "go_back" });
          }}
          onSubmitBooking={handleSubmitBooking}
          onSubmitWaitlist={handleSubmitWaitlist}
          initialErrors={initialFormErrors}
        />
      ) : (
        <Confirmation
          data={data}
          selection={selection}
          day={day}
          memberDiscountMinor={memberDiscount}
          discountReason={discountReason}
          manageToken={manageToken}
        />
      )}

      {!isProfileBrowse && isOffline && state.step !== "confirmacion" ? (
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
