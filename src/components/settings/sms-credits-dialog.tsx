"use client";

// WP-76 (D-053): dialogerna kring köp av sms-krediter, efter
// docs/design/reference/sms-krediter/{Main,Mobil}.dc.html (godkänd 2026-10-10):
// - `SmsConfirmDialog`: bekräftelse före Stripe Checkout (paket, belopp inkl.
//   moms, momsdel, giltighet) — "Gå till betalning" / "Avbryt".
// - `SmsDoneDialog`: kvitto vid retur (`?sms=klart`) med CTA till
//   SMS-marknadsföring, eller "Betalningen behandlas" om webhooken inte hunnit.
// - `SmsUpgradeDialog`: planen saknar utskick (kräver Team, D-048).
// Samma Radix Dialog-mönster som `ui/confirm-dialog.tsx`, mått från referensen.
import * as Dialog from "@radix-ui/react-dialog";
import { Check, X } from "lucide-react";
import Link from "next/link";
import { useId, useState, type ReactNode } from "react";

import { Button } from "@/components/ui/button";
import { IconButton } from "@/components/ui/icon-button";
import { comun, planes } from "@/i18n";

const t = planes.smsCreditos;

function Shell({
  open,
  onOpenChange,
  labelledBy,
  describedBy,
  children,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  labelledBy?: string;
  describedBy: string;
  children: ReactNode;
}) {
  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-20 flex items-start justify-center overflow-y-auto bg-ink/55 p-4 pt-24 lg:pt-44">
          <Dialog.Content
            aria-labelledby={labelledBy}
            aria-describedby={describedBy}
            className="flex w-full max-w-120 flex-col gap-4.5 rounded-hero bg-surface p-7 shadow-popover"
          >
            {children}
          </Dialog.Content>
        </Dialog.Overlay>
      </Dialog.Portal>
    </Dialog.Root>
  );
}

function SecondaryButton({
  onClick,
  children,
}: {
  onClick: () => void;
  children: ReactNode;
}) {
  return (
    <Button
      type="button"
      variant="secondary"
      size="2xl"
      className="border-2 font-semibold"
      onClick={onClick}
    >
      {children}
    </Button>
  );
}

export type SmsConfirmDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** "250 SMS" */
  label: string;
  /** Belopp inkl. moms, formaterat. */
  total: string;
  vat: string;
  validUntil: string;
  /** Felet från servern (redan översatt), annars `null`. */
  error: string | null;
  onPay: () => Promise<void>;
};

export function SmsConfirmDialog({
  open,
  onOpenChange,
  label,
  total,
  vat,
  validUntil,
  error,
  onPay,
}: SmsConfirmDialogProps) {
  const descId = useId();
  const [busy, setBusy] = useState(false);
  return (
    <Shell open={open} onOpenChange={onOpenChange} describedBy={descId}>
      <div className="flex items-start justify-between gap-3">
        <Dialog.Title className="font-display text-22 font-bold text-ink">
          {t.confirmar.titulo}
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
      <div className="flex flex-col gap-2.5 rounded-tile bg-canvas p-4.5 text-14">
        <div className="flex justify-between text-16 font-bold text-ink">
          <span>{label}</span>
          <span>{total}</span>
        </div>
        <div className="flex justify-between text-muted">
          <span>{t.confirmar.ivaParte}</span>
          <span>{vat}</span>
        </div>
        <div className="flex justify-between text-muted">
          <span>{t.confirmar.validoHasta}</span>
          <span>{validUntil}</span>
        </div>
      </div>
      <Dialog.Description
        id={descId}
        className="text-13 leading-relaxed text-muted"
      >
        {t.confirmar.texto}
      </Dialog.Description>
      {error ? (
        <p
          role="alert"
          className="rounded-event bg-alert-bg p-3 text-13 text-alert-fg"
        >
          {error}
        </p>
      ) : null}
      <div className="flex flex-wrap gap-2.5">
        <Button
          type="button"
          variant="primary"
          size="2xl"
          className="flex-1 font-semibold"
          disabled={busy}
          onClick={() => {
            setBusy(true);
            void onPay().finally(() => setBusy(false));
          }}
        >
          {t.confirmar.ir}
        </Button>
        <SecondaryButton onClick={() => onOpenChange(false)}>
          {t.confirmar.cancelar}
        </SecondaryButton>
      </div>
    </Shell>
  );
}

