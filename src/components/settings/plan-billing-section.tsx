"use client";

// WP-78 (D-059): abonnemangets del av Inställningar → Plan (bara SE, bara
// ägaren, `billingAvailable()`). Statuskortet (plan, status, nästa faktura,
// kort, "Hantera betalning" → Stripe Customer Portal, "Säg upp"/"Återuppta")
// och plankorten ("Välj" → bekräftelse → Checkout för ett Gratis-företag,
// bytdialog med förhandsvisning för betalande, "Säg upp" på Gratis-kortet).
// Ingen designreferens fanns: byggd med samma kort/chip/dialog-språk som
// SMS-kortet (D-053) och Plan-fliken (D-048); se PR:en.
// Allt räknas på servern; komponenten får färdiga texter och skickar bara
// planens id till servern (pris och belopp bestäms där).
import * as Dialog from "@radix-ui/react-dialog";
import { Check, CreditCard, TriangleAlert, X } from "lucide-react";
import { useRouter } from "next/navigation";
import { useId, useState, type ReactNode } from "react";

import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Chip } from "@/components/ui/chip";
import { cn } from "@/components/ui/cn";
import { IconButton } from "@/components/ui/icon-button";
import { strokeCard } from "@/components/ui/icons";
import { comun, suscripcion } from "@/i18n";
import { formatSek } from "@/lib/format/money";
import type {
  BillingActionResult,
  PaidPlan,
  PlanChangePreview,
} from "@/lib/validation/billing";

const t = suscripcion;

export type PlanCardItem = {
  id: "free" | PaidPlan;
  name: string;
  /** "299 kr" (exkl. moms) eller "0 kr". */
  price: string;
  current: boolean;
  /** Vad "Välj" gör. `none` = ingen knapp ("Nuvarande" eller låst). */
  action: "start" | "change" | "cancel" | "none";
};

export type BillingStatusView = {
  planName: string;
  chip: { label: string; tone: "success" | "pending" | "alert" | "neutral" };
  /** Färdiga rader under planens namn (nästa faktura, provperiod …). */
  lines: string[];
  /** Varningsruta (betalning misslyckades, prov utan kort, pilot). */
  warning: string | null;
  card: string | null;
  /** "Hantera betalning" (eller "Lägg till kort" under prov utan kort). */
  portalLabel: string | null;
  canCancel: boolean;
  canResume: boolean;
  /** Uppsägningsdialogens datum. */
  cancelDate: string;
};

export type PlanBillingData = {
  status: BillingStatusView;
  plans: PlanCardItem[];
  /** `null` = plankorten visas inte (custom). */
  custom: boolean;
  trialDays: number;
  trialAvailable: boolean;
  /** Månadsbelopp inkl. moms per plan, formaterat (startdialogen). */
  monthlyTotals: Record<PaidPlan, string>;
  returnState:
    | { kind: "done"; planName: string }
    | { kind: "processing" }
    | { kind: "cancelled" }
    | null;
};

export type PlanBillingActions = {
  onStart: (plan: PaidPlan) => Promise<BillingActionResult>;
  onPreview: (
    plan: PaidPlan,
  ) => Promise<
    { ok: true; preview: PlanChangePreview } | { ok: false; code: string }
  >;
  onChange: (plan: PaidPlan) => Promise<BillingActionResult>;
  onCancel: () => Promise<BillingActionResult>;
  onResume: () => Promise<BillingActionResult>;
  onPortal: () => Promise<BillingActionResult>;
};

function errorText(code: string): string {
  const e = t.errores as Record<string, string>;
  return e[code] ?? t.errores.failed;
}

