"use client";

import { useRouter } from "next/navigation";

// Sección "Reglas de reserva" (WP-55: separada de `business-section.tsx`, propia pestaña
// de Ajustes). Mismo `action` (`updateBusinessSettings`, escribe la fila entera de
// `businesses`) — los campos de "Tu negocio" viajan sin cambios desde `business`.
import { useState } from "react";

import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Pill } from "@/components/ui/pill";
import { Switch } from "@/components/ui/switch";
import { TextField } from "@/components/ui/text-field";
import { ajustes, estados } from "@/i18n";

import { ajustesErrorText } from "./error-text";
import type { AjustesActions, AjustesBusiness } from "./types";

const WAITLIST_MODES = ["sequential", "broadcast"] as const;

const SLOT_INTERVALS = [5, 10, 15, 20, 30, 60] as const;
// WP-56: `businesses_cancel_approval_check`.
const CANCEL_APPROVALS = ["none", "late", "all"] as const;

type FormState = {
  minNoticeMinutes: string;
  maxDaysAhead: string;
  cancelWindowHours: string;
  slotIntervalMinutes: string;
  autoConfirmBookings: boolean;
  cancelApproval: AjustesBusiness["cancelApproval"];
};

function toFormState(b: AjustesBusiness): FormState {
  return {
    minNoticeMinutes: String(b.minNoticeMinutes),
    maxDaysAhead: String(b.maxDaysAhead),
    cancelWindowHours: String(b.cancelWindowHours),
    slotIntervalMinutes: String(b.slotIntervalMinutes),
    autoConfirmBookings: b.autoConfirmBookings,
    cancelApproval: b.cancelApproval,
  };
}

