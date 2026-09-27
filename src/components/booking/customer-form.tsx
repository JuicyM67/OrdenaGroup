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

import { ConsentCheckbox } from "./consent-checkbox";
import { fieldError, serverError, zodIssueToFieldError } from "./errors";
import type { BookingSelection } from "./flow-state";
import {
  customerFormSchema,
  waitlistFormSchema,
  type CustomerFormOutput,
  type WaitlistFormOutput,
} from "./form-schema";
import { barPrice, summaryText } from "./summary";
import type {
  BookingPageData,
  BookingServerErrorCode,
  DayAvailability,
} from "./types";

interface FieldErrors {
  name?: string;
  phone?: string;
  email?: string;
  terms?: string;
}

function randomId(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }
  // jsdom (vitest) saknar ibland crypto.randomUUID — bara ett testfallback.
  return "00000000-0000-4000-8000-000000000000";
}

export function CustomerForm({
  formId,
  data,
  selection,
  day,
  submitting,
  serverErrorCode,
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

  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [terms, setTerms] = useState(false);
  const [marketing, setMarketing] = useState(false);
  const [errors, setErrors] = useState<FieldErrors>(initialErrors ?? {});
  const [idempotencyKey] = useState(randomId);

  const nameRef = useRef<HTMLInputElement>(null);
  const phoneRef = useRef<HTMLInputElement>(null);
  const emailRef = useRef<HTMLInputElement>(null);
  const termsRef = useRef<HTMLInputElement>(null);

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

  function buildInput() {
    return {
      name,
      phone,
      email,
      termsAccepted: terms,
      marketing,
      consentVersion: reserva.consentimientos.version,
      idempotencyKey,
      serviceId: selection.serviceId,
      staffId: selection.staffId,
      date: selection.date,
      ...(isWaitlist ? {} : { slotId: selection.slotId }),
    };
  }

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

    const schema = isWaitlist ? waitlistFormSchema : customerFormSchema;
    const result = schema.safeParse(buildInput());
    if (!result.success) {
      const next: FieldErrors = {};
      for (const issue of result.error.issues) {
        const mapped = zodIssueToFieldError(issue.message);
        if (!mapped) continue;
        next[mapped.field] = fieldError(mapped);
      }
      setErrors(next);
      focusFirstError(next);
      return;
    }
    submittingRef.current = true;
    setErrors({});
    if (isWaitlist) onSubmitWaitlist(result.data as WaitlistFormOutput);
    else onSubmitBooking(result.data as CustomerFormOutput);
  }

  function handlePhoneBlur() {
    const phoneSchema = isWaitlist
      ? waitlistFormSchema.shape.phone
      : customerFormSchema.shape.phone;
    const result = phoneSchema.safeParse(phone);
    if (result.success) {
      setErrors((prev) => ({ ...prev, phone: undefined }));
      return;
    }
    const mapped = zodIssueToFieldError(result.error.issues[0]?.message ?? "");
    setErrors((prev) => ({
      ...prev,
      phone: mapped ? fieldError(mapped) : prev.phone,
    }));
  }

  const price = slot ? barPrice(slot) : null;

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
        <h2 className="text-16 font-bold text-ink">
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

      <form
        id={formId}
        aria-busy={submitting}
        onSubmit={handleSubmit}
        className="flex flex-col gap-4"
      >
        <TextField
          ref={nameRef}
          label={reserva.clienteForm.nombreLabel}
          placeholder={reserva.clienteForm.nombrePlaceholder}
          autoComplete="name"
          value={name}
          onChange={(e) => {
            setName(e.target.value);
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
          value={phone}
          onChange={(e) => {
            setPhone(e.target.value);
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
          value={email}
          onChange={(e) => {
            setEmail(e.target.value);
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

        {serverErrorCode === "network" ? (
          <p role="alert" className="text-13 text-ink">
            {serverError("network")}
          </p>
        ) : null}
      </form>
    </div>
  );
}