function DialogShell({
  open,
  onOpenChange,
  title,
  children,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  children: ReactNode;
}) {
  const descId = useId();
  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-20 flex items-start justify-center overflow-y-auto bg-ink/55 p-4 pt-24 lg:pt-44">
          <Dialog.Content
            aria-describedby={descId}
            className="flex w-full max-w-120 flex-col gap-4.5 rounded-hero bg-surface p-7 shadow-popover"
          >
            <div className="flex items-start justify-between gap-3">
              <Dialog.Title className="font-display text-22 font-bold text-ink">
                {title}
              </Dialog.Title>
              <Dialog.Close asChild>
                <IconButton
                  label={comun.cerrar}
                  tone="canvas"
                  size={44}
                  shape="square"
                  className="rounded-avatar"
                >
                  <X aria-hidden="true" className="size-4.5" strokeWidth={2} />
                </IconButton>
              </Dialog.Close>
            </div>
            <div id={descId} className="flex flex-col gap-4">
              {children}
            </div>
          </Dialog.Content>
        </Dialog.Overlay>
      </Dialog.Portal>
    </Dialog.Root>
  );
}

function ErrorLine({ error }: { error: string | null }) {
  return error ? (
    <p role="alert" className="text-13 font-semibold text-alert">
      {error}
    </p>
  ) : null;
}

function Row({
  label,
  value,
  strong,
}: {
  label: string;
  value: string;
  strong?: boolean;
}) {
  return (
    <div
      className={cn(
        "flex justify-between gap-3",
        strong ? "text-16 font-bold text-ink" : "text-14 text-muted",
      )}
    >
      <span>{label}</span>
      <span>{value}</span>
    </div>
  );
}

type DialogState =
  | { kind: "start"; plan: PaidPlan; name: string }
  | {
      kind: "change";
      plan: PaidPlan;
      name: string;
      preview: PlanChangePreview | null;
    }
  | { kind: "cancel" }
  | null;