export function BookingRulesSection({
  business,
  onSaved,
  action,
  waitlistAction,
}: {
  business: AjustesBusiness;
  /** Utan onSaved laddas sidan om (flikarna i WP-55 är egna rutter). */
  onSaved?: (business: AjustesBusiness) => void;
  action: AjustesActions["updateBusinessSettings"];
  /** WP-23: lista de espera (modo + hålltid). `undefined` döljer kortet
   * (design lab/äldre sidor utan den actionen). */
  waitlistAction?: AjustesActions["updateWaitlistSettings"];
}) {
  const router = useRouter();
  const [form, setForm] = useState<FormState>(() => toFormState(business));
  const [status, setStatus] = useState<"idle" | "saving" | "saved" | "error">(
    "idle",
  );
  const [submitError, setSubmitError] = useState<string | undefined>();

  function set<K extends keyof FormState>(key: K, value: FormState[K]) {
    setForm((f) => ({ ...f, [key]: value }));
    setStatus("idle");
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setStatus("saving");
    setSubmitError(undefined);
    try {
      const result = await action({
        // "Tu negocio" vive en su propia pestaña (business-section.tsx) pero
        // `updateBusinessSettings` escribe la fila entera: viajan sin cambios.
        name: business.name,
        slug: business.slug,
        comuna: business.comuna,
        phone: business.phone,
        address: business.address,
        minNoticeMinutes: Number(form.minNoticeMinutes),
        maxDaysAhead: Number(form.maxDaysAhead),
        cancelWindowHours: Number(form.cancelWindowHours),
        slotIntervalMinutes: Number(form.slotIntervalMinutes),
        autoConfirmBookings: form.autoConfirmBookings,
        cancelApproval: form.cancelApproval,
      });
      if (result.ok) {
        setStatus("saved");
        (onSaved ?? (() => router.refresh()))({
          ...business,
          minNoticeMinutes: Number(form.minNoticeMinutes),
          maxDaysAhead: Number(form.maxDaysAhead),
          cancelWindowHours: Number(form.cancelWindowHours),
          slotIntervalMinutes: Number(form.slotIntervalMinutes),
          autoConfirmBookings: form.autoConfirmBookings,
          cancelApproval: form.cancelApproval,
        });
      } else {
        setStatus("error");
        setSubmitError(ajustesErrorText(result.code));
      }
    } catch {
      setStatus("error");
      setSubmitError(ajustesErrorText("unknown"));
    }
  }

  const maxDaysAheadN = Number(form.maxDaysAhead) || 0;

  // WP-23: lista de espera (modo + hålltid) — eget kort, eget formulär och
  // egen spar-knapp (`updateWaitlistSettings` skriver bara de två
  // kolumnerna, inte hela `businesses`-raden som `action` ovan).
  const [waitlistMode, setWaitlistMode] = useState(business.waitlistMode);
  const [holdMinutes, setHoldMinutes] = useState(
    String(business.waitlistHoldMinutes),
  );
  const [waitlistStatus, setWaitlistStatus] = useState<
    "idle" | "saving" | "saved" | "error"
  >("idle");
  const [waitlistError, setWaitlistError] = useState<string | undefined>();

  async function handleWaitlistSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!waitlistAction) return;
    setWaitlistStatus("saving");
    setWaitlistError(undefined);
    try {
      const result = await waitlistAction({
        mode: waitlistMode,
        holdMinutes: Number(holdMinutes),
      });
      if (result.ok) {
        setWaitlistStatus("saved");
      } else {
        setWaitlistStatus("error");
        setWaitlistError(ajustesErrorText(result.code));
      }
    } catch {
      setWaitlistStatus("error");
      setWaitlistError(ajustesErrorText("unknown"));
    }
  }

  return (
    <div className="flex flex-col gap-6">
      <form
        onSubmit={(e) => void handleSubmit(e)}
        className="flex flex-col gap-6"
      >
        <Card radius="tile" padding="lg" className="flex flex-col gap-4">
          <h2 className="text-18 font-bold text-ink">
            {ajustes.secciones.reglas}
          </h2>

          <TextField
            label={ajustes.reglas.minNoticeLabel}
            type="number"
            inputMode="numeric"
            min={0}
            max={10080}
            value={form.minNoticeMinutes}
            onChange={(e) => set("minNoticeMinutes", e.target.value)}
            required
          />

          <TextField
            label={ajustes.reglas.maxDaysAheadLabel({ n: maxDaysAheadN })}
            type="number"
            inputMode="numeric"
            min={1}
            max={365}
            value={form.maxDaysAhead}
            onChange={(e) => set("maxDaysAhead", e.target.value)}
            required
          />

          <TextField
            label={ajustes.reglas.cancelWindowLabel}
            hint={ajustes.reglas.cancelWindowAyuda}
            type="number"
            inputMode="numeric"
            min={0}
            max={168}
            value={form.cancelWindowHours}
            onChange={(e) => set("cancelWindowHours", e.target.value)}
            required
          />

          <div className="flex flex-col gap-1.5">
            <label
              htmlFor="cancel-approval"
              className="text-13 font-semibold text-ink"
            >
              {ajustes.reglas.cancelApprovalLabel}
            </label>
            <select
              id="cancel-approval"
              value={form.cancelApproval}
              onChange={(e) =>
                set(
                  "cancelApproval",
                  e.target.value as AjustesBusiness["cancelApproval"],
                )
              }
              className="h-13 w-full rounded-control border-2 border-transparent bg-field px-4 text-15 font-medium text-ink focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink focus-visible:transition-none"
            >
              {CANCEL_APPROVALS.map((value) => (
                <option key={value} value={value}>
                  {ajustes.reglas.cancelApprovalOpciones[value]}
                </option>
              ))}
            </select>
            <span className="text-13 text-muted">
              {ajustes.reglas.cancelApprovalAyuda}
            </span>
          </div>

          <div className="flex flex-col gap-1.5">
            <label
              htmlFor="slot-interval"
              className="text-13 font-semibold text-ink"
            >
              {ajustes.reglas.slotIntervalLabel}
            </label>
            <select
              id="slot-interval"
              value={form.slotIntervalMinutes}
              onChange={(e) => set("slotIntervalMinutes", e.target.value)}
              className="h-13 w-full rounded-control border-2 border-transparent bg-field px-4 text-15 font-medium text-ink focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink"
            >
              {SLOT_INTERVALS.map((n) => (
                <option key={n} value={n}>
                  {n} min
                </option>
              ))}
            </select>
          </div>

          <div className="flex items-center gap-3 border-t border-line-strong pt-4">
            <div className="min-w-0 flex-1">
              <p className="text-14 font-semibold text-ink">
                {ajustes.reglas.confirmarAutomatico}
              </p>
              <p className="mt-0.5 text-12 text-muted">
                {ajustes.reglas.confirmarAutomaticoAyuda}
              </p>
            </div>
            <Switch
              checked={form.autoConfirmBookings}
              onChange={(checked) => set("autoConfirmBookings", checked)}
              label={ajustes.reglas.confirmarAutomatico}
            />
          </div>
        </Card>

        {submitError ? (
          <p role="alert" className="text-13 font-semibold text-ink">
            {submitError}
          </p>
        ) : null}

        <div className="flex items-center gap-3">
          <Button type="submit" size="xl" disabled={status === "saving"}>
            {status === "saving" ? ajustes.guardando : ajustes.guardarCambios}
          </Button>
          {status === "saved" ? (
            <span role="status" className="text-13 text-muted">
              {ajustes.cambiosGuardados}
            </span>
          ) : null}
        </div>
      </form>

      {waitlistAction ? (
        <form
          onSubmit={(e) => void handleWaitlistSubmit(e)}
          className="flex flex-col gap-6"
        >
          <Card radius="tile" padding="lg" className="flex flex-col gap-4">
            <h2 className="text-18 font-bold text-ink">
              {estados.listaDeEspera}
            </h2>

            <div className="flex flex-col gap-2">
              <div className="flex flex-wrap gap-2">
                {WAITLIST_MODES.map((mode) => (
                  <Pill
                    key={mode}
                    selected={waitlistMode === mode}
                    onClick={() => setWaitlistMode(mode)}
                  >
                    {ajustes.waitlistMode[mode]}
                  </Pill>
                ))}
              </div>
              <span className="text-13 text-muted">
                {ajustes.waitlistModeAyuda[waitlistMode]}
              </span>
            </div>

            <TextField
              label={ajustes.waitlistHoldMinutesLabel}
              hint={ajustes.waitlistHoldMinutesAyuda}
              type="number"
              inputMode="numeric"
              min={5}
              max={240}
              value={holdMinutes}
              onChange={(e) => {
                setHoldMinutes(e.target.value);
                setWaitlistStatus("idle");
              }}
              required
            />
          </Card>

          {waitlistError ? (
            <p role="alert" className="text-13 font-semibold text-ink">
              {waitlistError}
            </p>
          ) : null}

          <div className="flex items-center gap-3">
            <Button
              type="submit"
              size="xl"
              disabled={waitlistStatus === "saving"}
            >
              {waitlistStatus === "saving"
                ? ajustes.guardando
                : ajustes.guardarCambios}
            </Button>
            {waitlistStatus === "saved" ? (
              <span role="status" className="text-13 text-muted">
                {ajustes.cambiosGuardados}
              </span>
            ) : null}
          </div>
        </form>
      ) : null}
    </div>
  );
}
