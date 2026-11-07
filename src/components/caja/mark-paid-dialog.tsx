"use client";

// MarkPaidDialog — "Marcar como pagada" (WP-24, F10): delad mellan Caja
// ("att ta betalt för"), agendans popover och Hoy. Samma Radix Dialog-mönster
// som `agenda/move-dialog.tsx` (bottenark på mobil, centrerad dialog från
// `sm`). Metoden väljs med `Pill` (samma komponent som Agenda/Reserva),
// beloppet är ett förifyllt textfält (`parseMoney`/`moneyInputValue`,
// `src/lib/format/money.ts` — samma mönster som pris i `services-section.tsx`).
// Propinan är bara lokal UI-text (planen: "ingår inte i kassans summor"),
// skickas aldrig till servern.
import * as Dialog from "@radix-ui/react-dialog";
import { X } from "lucide-react";
import Link from "next/link";
import { useId, useState } from "react";

import { Button } from "@/components/ui/button";
import { IconButton } from "@/components/ui/icon-button";
import { Pill } from "@/components/ui/pill";
import { TextField } from "@/components/ui/text-field";
import { useSheetDrag } from "@/components/ui/use-sheet-drag";
import { appHref } from "@/config/routes";
import { caja, comun, regalo } from "@/i18n";
import { formatMoney, moneyInputValue, parseMoney } from "@/lib/format/money";

import type {
  ManualPaymentMethod,
  MarkBookingPaidInput,
  MarkBookingPaidResult,
} from "./types";

function errorText(code: string): string {
  switch (code) {
    case "already_paid":
      return caja.errores.already_paid;
    case "booking_cancelled":
      return caja.errores.booking_cancelled;
    case "invalid_amount":
    case "invalid_method":
      return caja.errores.invalid_amount;
    default:
      return comun.algoSalioMal;
  }
}

export type MarkPaidDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  bookingId: string;
  /** Det som återstår att betala, minsta enheten (förifyller beloppet). */
  dueMinor: number;
  /** `MANUAL_METHODS` (src/server/payments/mark-paid.ts): cash/
   * card_terminal/transfer. */
  methods: readonly ManualPaymentMethod[];
  onSubmit: (input: MarkBookingPaidInput) => Promise<MarkBookingPaidResult>;
  /** Anropas efter en lyckad betalning (stänger popover/uppdaterar listor). */
  onPaid?: (paymentId: string) => void;
};

export function MarkPaidDialog({
  open,
  onOpenChange,
  bookingId,
  dueMinor,
  methods,
  onSubmit,
  onPaid,
}: MarkPaidDialogProps) {
  const descriptionId = useId();
  const { panelRef, handleProps: dragHandleProps } = useSheetDrag(() =>
    onOpenChange(false),
  );
  const [method, setMethod] = useState<ManualPaymentMethod | null>(
    () => methods[0] ?? null,
  );
  const [amount, setAmount] = useState(() => moneyInputValue(dueMinor));
  const [tip, setTip] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  // Samma mönster som `move-dialog.tsx`: nollställs när dialogen stängs (inte via en effekt
  // vid öppning) — varje instans hör till en fast bokning/`dueMinor` under sin livstid.
  function reset() {
    setMethod(methods[0] ?? null);
    setAmount(moneyInputValue(dueMinor));
    setTip("");
    setError(null);
  }

  async function handleConfirm() {
    if (submitting || !method) return;
    const parsedAmount = parseMoney(amount);
    if (!parsedAmount.ok) {
      setError(caja.errores.invalid_amount);
      return;
    }
    setSubmitting(true);
    setError(null);
    const result = await onSubmit({
      bookingId,
      method,
      amountMinor: parsedAmount.value,
    });
    setSubmitting(false);
    if (result.ok) {
      onOpenChange(false);
      onPaid?.(result.paymentId);
      return;
    }
    setError(errorText(result.code));
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
            className="flex max-h-full w-full max-w-sm translate-y-0 flex-col gap-4 overflow-y-auto rounded-t-panel bg-canvas p-6 shadow-popover transition-transform duration-200 ease-out sm:rounded-panel sheet-closed:translate-y-full"
          >
            <div
              aria-hidden="true"
              className="-mt-2 mb-1 h-1.5 w-10 shrink-0 touch-none self-center rounded-full bg-line-strong sm:hidden"
              {...dragHandleProps}
            />
            <div className="flex items-start justify-between">
              <Dialog.Title className="text-17 font-bold">
                {caja.marcarPagada.titulo}
              </Dialog.Title>
              <Dialog.Close asChild>
                <IconButton label={comun.cerrar} tone="ghost" size={30}>
                  <X aria-hidden="true" className="size-4" strokeWidth={2.2} />
                </IconButton>
              </Dialog.Close>
            </div>
            <Dialog.Description
              id={descriptionId}
              className="text-13 text-muted"
            >
              {caja.marcarPagada.aPagar({ total: formatMoney(dueMinor) })}
            </Dialog.Description>

            <div className="flex flex-col gap-2">
              <span className="text-13 font-semibold text-ink">
                {caja.marcarPagada.metodoLabel}
              </span>
              <div className="flex flex-wrap gap-2">
                {methods.map((m) => (
                  <Pill
                    key={m}
                    selected={method === m}
                    onClick={() => setMethod(m)}
                  >
                    {caja.metodo[m]}
                  </Pill>
                ))}
              </div>
            </div>

            <TextField
              label={caja.marcarPagada.montoLabel}
              inputMode="numeric"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
            />

            <TextField
              label={caja.marcarPagada.propinaLabel}
              hint={caja.marcarPagada.propinaAyuda}
              inputMode="numeric"
              value={tip}
              onChange={(e) => setTip(e.target.value)}
            />

            {error ? (
              <p role="alert" className="text-13 text-ink">
                {error}
              </p>
            ) : null}

            {/* WP-87 (D-073): el código se ingresa en Caja → Tarjetas de
                regalo, con esta reserva ya elegida en "Usar en". */}
            <Link
              href={`${appHref("appCajaTarjetas")}?reserva=${encodeURIComponent(bookingId)}`}
              className="self-start text-13 font-semibold text-ink underline underline-offset-2"
            >
              {regalo.caja.pagarConTarjeta}
            </Link>

            <div className="mt-1 flex justify-end gap-3">
              <Button
                type="button"
                variant="secondary"
                size="lg"
                onClick={() => {
                  reset();
                  onOpenChange(false);
                }}
              >
                {comun.cerrar}
              </Button>
              <Button
                type="button"
                variant="primary"
                size="lg"
                disabled={submitting || !method}
                onClick={() => void handleConfirm()}
              >
                {caja.marcarPagada.cta}
              </Button>
            </div>
          </Dialog.Content>
        </Dialog.Overlay>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