export function PlanBillingSection({
  data,
  actions,
}: {
  data: PlanBillingData;
  actions: PlanBillingActions;
}) {
  const router = useRouter();
  const [dialog, setDialog] = useState<DialogState>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pageError, setPageError] = useState<string | null>(null);

  async function run(
    fn: () => Promise<BillingActionResult>,
    onError: (msg: string) => void,
  ) {
    if (busy) return;
    setBusy(true);
    try {
      const r = await fn();
      if (!r.ok) {
        onError(errorText(r.code));
        return;
      }
      if (r.url) {
        window.location.assign(r.url);
        return;
      }
      setDialog(null);
      router.refresh();
    } catch {
      onError(t.errores.failed);
    } finally {
      setBusy(false);
    }
  }

  async function choose(item: PlanCardItem) {
    setError(null);
    if (item.action === "cancel") {
      setDialog({ kind: "cancel" });
      return;
    }
    if (item.id === "free") return;
    if (item.action === "start") {
      setDialog({ kind: "start", plan: item.id, name: item.name });
      return;
    }
    setDialog({
      kind: "change",
      plan: item.id,
      name: item.name,
      preview: null,
    });
    try {
      const r = await actions.onPreview(item.id);
      if (r.ok) {
        setDialog((d) =>
          d?.kind === "change" && d.plan === item.id
            ? { ...d, preview: r.preview }
            : d,
        );
      } else {
        setError(errorText(r.code));
      }
    } catch {
      setError(t.errores.failed);
    }
  }

  const s = data.status;
  const ret = data.returnState;

  return (
    <div className="flex flex-col gap-5">
      {ret ? (
        <p
          role="status"
          className={cn(
            "flex items-center gap-3 rounded-tile px-4 py-3.5 text-14 font-semibold text-ink",
            ret.kind === "done" ? "bg-lime" : "bg-peach-50",
          )}
        >
          {ret.kind === "done" ? (
            <Check
              aria-hidden="true"
              className="size-5 shrink-0"
              strokeWidth={2}
            />
          ) : null}
          {ret.kind === "done"
            ? t.retorno.listo({ plan: ret.planName })
            : ret.kind === "processing"
              ? t.retorno.procesando
              : t.retorno.cancelado}
        </p>
      ) : null}

      <Card
        radius="tile"
        padding="lg"
        className="flex flex-col gap-4"
        aria-labelledby="ab-status-h"
      >
        <div className="flex flex-col gap-1">
          <p className="text-13 text-muted">{t.planActual}</p>
          <div className="flex flex-wrap items-center gap-3">
            <h2 id="ab-status-h" className="text-24 font-bold text-ink">
              {s.planName}
            </h2>
            <Chip tone={s.chip.tone} size="sm" weight="bold">
              {s.chip.label}
            </Chip>
          </div>
        </div>
        {s.lines.length > 0 ? (
          <ul className="flex flex-col gap-1.5 text-14 leading-body text-ink">
            {s.lines.map((l) => (
              <li key={l}>{l}</li>
            ))}
          </ul>
        ) : null}
        {s.card ? (
          <p className="flex items-center gap-2.5 text-14 text-muted">
            <CreditCard
              aria-hidden="true"
              className="size-4.5 shrink-0"
              strokeWidth={strokeCard}
            />
            {s.card}
          </p>
        ) : null}
        {s.warning ? (
          <div
            role="status"
            className="flex items-start gap-3 rounded-tile bg-peach-50 px-4 py-3.5 text-14 leading-relaxed text-on-peach-soft"
          >
            <TriangleAlert
              aria-hidden="true"
              className="mt-0.5 size-5 shrink-0 text-deposit-fg"
              strokeWidth={2}
            />
            <p className="flex-1">{s.warning}</p>
          </div>
        ) : null}
        {data.custom ? (
          <p className="text-14 leading-body text-ink">{t.custom}</p>
        ) : null}
        <ErrorLine error={pageError} />
        {s.portalLabel || s.canCancel || s.canResume ? (
          <div className="flex flex-wrap gap-3">
            {s.portalLabel ? (
              <Button
                type="button"
                variant="primary"
                size="md"
                disabled={busy}
                onClick={() => run(actions.onPortal, setPageError)}
              >
                {s.portalLabel}
              </Button>
            ) : null}
            {s.canResume ? (
              <Button
                type="button"
                variant="secondary"
                size="md"
                disabled={busy}
                onClick={() => run(actions.onResume, setPageError)}
              >
                {t.botones.reanudar}
              </Button>
            ) : null}
            {s.canCancel ? (
              <Button
                type="button"
                variant="secondary"
                size="md"
                disabled={busy}
                onClick={() => {
                  setError(null);
                  setDialog({ kind: "cancel" });
                }}
              >
                {t.botones.cancelar}
              </Button>
            ) : null}
          </div>
        ) : null}
      </Card>

      {data.custom ? null : (
        <section aria-labelledby="ab-plans-h" className="flex flex-col gap-3">
          <h2 id="ab-plans-h" className="text-18 font-bold text-ink">
            {t.planes.titulo}
          </h2>
          <ul className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
            {data.plans.map((p) => (
              <li
                key={p.id}
                className={cn(
                  "flex flex-col gap-3 rounded-tile border bg-surface p-5",
                  p.current ? "border-ink" : "border-line",
                )}
              >
                <div className="flex flex-col gap-1">
                  <span className="text-15 font-bold text-ink">{p.name}</span>
                  <span className="flex items-baseline gap-1">
                    <span className="font-display text-24 font-bold text-ink">
                      {p.price}
                    </span>
                    <span className="text-13 text-muted">
                      {t.planes.porMes}
                    </span>
                  </span>
                  <span className="text-12 text-muted">
                    {p.id === "free" ? t.planes.gratisNota : t.planes.sinIva}
                  </span>
                  {p.action === "start" && data.trialAvailable ? (
                    <span className="text-12 font-semibold text-ink">
                      {t.planes.prueba({ n: data.trialDays })}
                    </span>
                  ) : null}
                </div>
                {p.current ? (
                  <Chip tone="neutral" size="sm" weight="bold">
                    {t.botones.actual}
                  </Chip>
                ) : p.action === "none" ? null : (
                  <Button
                    type="button"
                    variant={p.action === "cancel" ? "secondary" : "primary"}
                    size="md"
                    className="self-start"
                    disabled={busy}
                    onClick={() => void choose(p)}
                  >
                    {t.botones.elegir}
                  </Button>
                )}
              </li>
            ))}
          </ul>
          <p className="text-12 leading-body text-muted">{t.condiciones}</p>
        </section>
      )}

      <DialogShell
        open={dialog?.kind === "start"}
        onOpenChange={(o) => (o ? null : setDialog(null))}
        title={
          dialog?.kind === "start"
            ? t.dialogo.tituloInicio({ plan: dialog.name })
            : ""
        }
      >
        {dialog?.kind === "start" ? (
          <>
            <p className="text-14 leading-body text-ink">
              {data.trialAvailable
                ? t.dialogo.inicioPrueba({
                    n: data.trialDays,
                    plan: dialog.name,
                  })
                : t.dialogo.inicioSinPrueba({
                    monto: data.monthlyTotals[dialog.plan],
                  })}
            </p>
            <ErrorLine error={error} />
            <div className="flex flex-col gap-2.5">
              <Button
                type="button"
                variant="primary"
                size="2xl"
                disabled={busy}
                onClick={() => {
                  const plan = dialog.plan;
                  void run(() => actions.onStart(plan), setError);
                }}
              >
                {t.dialogo.irAlPago}
              </Button>
              <Button
                type="button"
                variant="secondary"
                size="2xl"
                onClick={() => setDialog(null)}
              >
                {t.dialogo.volver}
              </Button>
            </div>
          </>
        ) : null}
      </DialogShell>

      <DialogShell
        open={dialog?.kind === "change"}
        onOpenChange={(o) => (o ? null : setDialog(null))}
        title={
          dialog?.kind === "change"
            ? t.dialogo.tituloCambio({ plan: dialog.name })
            : ""
        }
      >
        {dialog?.kind === "change" ? (
          <>
            {dialog.preview ? (
              <>
                <div className="flex flex-col gap-2.5 rounded-tile bg-canvas p-4.5">
                  {dialog.preview.direction === "upgrade" ? (
                    <Row
                      label={t.dialogo.hoy}
                      value={formatSek(dialog.preview.dueTodayOre)}
                      strong
                    />
                  ) : null}
                  <Row
                    label={t.dialogo.despues}
                    value={formatSek(dialog.preview.nextAmountOre)}
                    strong={dialog.preview.direction !== "upgrade"}
                  />
                  <Row
                    label=""
                    value={t.dialogo.ivaDe({
                      monto: formatSek(dialog.preview.nextVatOre),
                    })}
                  />
                </div>
                <p className="text-14 leading-body text-ink">
                  {dialog.preview.direction === "upgrade"
                    ? t.dialogo.subeAhora
                    : dialog.preview.direction === "trial"
                      ? t.dialogo.enPrueba
                      : t.dialogo.bajaAlFinal({
                          fecha: dialog.preview.effectiveLabel ?? "",
                        })}
                </p>
              </>
            ) : error ? null : (
              <p role="status" className="text-14 text-muted">
                {t.dialogo.calculando}
              </p>
            )}
            <ErrorLine error={error} />
            <div className="flex flex-col gap-2.5">
              <Button
                type="button"
                variant="primary"
                size="2xl"
                disabled={busy || !dialog.preview}
                onClick={() => {
                  const plan = dialog.plan;
                  void run(() => actions.onChange(plan), setError);
                }}
              >
                {t.dialogo.confirmar}
              </Button>
              <Button
                type="button"
                variant="secondary"
                size="2xl"
                onClick={() => setDialog(null)}
              >
                {t.dialogo.volver}
              </Button>
            </div>
          </>
        ) : null}
      </DialogShell>

      <DialogShell
        open={dialog?.kind === "cancel"}
        onOpenChange={(o) => (o ? null : setDialog(null))}
        title={t.dialogo.tituloCancelar({ plan: s.planName })}
      >
        <p className="text-14 leading-body text-ink">
          {t.dialogo.textoCancelar({ fecha: s.cancelDate })}
        </p>
        <ErrorLine error={error} />
        <div className="flex flex-col gap-2.5">
          <Button
            type="button"
            variant="primary"
            size="2xl"
            disabled={busy}
            onClick={() => void run(actions.onCancel, setError)}
          >
            {t.dialogo.confirmarCancelar}
          </Button>
          <Button
            type="button"
            variant="secondary"
            size="2xl"
            onClick={() => setDialog(null)}
          >
            {t.botones.mantener}
          </Button>
        </div>
      </DialogShell>
    </div>
  );
}
