"use client";

// WP-87 (D-073, port av SE WP-77/D-058): Caja → Tarjetas de regalo → "Usar
// tarjeta de regalo". Kod → servern visar saldo, giltighet och status →
// "Usar en" (dagens bokningar med något kvar att betala, eller ingen) →
// belopp (standard: min(saldo, bokningens att betala)) → descontar. All
// logik och alla texter i svaren kommer från servern (server action).
import { useActionState, useState } from "react";

import { cn } from "@/components/ui/cn";
import { regalo } from "@/i18n";
import { formatMoney, parseMoney } from "@/lib/format/money";

import type { TillState } from "./types";

const t = regalo.caja;

export function TillRedeem({
  action,
  initialBookingId = "",
}: {
  action: (prev: TillState, fd: FormData) => Promise<TillState>;
  /** `?reserva=` från "Marcar como pagada": förvald i "Usar en". */
  initialBookingId?: string;
}) {
  const [state, formAction, pending] = useActionState(action, {
    code: "",
    card: null,
    bookings: [],
    bookingId: initialBookingId,
    message: null,
    error: null,
  });
  const [code, setCode] = useState(state.code);
  const [bookingId, setBookingId] = useState<string>(initialBookingId);
  const [amountText, setAmountText] = useState<string>("");

  const card = state.card;
  const selected = state.bookings.find((b) => b.id === bookingId);
  const defaultMinor = card
    ? Math.min(
        card.balanceMinor,
        selected ? selected.dueMinor : card.balanceMinor,
      )
    : 0;
  const parsed = amountText.trim() === "" ? null : parseMoney(amountText);
  const amountMinor =
    parsed === null ? defaultMinor : parsed.ok ? parsed.value : 0;
  const validAmount = Number.isInteger(amountMinor) && amountMinor > 0;

  return (
    <section
      aria-labelledby="tr-till-h"
      className="flex flex-col gap-4.5 rounded-card bg-surface p-5 lg:p-6.5"
    >
      <h2 id="tr-till-h" className="font-display text-22 font-extrabold">
        {t.canjear}
      </h2>
      <form action={formAction} className="flex gap-2.5">
        <input type="hidden" name="intent" value="lookup" />
        <label className="flex min-w-0 flex-1 flex-col gap-1.5 text-13 font-semibold">
          {t.codigo}
          <input
            name="code"
            required
            autoComplete="off"
            autoCapitalize="characters"
            spellCheck={false}
            maxLength={40}
            value={code}
            onChange={(e) => setCode(e.target.value)}
            className="h-13 w-full min-w-0 rounded-avatar border-2 border-border px-3.5 font-mono text-16 tracking-caps uppercase outline-none focus-visible:border-ink lg:text-18"
          />
        </label>
        <button
          type="submit"
          disabled={pending}
          className="h-13 shrink-0 self-end rounded-full bg-ink px-5.5 font-bold text-on-dark focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink disabled:opacity-60"
        >
          {t.buscar}
        </button>
      </form>

      {state.error ? (
        <p
          role="alert"
          className="rounded-avatar bg-alert-bg px-3.5 py-3 text-14 font-semibold text-alert-fg"
        >
          {state.error}
        </p>
      ) : null}

      {card ? (
        <>
          <div className="grid grid-cols-1 items-center gap-4.5 rounded-panel bg-canvas p-4 sm:grid-cols-2 lg:flex">
            <div
              className={cn(
                "flex h-27.5 flex-col justify-between rounded-control p-3.5 text-ink lg:w-45 lg:shrink-0",
                card.theme === "lime" ? "bg-lime" : "bg-lilac",
              )}
            >
              <span className="text-11 font-bold tracking-caps uppercase">
                {regalo.tarjeta.etiqueta} ···{card.last4}
              </span>
              <span className="font-display text-30 font-extrabold">
                {formatMoney(card.initialMinor)}
              </span>
            </div>
            <dl className="grid grid-cols-2 gap-x-3.5 gap-y-1.5 text-14">
              <dt className="text-muted">{t.saldo}</dt>
              <dd className="font-extrabold">
                {formatMoney(card.balanceMinor)}
              </dd>
              <dt className="text-muted">{t.validoHasta}</dt>
              <dd>{card.expiresLabel}</dd>
              <dt className="text-muted">{t.estado}</dt>
              <dd>
                <span
                  className={cn(
                    "rounded-chip px-2.5 py-0.5 text-12 font-bold",
                    card.active
                      ? "bg-success-bg text-success-fg"
                      : "bg-line text-muted",
                  )}
                >
                  {card.statusLabel}
                </span>
              </dd>
            </dl>
          </div>
          {card.active && card.balanceMinor > 0 ? (
            <form action={formAction} className="flex flex-col gap-4">
              <input type="hidden" name="intent" value="redeem" />
              <input type="hidden" name="code" value={state.code} />
              <label className="flex flex-col gap-1.5 text-13 font-semibold">
                {t.usarEn}
                <select
                  name="bookingId"
                  value={bookingId}
                  onChange={(e) => {
                    setBookingId(e.target.value);
                    setAmountText("");
                  }}
                  className="h-12.5 rounded-avatar border-2 border-border bg-surface px-3 text-15 outline-none focus-visible:border-ink"
                >
                  <option value="">{t.sinReserva}</option>
                  {state.bookings.map((b) => (
                    <option key={b.id} value={b.id}>
                      {b.label}
                    </option>
                  ))}
                </select>
              </label>
              <label className="flex flex-col gap-1.5 text-13 font-semibold">
                {t.monto}
                <input
                  name="amount"
                  inputMode="numeric"
                  autoComplete="off"
                  placeholder={String(defaultMinor)}
                  value={amountText}
                  onChange={(e) => setAmountText(e.target.value)}
                  className="h-12.5 rounded-avatar border-2 border-border px-3 text-15 outline-none focus-visible:border-ink"
                />
              </label>
              <button
                type="submit"
                disabled={pending || !validAmount}
                className="min-h-13.5 rounded-full bg-lime px-6 text-16 font-bold text-ink focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink disabled:opacity-60"
              >
                {validAmount
                  ? t.descontar({ monto: formatMoney(amountMinor) })
                  : t.descontarSinMonto}
              </button>
            </form>
          ) : null}
        </>
      ) : null}

      {state.message ? (
        <p
          role="status"
          className="rounded-avatar bg-success-bg px-3.5 py-3 text-14 font-semibold text-success-fg"
        >
          {state.message}
        </p>
      ) : null}
    </section>
  );
}
