"use client";

// "Nueva hora flash" (WP-30, F13). Sin referencia *.dc.html (fuera del alcance visual) —
// mismo formspråk que manual-booking-dialog.tsx/move-dialog.tsx (Dialog de Radix,
// bottenark en mobil vía useSheetDrag). El motor (`createFlashSlot`,
// src/server/flash/slots.ts) es la única fuente de verdad sobre si la hora está libre —
// este diálogo solo valida el borde (campos vacíos/formato).
import * as Dialog from "@radix-ui/react-dialog";
import { X } from "lucide-react";
import { useId, useState, type FormEvent } from "react";

import { Button } from "@/components/ui/button";
import { DateField } from "@/components/ui/date-field";
import { IconButton } from "@/components/ui/icon-button";
import { Pill } from "@/components/ui/pill";
import { Select } from "@/components/ui/select";
import { TextField } from "@/components/ui/text-field";
import { useSheetDrag } from "@/components/ui/use-sheet-drag";
import { comun, flash, planes } from "@/i18n";
import type { LocalDate, LocalTime } from "@/lib/format/dates";

import type {
  CreateFlashResult,
  CreateFlashSlotInput,
  FlashCatalogService,
  FlashStaff,
} from "./types";

export type FlashSlotDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  staff: readonly FlashStaff[];
  services: readonly FlashCatalogService[];
  defaultDate: LocalDate;
  /** WP-30 (Agenda): förifyllning från ett klick på ett tomt fält i rutnätet. */
  defaultTime?: LocalTime;
  defaultStaffId?: string;
  onSubmit: (input: CreateFlashSlotInput) => Promise<CreateFlashResult>;
};

const DURATIONS = [15, 30, 45, 60, 90, 120] as const;
type Mode = "duracion" | "servicios";

function flashErrorText(
  code: Exclude<CreateFlashResult, { ok: true }>["code"],
): string {
  if (code === "plan_locked") return planes.errores.plan_locked;
  return flash.nueva.errores[code] ?? flash.nueva.errores.unknown;
}

