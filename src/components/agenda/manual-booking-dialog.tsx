"use client";
// "Nueva reserva" (WP-21b): la dueña agenda por teléfono/walk-in. Sin referencia
// *.dc.html (fuera del alcance visual de WP-21b, ver informe) — usa los mismos tokens
// que el resto de Agenda/Reserva (Dialog de Radix, ya usado para Popover en
// event-popover.tsx). Motivo de día/hora libres (no una lista de horas): la dueña puede
// reservar fuera del rutnät (SCHEDULING.md, política 5) — el motor ya lo permite (ver
// `src/server/bookings/create.db.test.ts`, "16:07"). El servidor (`createManualBooking`)
// es la única fuente de verdad: este diálogo solo valida el borde (campos vacíos/formato).
import * as Dialog from "@radix-ui/react-dialog";
import { X } from "lucide-react";
import { useId, useState, type FormEvent } from "react";

import { Button } from "@/components/ui/button";
import { DateField } from "@/components/ui/date-field";
import { IconButton } from "@/components/ui/icon-button";
import { Select } from "@/components/ui/select";
import { TextField } from "@/components/ui/text-field";
import { useSheetDrag } from "@/components/ui/use-sheet-drag";
import { agenda, clientes, comun, reserva } from "@/i18n";
import type { LocalDate, LocalTime } from "@/lib/format/dates";
import type { E164 } from "@/lib/format/phone";

import {
  EMAIL_MAX,
  NAME_MAX,
  validateEmail,
  validateName,
  validatePhone,
} from "../booking/client-validation";
import { ConsentCheckbox } from "../booking/consent-checkbox";
import { zodIssueToFieldError } from "../booking/errors";
import { agendaServerError, manualFieldError } from "./errors";
import type { AgendaStaff } from "./types";

export type ManualBookingCatalogService = {
  readonly id: string;
  readonly name: string;
  readonly staffIds: readonly string[];
};

export type ManualBookingSubmit = {
  serviceId: string;
  staffId: string;
  date: LocalDate;
  time: LocalTime;
  name: string;
  phone: E164;
  /** "" om tomt (aldrig `undefined`) — matchar `manualBookingInputSchema` (server). */
  email: string;
  notes?: string;
  consent: boolean;
};

export type ManualBookingDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  services: readonly ManualBookingCatalogService[];
  staff: readonly AgendaStaff[];
  businessName: string;
  defaultDate: LocalDate;
  onSubmit: (
    input: ManualBookingSubmit,
  ) => Promise<{ ok: true } | { ok: false; error: string }>;
};

const ANY_STAFF = "any";

type FieldErrors = {
  service?: string;
  staff?: string;
  date?: string;
  time?: string;
  name?: string;
  phone?: string;
  email?: string;
};

