// CustomerForm — datasteget (WP-13 steg 5, R1: ingen referens, formspråk härlett och
// godkänt av ägaren via skärmdumpar i PR E). Validering vid submit och vid blur för
// telefonen (plan §5). Fokus flyttas till första ogiltiga fält.
"use client";

import { ChevronLeft } from "lucide-react";
import { useEffect, useRef, useState, type FormEvent } from "react";

import { Card } from "@/components/ui/card";
import { IconButton } from "@/components/ui/icon-button";
import { TextField } from "@/components/ui/text-field";
import { comun, reserva } from "@/i18n";

import {
  EMAIL_MAX,
  NAME_MAX,
  validateEmail,
  validateName,
  validatePhone,
} from "./client-validation";
import { ConsentCheckbox } from "./consent-checkbox";
import { fieldError, serverError, zodIssueToFieldError } from "./errors";
import type { BookingSelection } from "./flow-state";
// Bara typer (raderas vid kompilering, drar inte in Zod — qa-granskning, item 6).
import type { CustomerFormOutput, WaitlistFormOutput } from "./form-schema";
import { barPrice, summaryText } from "./summary";
import type {
  BookingPageData,
  BookingServerErrorCode,
  CustomerContact,
  DayAvailability,
} from "./types";

interface FieldErrors {
  name?: string;
  phone?: string;
  email?: string;
  terms?: string;
}

/** Uuid via `crypto.getRandomValues` (qa-granskning, item 10): aldrig en
 * konstant — en delad idempotencyKey mellan olika kunder/enheter skulle låta
 * den enas retry råka matcha en annans nya bokning. Kastar hellre än att
 * falla tillbaka på en konstant om webcrypto saknas helt. */
function randomId(): string {
  if (typeof crypto === "undefined") {
    throw new Error("crypto saknas: kan inte skapa idempotencyKey");
  }
  // `typeof` i stället för `"randomUUID" in crypto`: TS lib.dom ser
  // `randomUUID` som en obligatorisk egenskap, så en `in`-kontroll snävar
  // (felaktigt) in else-grenen till `never` och tar bort `getRandomValues`
  // ur typen. jsdom (Vitest) saknar ändå `randomUUID` i praktiken.
  if (typeof crypto.randomUUID === "function") return crypto.randomUUID();
  const bytes = crypto.getRandomValues(new Uint8Array(16));
  bytes[6] = (bytes[6]! & 0x0f) | 0x40; // version 4
  bytes[8] = (bytes[8]! & 0x3f) | 0x80; // variant
  const hex = [...bytes].map((b) => b.toString(16).padStart(2, "0")).join("");
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
}