export type SmsDoneDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** `null` = betalningen behandlas fortfarande (webhooken har inte kommit). */
  added: string | null;
  balance: string;
  /** "Skicka SMS-marknadsföring": länk till Kampanjer, eller `onUpgrade` om
   * planen saknar utskick. */
  campaignsHref: string | null;
  onUpgrade: () => void;
};

export function SmsDoneDialog({
  open,
  onOpenChange,
  added,
  balance,
  campaignsHref,
  onUpgrade,
}: SmsDoneDialogProps) {
  const titleId = useId();
  const descId = useId();
  if (added === null) {
    return (
      <Shell
        open={open}
        onOpenChange={onOpenChange}
        labelledBy={titleId}
        describedBy={descId}
      >
        <Dialog.Title
          id={titleId}
          className="font-display text-24 font-bold text-ink"
        >
          {t.procesando.titulo}
        </Dialog.Title>
        <Dialog.Description
          id={descId}
          className="text-14 leading-relaxed text-muted"
        >
          {t.procesando.texto}
        </Dialog.Description>
        <Button
          type="button"
          variant="primary"
          size="2xl"
          className="font-semibold"
          onClick={() => onOpenChange(false)}
        >
          {t.procesando.ok}
        </Button>
      </Shell>
    );
  }
  return (
    <Shell
      open={open}
      onOpenChange={onOpenChange}
      labelledBy={titleId}
      describedBy={descId}
    >
      <div className="flex size-14 items-center justify-center rounded-icon bg-success-bg">
        <Check
          aria-hidden="true"
          className="size-7 text-success-fg"
          strokeWidth={2.5}
        />
      </div>
      <div className="flex flex-col gap-1.5">
        <Dialog.Title
          id={titleId}
          className="font-display text-24 font-bold text-ink"
        >
          {t.listo.titulo({ n: added })}
        </Dialog.Title>
        <Dialog.Description
          id={descId}
          className="text-14 leading-relaxed text-muted"
        >
          {t.listo.texto({ saldo: balance })}
        </Dialog.Description>
      </div>
      <div className="flex flex-col gap-2 rounded-tile bg-lime p-4.5 text-on-lime-soft">
        <span className="text-15 font-bold text-ink">{t.listo.cajaTitulo}</span>
        <span className="text-13 leading-relaxed">{t.listo.cajaTexto}</span>
      </div>
      <div className="flex flex-wrap gap-2.5">
        {campaignsHref ? (
          <Button
            asChild
            variant="primary"
            size="2xl"
            className="flex-1 font-semibold"
          >
            <Link href={campaignsHref}>{t.marketing.cta}</Link>
          </Button>
        ) : (
          <Button
            type="button"
            variant="primary"
            size="2xl"
            className="flex-1 font-semibold"
            onClick={onUpgrade}
          >
            {t.marketing.cta}
          </Button>
        )}
        <SecondaryButton onClick={() => onOpenChange(false)}>
          {t.listo.ahoraNo}
        </SecondaryButton>
      </div>
    </Shell>
  );
}

export type SmsUpgradeDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Planen som har utskick (`minPlanFor("campaigns")`). */
  planName: string;
  plansHref: string;
};

export function SmsUpgradeDialog({
  open,
  onOpenChange,
  planName,
  plansHref,
}: SmsUpgradeDialogProps) {
  const descId = useId();
  return (
    <Shell open={open} onOpenChange={onOpenChange} describedBy={descId}>
      <div className="flex items-start justify-between gap-3">
        <Dialog.Title className="font-display text-22 font-bold text-ink">
          {planes.bloqueo.titulo({
            funcion: planes.funciones.campaigns,
            plan: planName,
          })}
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
      <Dialog.Description
        id={descId}
        className="text-14 leading-relaxed text-muted"
      >
        {planes.bloqueo.ganchos.campaigns}
      </Dialog.Description>
      <div className="flex flex-wrap gap-2.5">
        <Button
          asChild
          variant="primary"
          size="2xl"
          className="flex-1 font-semibold"
        >
          <Link href={plansHref}>{planes.bloqueo.verPlanes}</Link>
        </Button>
        <SecondaryButton onClick={() => onOpenChange(false)}>
          {t.listo.ahoraNo}
        </SecondaryButton>
      </div>
    </Shell>
  );
}