export function ManualBookingDialog({
  open,
  onOpenChange,
  services,
  staff,
  businessName,
  defaultDate,
  onSubmit,
}: ManualBookingDialogProps) {
  const descriptionId = useId();
  // WP-47 (tillägg D): dra-för-att-stänga på mobil (bottenark). Destrukturerad direkt (inte
  // `sheetDrag.panelRef`/`sheetDrag.handleProps` i JSX) — `react-hooks/refs` känner bara
  // igen det förstnämnda mönstret som en "riktig" ref-användning utanför render.
  const { panelRef, handleProps: dragHandleProps } = useSheetDrag(() =>
    onOpenChange(false),
  );
  const [serviceId, setServiceId] = useState("");
  const [staffId, setStaffId] = useState(ANY_STAFF);
  const [date, setDate] = useState<string>(defaultDate);
  const [time, setTime] = useState("");
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [notes, setNotes] = useState("");
  const [consent, setConsent] = useState(false);
  const [errors, setErrors] = useState<FieldErrors>({});
  const [generalError, setGeneralError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  function reset() {
    setServiceId("");
    setStaffId(ANY_STAFF);
    setDate(defaultDate);
    setTime("");
    setName("");
    setPhone("");
    setEmail("");
    setNotes("");
    setConsent(false);
    setErrors({});
    setGeneralError(null);
  }

  const service = services.find((s) => s.id === serviceId);
  const eligibleStaff = service
    ? staff.filter((s) => service.staffIds.includes(s.id))
    : staff;

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (submitting) return;

    const nameResult = validateName(name);
    const phoneResult = validatePhone(phone);
    const emailResult = validateEmail(email);

    const next: FieldErrors = {};
    if (!serviceId)
      next.service = manualFieldError({ field: "service", kind: "empty" });
    if (!date) next.date = manualFieldError({ field: "date", kind: "empty" });
    if (!time) next.time = manualFieldError({ field: "time", kind: "empty" });
    if (!nameResult.ok) {
      const mapped = zodIssueToFieldError(nameResult.code);
      if (mapped?.field === "name")
        next.name = manualFieldError({ field: "name", kind: "empty" });
    }
    if (!phoneResult.ok) {
      const mapped = zodIssueToFieldError(phoneResult.code);
      if (mapped?.field === "phone")
        next.phone = manualFieldError({ field: "phone", kind: mapped.kind });
    }
    if (!emailResult.ok)
      next.email = manualFieldError({ field: "email", kind: "invalid" });

    if (Object.keys(next).length > 0) {
      setErrors(next);
      return;
    }
    if (!nameResult.ok || !phoneResult.ok || !emailResult.ok) return; // typvakt

    setSubmitting(true);
    setErrors({});
    setGeneralError(null);

    const result = await onSubmit({
      serviceId,
      staffId,
      date: date as LocalDate,
      time: time as LocalTime,
      name: nameResult.value,
      phone: phoneResult.value,
      // "" (inte undefined): manualBookingInputSchema (server) förväntar "" för tomt
      // fält, samma mönster som customer-form.tsx (`email: emailResult.value ?? ""`).
      email: emailResult.value ?? "",
      notes: notes.trim() || undefined,
      consent,
    });

    setSubmitting(false);
    if (result.ok) {
      reset();
      onOpenChange(false);
      return;
    }
    setGeneralError(agendaServerError(result.error));
  }

  return (
    <Dialog.Root
      open={open}
      onOpenChange={(next) => {
        if (!next) reset();
        onOpenChange(next);
      }}
    >
      <Dialog.Portal>
        {/* WP-42: bottenark på mobil (items-end, rundade hörn bara upptill), centrerad dialog
            från sm och uppåt. WP-47: `bg-canvas` (inte `bg-surface`) — fälten (TextField/
            Select) är `bg-surface` (vitt), och utan kontrast mot en likadan panelbakgrund
            syntes kanterna inte alls (granskningsfynd). Glider ner vid stängning
            (`sheet-closed:translate-y-full`, Radix Presence väntar på att CSS-
            transitionen är klar innan den avmonterar) och kan dras ner för att stängas
            (`useSheetDrag`, handtaget nedan) — handtaget är `sm:hidden`, från `sm` och
            uppåt är arket centrerat, inte ett bottenark. */}
        <Dialog.Overlay className="fixed inset-0 z-20 flex items-end justify-center bg-ink/45 sm:items-center sm:p-4">
          <Dialog.Content
            ref={panelRef}
            aria-describedby={descriptionId}
            className="flex max-h-full w-full max-w-md translate-y-0 flex-col gap-4 overflow-y-auto rounded-t-panel bg-canvas p-6 shadow-popover transition-transform duration-200 ease-out sm:rounded-panel sheet-closed:translate-y-full"
          >
            <div
              aria-hidden="true"
              className="-mt-2 mb-1 h-1.5 w-10 shrink-0 touch-none self-center rounded-full bg-line-strong sm:hidden"
              {...dragHandleProps}
            />
            <div className="flex items-start justify-between">
              <Dialog.Title className="text-17 font-bold">
                {agenda.manual.tituloNueva}
              </Dialog.Title>
              <Dialog.Close asChild>
                <IconButton label={comun.cerrar} tone="ghost" size={30}>
                  <X aria-hidden="true" className="size-4" strokeWidth={2.2} />
                </IconButton>
              </Dialog.Close>
            </div>
            <Dialog.Description id={descriptionId} className="sr-only">
              {agenda.manual.tituloNueva}
            </Dialog.Description>

            <form
              noValidate
              aria-busy={submitting}
              onSubmit={handleSubmit}
              className="flex flex-col gap-4"
            >
              <Select
                label={agenda.manual.campos.servicio}
                value={serviceId}
                onChange={(e) => {
                  setServiceId(e.target.value);
                  setStaffId(ANY_STAFF);
                }}
                error={errors.service}
                required
              >
                <option value="" disabled>
                  …
                </option>
                {services.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name}
                  </option>
                ))}
              </Select>

              <Select
                label={agenda.manual.campos.profesional}
                value={staffId}
                onChange={(e) => {
                  setStaffId(e.target.value);
                }}
                error={errors.staff}
              >
                <option value={ANY_STAFF}>{reserva.pasos.cualquiera}</option>
                {eligibleStaff.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name}
                  </option>
                ))}
              </Select>

              <div className="grid grid-cols-2 gap-3">
                <DateField
                  label={agenda.manual.campos.dia}
                  value={date}
                  onChange={setDate}
                  error={errors.date}
                  required
                />
                <TextField
                  label={agenda.manual.campos.hora}
                  type="time"
                  step={60}
                  value={time}
                  onChange={(e) => {
                    setTime(e.target.value);
                  }}
                  error={errors.time}
                  required
                />
              </div>

              <TextField
                label={agenda.manual.campos.cliente}
                autoComplete="name"
                maxLength={NAME_MAX}
                value={name}
                onChange={(e) => {
                  setName(e.target.value);
                }}
                error={errors.name}
                required
              />
              <TextField
                label={agenda.manual.campos.telefono}
                type="tel"
                inputMode="tel"
                autoComplete="tel"
                value={phone}
                onChange={(e) => {
                  setPhone(e.target.value);
                }}
                error={errors.phone}
                required
              />
              <TextField
                label={reserva.clienteForm.emailLabel}
                type="email"
                autoComplete="email"
                maxLength={EMAIL_MAX}
                value={email}
                onChange={(e) => {
                  setEmail(e.target.value);
                }}
                error={errors.email}
              />

              <div className="flex flex-col gap-1.5">
                <label
                  htmlFor="manual-notes"
                  className="text-13 font-semibold text-ink"
                >
                  {agenda.manual.campos.notas}
                </label>
                <textarea
                  id="manual-notes"
                  value={notes}
                  onChange={(e) => {
                    setNotes(e.target.value);
                  }}
                  maxLength={500}
                  rows={3}
                  className="w-full resize-none rounded-control border-2 border-transparent bg-surface px-4 py-3 text-15 font-medium text-ink transition-colors duration-150 ease-out focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink focus-visible:transition-none"
                />
                <span className="text-13 text-muted">
                  {agenda.manual.notasAyuda}
                </span>
              </div>

              <ConsentCheckbox checked={consent} onChange={setConsent}>
                {clientes.consentimientoManual.texto}{" "}
                <span className="text-muted">
                  {clientes.consentimientoManual.ayuda({
                    negocio: businessName,
                  })}
                </span>
              </ConsentCheckbox>

              {generalError ? (
                <p role="alert" className="text-13 text-ink">
                  {generalError}
                </p>
              ) : null}

              <div className="mt-1 flex justify-end gap-3">
                <Button
                  type="button"
                  variant="secondary"
                  size="lg"
                  onClick={() => {
                    onOpenChange(false);
                  }}
                >
                  {comun.cerrar}
                </Button>
                <Button
                  type="submit"
                  variant="primary"
                  size="lg"
                  disabled={submitting}
                >
                  {agenda.manual.ctaGuardar}
                </Button>
              </div>
            </form>
          </Dialog.Content>
        </Dialog.Overlay>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