export function CustomerForm({
  formId,
  data,
  selection,
  day,
  submitting,
  serverErrorCode,
  contact,
  onContactChange,
  onBack,
  onSubmitBooking,
  onSubmitWaitlist,
  initialErrors,
}: {
  formId: string;
  data: BookingPageData;
  selection: BookingSelection;
  day: DayAvailability | null;
  submitting: boolean;
  serverErrorCode: BookingServerErrorCode | null;
  /** Ägs av `BookingScreen` (qa-granskning, item 9): överlever `slot_taken`
   * och "Volver" (till skillnad från samtyckena, som bor lokalt här och
   * alltid är okryssade när komponenten monteras). */
  contact: CustomerContact;
  onContactChange: (patch: Partial<CustomerContact>) => void;
  onBack: () => void;
  onSubmitBooking: (input: CustomerFormOutput) => void;
  onSubmitWaitlist: (input: WaitlistFormOutput) => void;
  /** Bara till design lab (`?estado=datos-errores`): visar fältfel utan att
   * kunden behöver skicka formuläret först. */
  initialErrors?: FieldErrors;
}) {
  const isWaitlist = day?.state === "full";
  const service = data.services.find((s) => s.id === selection.serviceId);
  const slot = day?.slots.find((s) => s.id === selection.slotId) ?? null;

  const [terms, setTerms] = useState(false);
  const [marketing, setMarketing] = useState(false);
  const [errors, setErrors] = useState<FieldErrors>(initialErrors ?? {});
  const [idempotencyKey] = useState(randomId);

  const titleRef = useRef<HTMLHeadingElement>(null);
  const nameRef = useRef<HTMLInputElement>(null);
  const phoneRef = useRef<HTMLInputElement>(null);
  const emailRef = useRef<HTMLInputElement>(null);
  const termsRef = useRef<HTMLInputElement>(null);

  // Fokus vid stegbyte (qa-granskning, item 8): rubriken får fokus när
  // formuläret monteras, så att skärmläsare/tangentbord hamnar där direkt.
  useEffect(() => {
    titleRef.current?.focus();
  }, []);

  // Skydd mot dubbla anrop: en `ref` uppdateras synkront (till skillnad från
  // `submitting`-state, som väntar på nästa render). Två `click()` i samma
  // tick — en riktig dubbelklick-scenario, inte bara snabba men skilda events
  // — hinner annars båda läsa samma "idle"-state innan React hunnit rendera
  // om, och båda skickar iväg ett anrop. `submittingRef` stängs precis innan
  // `onSubmitBooking`/`onSubmitWaitlist` anropas och öppnas igen när
  // `submitting`-propen (satt av BookingScreen) går tillbaka till `false`.
  const submittingRef = useRef(false);
  useEffect(() => {
    submittingRef.current = submitting;
  }, [submitting]);

  if (!service || !selection.date) return null;

  function focusFirstError(next: FieldErrors) {
    if (next.name) nameRef.current?.focus();
    else if (next.phone) phoneRef.current?.focus();
    else if (next.email) emailRef.current?.focus();
    else if (next.terms) termsRef.current?.focus();
  }

  function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    // Ett andra klick medan anropet redan pågår skickar inget (planens R5).
    // `submittingRef` (synkron) fångar även två `click()` i samma tick,
    // `submitting`-propen (nästa render) räcker inte ensam.
    if (submittingRef.current) return;

    const nameResult = validateName(contact.name);
    const phoneResult = validatePhone(contact.phone);
    const emailResult = validateEmail(contact.email);

    const next: FieldErrors = {};
    if (!nameResult.ok) {
      const mapped = zodIssueToFieldError(nameResult.code);
      if (mapped) next.name = fieldError(mapped);
    }
    if (!phoneResult.ok) {
      const mapped = zodIssueToFieldError(phoneResult.code);
      if (mapped) next.phone = fieldError(mapped);
    }
    if (!emailResult.ok) {
      const mapped = zodIssueToFieldError(emailResult.code);
      if (mapped) next.email = fieldError(mapped);
    }
    if (!terms) {
      next.terms = fieldError({ field: "terms", kind: "required" });
    }

    if (Object.keys(next).length > 0) {
      setErrors(next);
      focusFirstError(next);
      return;
    }
    if (!nameResult.ok || !phoneResult.ok || !emailResult.ok) return; // typvakt, kan inte hända

    submittingRef.current = true;
    setErrors({});

    const base = {
      name: nameResult.value,
      phone: phoneResult.value,
      email: emailResult.value ?? "",
      termsAccepted: true as const,
      marketing,
      consentVersion: reserva.consentimientos.version,
      idempotencyKey,
      serviceId: selection.serviceId!,
      staffId: selection.staffId,
      date: selection.date!,
    };
    if (isWaitlist) {
      onSubmitWaitlist(base as WaitlistFormOutput);
    } else {
      onSubmitBooking({
        ...base,
        slotId: selection.slotId,
      } as CustomerFormOutput);
    }
  }

  function handlePhoneBlur() {
    const result = validatePhone(contact.phone);
    if (result.ok) {
      setErrors((prev) => ({ ...prev, phone: undefined }));
      return;
    }
    const mapped = zodIssueToFieldError(result.code);
    setErrors((prev) => ({
      ...prev,
      phone: mapped ? fieldError(mapped) : prev.phone,
    }));
  }

  const price = slot ? barPrice(slot) : null;
  // serverErrorCode är alltid en "stanna kvar på datos"-kod här: koderna som
  // skickar tillbaka till valen (slot_taken/too_soon/outside_hours) eller till
  // väntelistans kort (waitlist_duplicate) byter `step` i reducern innan den
  // här komponenten ens renderas igen — se `flow-state.ts` (qa-granskning,
  // item 3).
  const generalError = serverErrorCode ? serverError(serverErrorCode) : null;

  return (
    <div className="flex flex-col gap-6 pb-35">
      <div className="flex items-center gap-3">
        <IconButton label={comun.volver} size={44} onClick={onBack}>
          <ChevronLeft
            aria-hidden="true"
            className="size-5"
            strokeWidth={2.2}
          />
        </IconButton>
        <h2
          ref={titleRef}
          tabIndex={-1}
          className="text-16 leading-event font-bold text-ink outline-none"
        >
          {reserva.clienteForm.titulo}
        </h2>
      </div>

      <Card radius="tile" padding="lg" className="flex flex-col gap-2">
        <div className="text-15 font-bold text-ink">
          {summaryText(selection, data, day)}
        </div>
        {price ? (
          <div className="flex items-baseline gap-2">
            <span className="font-display text-22 font-semibold text-ink">
              {price.total}
            </span>
            {price.old ? (
              <span className="text-13 text-subtle line-through">
                <span className="sr-only">
                  {reserva.precioAnteriorAria({ precio: price.old })}
                </span>
                <span aria-hidden="true">{price.old}</span>
              </span>
            ) : null}
          </div>
        ) : null}
      </Card>

      {/* noValidate (qa-granskning, item 4): webbläsarens egen validering
       * (och dess bubblor) tystas, så att bara appens egna felmeddelanden
       * (errores.reserva.*) visas — annars vinner webbläsarens "Fyll i det
       * här fältet"/"Ange en e-postadress" över vår text på fel språk/form. */}
      <form
        id={formId}
        noValidate
        aria-busy={submitting}
        onSubmit={handleSubmit}
        className="flex flex-col gap-4"
      >
        <TextField
          ref={nameRef}
          label={reserva.clienteForm.nombreLabel}
          placeholder={reserva.clienteForm.nombrePlaceholder}
          autoComplete="name"
          maxLength={NAME_MAX}
          value={contact.name}
          onChange={(e) => {
            onContactChange({ name: e.target.value });
          }}
          error={errors.name}
        />
        <TextField
          ref={phoneRef}
          label={reserva.clienteForm.telefonoLabel}
          placeholder={reserva.clienteForm.telefonoPlaceholder}
          type="tel"
          inputMode="tel"
          autoComplete="tel"
          value={contact.phone}
          onChange={(e) => {
            onContactChange({ phone: e.target.value });
          }}
          onBlur={handlePhoneBlur}
          error={errors.phone}
        />
        <TextField
          ref={emailRef}
          label={reserva.clienteForm.emailLabel}
          placeholder={reserva.clienteForm.emailPlaceholder}
          type="email"
          autoComplete="email"
          maxLength={EMAIL_MAX}
          value={contact.email}
          onChange={(e) => {
            onContactChange({ email: e.target.value });
          }}
          hint={reserva.clienteForm.emailAyuda}
          error={errors.email}
        />

        <div className="flex flex-col gap-2 text-13 leading-body text-muted">
          <p>
            {reserva.antesDeConfirmar.politicaCancelacion({
              horas: data.business.cancelWindowHours,
            })}
          </p>
          <p>
            {reserva.antesDeConfirmar.avisoWhatsapp({
              negocio: data.business.name,
            })}
          </p>
        </div>

        <div className="flex flex-col gap-3">
          <ConsentCheckbox
            ref={termsRef}
            checked={terms}
            onChange={setTerms}
            required
            error={errors.terms}
          >
            {isWaitlist
              ? reserva.terminosListaEspera
              : reserva.consentimientos.terminos}{" "}
            {reserva.consentimientos.responsable({
              negocio: data.business.name,
            })}
          </ConsentCheckbox>
          <ConsentCheckbox checked={marketing} onChange={setMarketing}>
            {reserva.consentimientos.marketing({ negocio: data.business.name })}
          </ConsentCheckbox>
        </div>

        <p className="text-12 text-muted">
          {reserva.meta.vendidoPor({ negocio: data.business.name })}
        </p>

        {generalError ? (
          <p role="alert" className="text-13 text-ink">
            {generalError}
          </p>
        ) : null}
      </form>
    </div>
  );
}
