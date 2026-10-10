"use client";

// WP-64 (D-044): fliken Betalningar (bara SE). Koppla Stripe (Express,
// Stripe-värd onboarding), se status, öppna Stripe-översikten och välja
// Av / Valfri / Obligatorisk betalning vid bokning. Inga beslut här: allt
// avgörs av servern (`src/server/payments/stripe/`).
import { useRouter } from "next/navigation";
import { useState } from "react";

import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Chip } from "@/components/ui/chip";
import { Pill } from "@/components/ui/pill";
import { ajustes, planes } from "@/i18n";

export type PaymentsStatus =
  "none" | "onboarding" | "active" | "action_required";
export type PaymentsMode = "off" | "optional" | "required";

type RedirectResult = { ok: true; url: string } | { ok: false; code: string };
type SaveResult = { ok: true } | { ok: false; code: string };

const MODES: readonly PaymentsMode[] = ["off", "optional", "required"];

const STATUS_TONE = {
  none: "neutral",
  onboarding: "pending",
  active: "success",
  action_required: "alert",
} as const satisfies Record<
  PaymentsStatus,
  "neutral" | "pending" | "success" | "alert"
>;

function errorText(code: string): string {
  const e = ajustes.pagos.errores;
  switch (code) {
    case "unavailable":
      return e.unavailable;
    case "failed":
      return e.failed;
    case "needs_account":
      return e.needs_account;
    case "forbidden":
      return e.forbidden;
    case "plan_locked":
      return planes.errores.plan_locked;
    default:
      return e.unknown;
  }
}

function pctText(bps: number): string {
  return `${String(bps / 100).replace(".", ",")} %`;
}

export function PaymentsSection({
  status,
  canCharge,
  mode: initialMode,
  feeBps,
  onStart,
  onOpenDashboard,
  onSaveMode,
}: {
  status: PaymentsStatus;
  canCharge: boolean;
  mode: PaymentsMode;
  feeBps: number;
  onStart: () => Promise<RedirectResult>;
  onOpenDashboard: () => Promise<RedirectResult>;
  onSaveMode: (mode: PaymentsMode) => Promise<SaveResult>;
}) {
  const router = useRouter();
  const [mode, setMode] = useState<PaymentsMode>(initialMode);
  const [busy, setBusy] = useState<"start" | "dashboard" | "save" | null>(null);
  const [error, setError] = useState<string | undefined>();
  const [saved, setSaved] = useState(false);

  async function go(
    kind: "start" | "dashboard",
    fn: () => Promise<RedirectResult>,
  ) {
    setBusy(kind);
    setError(undefined);
    try {
      const r = await fn();
      if (r.ok) {
        window.location.assign(r.url);
        return;
      }
      setError(errorText(r.code));
    } catch {
      setError(errorText("unknown"));
    }
    setBusy(null);
  }

  async function save(e: React.FormEvent) {
    e.preventDefault();
    setBusy("save");
    setError(undefined);
    setSaved(false);
    try {
      const r = await onSaveMode(mode);
      if (r.ok) {
        setSaved(true);
        router.refresh();
      } else setError(errorText(r.code));
    } catch {
      setError(errorText("unknown"));
    }
    setBusy(null);
  }

  const startLabel =
    status === "none"
      ? ajustes.pagos.conectar
      : status === "action_required"
        ? ajustes.pagos.completar
        : ajustes.pagos.continuar;

  return (
    <div className="flex flex-col gap-6">
      <Card radius="tile" padding="lg" className="flex flex-col gap-4">
        <h2 className="text-18 font-bold text-ink">{ajustes.pagos.titulo}</h2>
        <p className="text-13 text-muted">{ajustes.pagos.intro}</p>

        <div className="flex flex-col gap-2">
          <span className="text-13 font-semibold text-muted">
            {ajustes.pagos.estadoLabel}
          </span>
          <Chip tone={STATUS_TONE[status]} size="sm">
            {ajustes.pagos.estado[status]}
          </Chip>
          <p className="text-13 text-muted">
            {ajustes.pagos.estadoAyuda[status]}
          </p>
        </div>

        <div className="flex flex-wrap gap-3">
          {status !== "active" ? (
            <Button
              type="button"
              size="lg"
              disabled={busy !== null}
              onClick={() => void go("start", onStart)}
            >
              {startLabel}
            </Button>
          ) : null}
          {status !== "none" ? (
            <Button
              type="button"
              size="lg"
              variant="secondary"
              disabled={busy !== null}
              onClick={() => void go("dashboard", onOpenDashboard)}
            >
              {ajustes.pagos.abrirPanel}
            </Button>
          ) : null}
        </div>
      </Card>

      <form onSubmit={(e) => void save(e)} className="flex flex-col gap-6">
        <Card radius="tile" padding="lg" className="flex flex-col gap-4">
          <h2 className="text-18 font-bold text-ink">
            {ajustes.pagos.modoTitulo}
          </h2>
          <div className="flex flex-col gap-2">
            <div className="flex flex-wrap gap-2">
              {MODES.map((m) => (
                <Pill
                  key={m}
                  selected={mode === m}
                  disabled={m !== "off" && !canCharge}
                  onClick={() => {
                    setMode(m);
                    setSaved(false);
                  }}
                >
                  {ajustes.pagos.modo[m]}
                </Pill>
              ))}
            </div>
            <span className="text-13 text-muted">
              {ajustes.pagos.modoAyuda[mode]}
            </span>
            {!canCharge ? (
              <span className="text-13 text-muted">
                {ajustes.pagos.modoRequiereCuenta}
              </span>
            ) : null}
          </div>
          <p className="text-13 text-muted">
            {feeBps > 0
              ? ajustes.pagos.comision({ monto: pctText(feeBps) })
              : ajustes.pagos.sinComision}
          </p>
          <p className="text-13 text-muted">{ajustes.pagos.reembolsos}</p>
        </Card>

        {error ? (
          <p role="alert" className="text-13 font-semibold text-ink">
            {error}
          </p>
        ) : null}

        <div className="flex items-center gap-3">
          <Button type="submit" size="xl" disabled={busy !== null}>
            {ajustes.pagos.guardar}
          </Button>
          {saved ? (
            <span role="status" className="text-13 text-muted">
              {ajustes.pagos.guardado}
            </span>
          ) : null}
        </div>
      </form>
    </div>
  );
}
