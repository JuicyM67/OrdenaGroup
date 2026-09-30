"use client";
// "Mover reserva" (WP-21b): dos pasos — elegir día/hora (agenda.mover.*) y confirmar
// (agenda.confirmarAviso.mover.*, ya en es-CL.ts). Mismo motivo que manual-booking-dialog.tsx
// para día/hora libres: el motor (moveBooking, ctx.actor owner) no exige rutnät (SCHEDULING.md,
// política 5). No cambia de profesional (fuera del alcance de WP-21b, ver informe).
import * as Dialog from "@radix-ui/react-dialog";
import { X } from "lucide-react";
import { useId, useState, type FormEvent } from "react";

import { Button } from "@/components/ui/button";
import { DateField } from "@/components/ui/date-field";
import { IconButton } from "@/components/ui/icon-button";
import { TextField } from "@/components/ui/text-field";
import { useSheetDrag } from "@/components/ui/use-sheet-drag";
import { agenda, comun, errores } from "@/i18n";
import type { LocalDate, LocalTime } from "@/lib/format/dates";

import { agendaServerError } from "./errors";

export type MoveDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  bookingId: string;
  defaultDate: LocalDate;
  defaultTime: LocalTime;
  onSubmit: (input: {
    bookingId: string;
    date: LocalDate;
    time: LocalTime;
  }) => Promise<{ ok: true } | { ok: false; error: string }>;
};

type Step = "elegir" | "confirmar";

export function MoveDialog({
  open,
  onOpenChange,
  bookingId,
  defaultDate,
  defaultTime,
  onSubmit,
}: MoveDialogProps) {
  const descriptionId = useId();
  // WP-47 (tillägg D): dra-för-att-stänga på mobil (bottenark). Destrukturerad direkt, se
  // manual-booking-dialog.tsx för motiveringen (`react-hooks/refs`).
  const { panelRef, handleProps: dragHandleProps } = useSheetDrag(() =>
    onOpenChange(false),
  );
  const [step, setStep] = useState<Step>("elegir");
  const [date, setDate] = useState<string>(defaultDate);
  const [time, setTime] = useState<string>(defaultTime);
  const [fieldError, setFieldError] = useState<string | null>(null);
  const [generalError, setGeneralError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  function reset() {
    setStep("elegir");
    setDate(defaultDate);
    setTime(defaultTime);
    setFieldError(null);
    setGeneralError(null);
  }

  function handleChooseSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!date || !time) {
      setFieldError(errores.agenda.invalid_input);
      return;
    }
    setFieldError(null);
    setStep("confirmar");
  }

  async function handleConfirm() {
    if (submitting) return;
    setSubmitting(true);
    setGeneralError(null);
    const result = await onSubmit({
      bookingId,
      date: date as LocalDate,
      time: time as LocalTime,
    });
    setSubmitting(false);
    if (result.ok) {
      reset();
      onOpenChange(false);
      return;
    }
    setGeneralError(agendaServerError(result.error));
    setStep("elegir");
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
            från sm och uppåt (samma mönster som manual-booking-dialog.tsx). WP-47:
            `bg-canvas` (kontrast mot vita fält), glider ner vid stängning och kan dras ner
            (`useSheetDrag`) — se manual-booking-dialog.tsx för motiveringen. */}
        <Dialog.Overlay className="fixed inset-0 z-20 flex items-end justify-center bg-ink/45 sm:items-center sm:p-4">
          <Dialog.Content
            ref={panelRef}
            aria-describedby={descriptionId}
            className="flex max-h-full w-full max-w-sm translate-y-0 flex-col gap-4 overflow-y-auto rounded-t-panel bg-canvas p-6 shadow-popover transition-transform duration-200 ease-out sm:rounded-panel sheet-closed:translate-y-full"
          >
            <div
              aria-hidden="true"
              className="-mt-2 mb-1 h-1.5 w-10 shrink-0 touch-none self-center rounded-full bg-line-strong sm:hidden"
              {...dragHandleProps}
            />
            {step === "elegir" ? (
              <>
                <div className="flex items-start justify-between">
                  <Dialog.Title className="text-17 font-bold">
                    {agenda.mover.titulo}
                  </Dialog.Title>
                  <Dialog.Close asChild>
                    <IconButton label={comun.cerrar} tone="ghost" size={30}>
                      <X
                        aria-hidden="true"
                        className="size-4"
                        strokeWidth={2.2}
                      />
                    </IconButton>
                  </Dialog.Close>
                </div>
                <Dialog.Description
                  id={descriptionId}
                  className="text-13 text-muted"
                >
                  {agenda.mover.elegirNuevaHora}
                </Dialog.Description>

                <form
                  noValidate
                  onSubmit={handleChooseSubmit}
                  className="flex flex-col gap-4"
                >
                  <div className="grid grid-cols-2 gap-3">
                    <DateField
                      label={agenda.manual.campos.dia}
                      value={date}
                      onChange={setDate}
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
                      required
                    />
                  </div>

                  {fieldError ? (
                    <p role="alert" className="text-13 text-ink">
                      {fieldError}
                    </p>
                  ) : null}
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
                    <Button type="submit" variant="primary" size="lg">
                      {comun.confirmar}
                    </Button>
                  </div>
                </form>
              </>
            ) : (
              <>
                <div className="flex items-start justify-between">
                  <Dialog.Title className="text-17 font-bold">
                    {agenda.confirmarAviso.mover.titulo}
                  </Dialog.Title>
                  <Dialog.Close asChild>
                    <IconButton label={comun.cerrar} tone="ghost" size={30}>
                      <X
                        aria-hidden="true"
                        className="size-4"
                        strokeWidth={2.2}
                      />
                    </IconButton>
                  </Dialog.Close>
                </div>
                <Dialog.Description
                  id={descriptionId}
                  className="text-14 text-ink"
                >
                  {agenda.confirmarAviso.mover.cuerpo}
                </Dialog.Description>

                <div className="mt-1 flex justify-end gap-3">
                  <Button
                    type="button"
                    variant="secondary"
                    size="lg"
                    onClick={() => {
                      setStep("elegir");
                    }}
                  >
                    {agenda.confirmarAviso.mover.ctaNo}
                  </Button>
                  <Button
                    type="button"
                    variant="primary"
                    size="lg"
                    disabled={submitting}
                    onClick={() => {
                      void handleConfirm();
                    }}
                  >
                    {agenda.confirmarAviso.mover.ctaSi}
                  </Button>
                </div>
              </>
            )}
          </Dialog.Content>
        </Dialog.Overlay>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