export function FlashSlotDialog({
  open,
  onOpenChange,
  staff,
  services,
  defaultDate,
  defaultTime,
  defaultStaffId,
  onSubmit,
}: FlashSlotDialogProps) {
  const descriptionId = useId();
  const { panelRef, handleProps: dragHandleProps } = useSheetDrag(() =>
    onOpenChange(false),
  );
  const [staffId, setStaffId] = useState(defaultStaffId ?? staff[0]?.id ?? "");
  const [date, setDate] = useState<string>(defaultDate);
  const [time, setTime] = useState<string>(defaultTime ?? "");
  const [mode, setMode] = useState<Mode>("duracion");
  const [durationMin, setDurationMin] = useState<number>(30);
  const [serviceIds, setServiceIds] = useState<ReadonlySet<string>>(new Set());
  const [discountPct, setDiscountPct] = useState("20");
  const [fieldError, setFieldError] = useState<string | null>(null);
  const [generalError, setGeneralError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const eligibleServices = services.filter((s) => s.staffIds.includes(staffId));

  function reset() {
    setStaffId(defaultStaffId ?? staff[0]?.id ?? "");
    setDate(defaultDate);
    setTime(defaultTime ?? "");
    setMode("duracion");
    setDurationMin(30);
    setServiceIds(new Set());
    setDiscountPct("20");
    setFieldError(null);
    setGeneralError(null);
  }

  function toggleService(id: string) {
    setServiceIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (submitting) return;
    setFieldError(null);
    setGeneralError(null);

    if (!staffId) {
      setFieldError(flash.nueva.errores.profesionalRequerido);
      return;
    }
    if (!date || !time) {
      setFieldError(comun.algoSalioMal);
      return;
    }
    if (mode === "servicios" && serviceIds.size === 0) {
      setFieldError(flash.nueva.errores.servicioRequerido);
      return;
    }
    const pct = Number(discountPct);
    if (!Number.isInteger(pct) || pct < 1 || pct > 90) {
      setFieldError(flash.nueva.errores.descuentoInvalido);
      return;
    }

    setSubmitting(true);
    const input: CreateFlashSlotInput = {
      staffId,
      date: date as LocalDate,
      time: time as LocalTime,
      discountPct: pct,
      ...(mode === "duracion"
        ? { lengthMinutes: durationMin }
        : { serviceIds: [...serviceIds] }),
    };
    const result = await onSubmit(input);
    setSubmitting(false);
    if (result.ok) {
      reset();
      onOpenChange(false);
      return;
    }
    setGeneralError(flashErrorText(result.code));
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
                {flash.nueva.titulo}
              </Dialog.Title>
              <Dialog.Close asChild>
                <IconButton label={comun.cerrar} tone="ghost" size={30}>
                  <X aria-hidden="true" className="size-4" strokeWidth={2.2} />
                </IconButton>
              </Dialog.Close>
            </div>
            <Dialog.Description id={descriptionId} className="sr-only">
              {flash.nueva.titulo}
            </Dialog.Description>

            <form
              noValidate
              aria-busy={submitting}
              onSubmit={(e) => void handleSubmit(e)}
              className="flex flex-col gap-4"
            >
              <Select
                label={flash.nueva.campos.profesional}
                value={staffId}
                onChange={(e) => {
                  setStaffId(e.target.value);
                  setServiceIds(new Set());
                }}
                required
              >
                {staff.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name}
                  </option>
                ))}
              </Select>

              <div className="grid grid-cols-2 gap-3">
                <DateField
                  label={flash.nueva.campos.dia}
                  value={date}
                  onChange={setDate}
                  required
                />
                <TextField
                  label={flash.nueva.campos.hora}
                  type="time"
                  step={60}
                  value={time}
                  onChange={(e) => setTime(e.target.value)}
                  required
                />
              </div>

              <div className="flex flex-col gap-2">
                <span className="text-13 font-semibold text-ink">
                  {flash.nueva.campos.modo}
                </span>
                <div className="flex gap-2">
                  <Pill
                    selected={mode === "duracion"}
                    onClick={() => setMode("duracion")}
                  >
                    {flash.nueva.campos.modoDuracion}
                  </Pill>
                  <Pill
                    selected={mode === "servicios"}
                    onClick={() => setMode("servicios")}
                  >
                    {flash.nueva.campos.modoServicios}
                  </Pill>
                </div>
              </div>

              {mode === "duracion" ? (
                <Select
                  label={flash.nueva.campos.duracionLabel}
                  value={String(durationMin)}
                  onChange={(e) => setDurationMin(Number(e.target.value))}
                >
                  {DURATIONS.map((n) => (
                    <option key={n} value={n}>
                      {n} min
                    </option>
                  ))}
                </Select>
              ) : (
                <div className="flex flex-col gap-2">
                  <span className="text-13 font-semibold text-ink">
                    {flash.nueva.campos.serviciosLabel}
                  </span>
                  <div className="flex flex-wrap gap-2">
                    {eligibleServices.map((s) => (
                      <Pill
                        key={s.id}
                        selected={serviceIds.has(s.id)}
                        onClick={() => toggleService(s.id)}
                      >
                        {s.name}
                      </Pill>
                    ))}
                  </div>
                </div>
              )}

              <TextField
                label={flash.nueva.campos.descuentoLabel}
                type="number"
                inputMode="numeric"
                min={1}
                max={90}
                value={discountPct}
                onChange={(e) => setDiscountPct(e.target.value)}
                required
              />

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
                  onClick={() => onOpenChange(false)}
                >
                  {comun.cerrar}
                </Button>
                <Button
                  type="submit"
                  variant="primary"
                  size="lg"
                  disabled={submitting}
                >
                  {flash.nueva.ctaGuardar}
                </Button>
              </div>
            </form>
          </Dialog.Content>
        </Dialog.Overlay>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
