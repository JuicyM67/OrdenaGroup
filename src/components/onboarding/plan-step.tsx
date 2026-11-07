"use client";

// Planval i onboarding (WP-83, D-068; portad från BookingBuddy WP-92). Visas efter
// "Tu página" — företaget finns då. Chile har ingen betalning i appen (D-061/D-062):
// Gratis = fortsätt direkt; en betald plan sparas som önskemål
// (`businesses.plan_requested`) och teamet kontaktar ägaren och aktiverar planen med
// 30 dagars prov i /admin. Företaget fortsätter på Gratis tills dess.
import { Check } from "lucide-react";
import { useState } from "react";

import { cn } from "@/components/ui/cn";
import { formatPrecioPlan, type PlanId } from "@/config/pricing";
import { onboarding } from "@/i18n";
import { copy } from "@/i18n/marketing";

import { StepHeader, StepNav } from "./step-frame";

type PaidPlan = Exclude<PlanId, "gratis">;

/** Spegel av `RequestPlanResult` (src/server/plans/request.ts) — en "use client"-fil
 * importerar aldrig från `@/server/*`. */
export type RequestPlanResult = { ok: true } | { ok: false; code: string };

export function PlanStep({
  onRequest,
  onContinue,
}: {
  onRequest: (plan: PaidPlan) => Promise<RequestPlanResult>;
  onContinue: () => void;
}) {
  const t = onboarding.planPaso;
  const [busy, setBusy] = useState<PaidPlan | null>(null);
  const [requested, setRequested] = useState<PaidPlan | null>(null);
  const [error, setError] = useState<string | undefined>();

  async function request(plan: PaidPlan) {
    setBusy(plan);
    setError(undefined);
    try {
      const r = await onRequest(plan);
      if (r.ok) setRequested(plan);
      else setError(t.error);
    } catch {
      setError(t.error);
    }
    setBusy(null);
  }

  if (requested) {
    const nombre =
      copy.PLANES.find((p) => p.id === requested)?.nombre ?? requested;
    return (
      <div className="flex flex-col gap-5">
        <span
          aria-hidden="true"
          className="flex size-14 items-center justify-center rounded-full bg-lime text-ink"
        >
          <Check className="size-6" strokeWidth={2.5} />
        </span>
        <div role="status">
          <StepHeader
            title={t.solicitadoTitulo({ nombre })}
            text={t.solicitadoTexto}
          />
        </div>
        <StepNav onContinue={onContinue} continueLabel={t.continuar} />
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-5">
      <StepHeader title={t.titulo} text={t.texto} />
      <ul className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        {copy.PLANES.map((plan) => {
          const id = plan.id as PlanId;
          const free = id === "gratis";
          const popular = id === "equipo";
          return (
            <li
              key={id}
              className={cn(
                "flex flex-col gap-3 rounded-card p-5",
                popular ? "bg-dark text-on-dark" : "bg-canvas text-ink",
              )}
            >
              <div className="flex items-start justify-between gap-2">
                <span className="text-18 font-bold">{plan.nombre}</span>
                {popular ? (
                  <span className="rounded-full bg-lime px-2.5 py-0.5 text-12 font-bold text-ink">
                    {t.popular}
                  </span>
                ) : null}
              </div>
              <p className="flex items-baseline gap-1">
                <span className="font-display text-30 font-semibold tracking-title">
                  {free ? t.gratisPrecio : formatPrecioPlan(id)}
                </span>
                {free ? null : (
                  <span
                    className={cn(
                      "text-13",
                      popular ? "text-on-dark-muted" : "text-muted",
                    )}
                  >
                    {t.porMes}
                  </span>
                )}
              </p>
              <ul className="flex flex-col gap-1.5">
                {plan.puntos.slice(0, 4).map((p) => (
                  <li key={p} className="flex items-start gap-2 text-13">
                    <Check
                      aria-hidden="true"
                      className={cn(
                        "mt-0.5 size-3.5 shrink-0",
                        popular ? "text-lime" : "text-ink",
                      )}
                      strokeWidth={3}
                    />
                    {p}
                  </li>
                ))}
              </ul>
              {free ? (
                <button
                  type="button"
                  onClick={onContinue}
                  disabled={busy !== null}
                  className="mt-auto h-11 rounded-full bg-surface text-14 font-bold text-ink hover:bg-field focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink disabled:opacity-50"
                >
                  {t.elegirGratis}
                </button>
              ) : (
                <button
                  type="button"
                  onClick={() => void request(id as PaidPlan)}
                  disabled={busy !== null}
                  className={cn(
                    "mt-auto h-11 rounded-full text-14 font-bold transition-opacity duration-150 ease-out hover:opacity-90 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink disabled:opacity-50",
                    popular ? "bg-lime text-ink" : "bg-ink text-on-dark",
                  )}
                >
                  {busy === id ? t.pidiendo : t.pedir}
                </button>
              )}
            </li>
          );
        })}
      </ul>
      {error ? (
        <p role="alert" className="text-13 font-semibold text-ink">
          {error}
        </p>
      ) : null}
      <StepNav
        onContinue={onContinue}
        continueLabel={t.elegirGratis}
        disabled={busy !== null}
      />
    </div>
  );
}
