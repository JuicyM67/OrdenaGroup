"use client";

// WP-77 (D-058): Kassa → Presentkort → "Lös in presentkort" (designen
// `presentkort/Kassa.dc.html`). Kod → servern visar saldo, utgång och status →
// "Använd till" (dagens bokningar med något kvar att betala, eller ingen) →
// belopp (standard: min(saldo, bokningens att betala)) → dra. All logik och
// alla texter i svaren kommer från servern (server action).
import { useActionState, useState } from "react";

import { cn } from "@/components/ui/cn";
import { formatMoney } from "@/lib/format/money";

export type TillCard = {
  last4: string;
  initialMinor: number;
  balanceMinor: number;
  statusLabel: string;
  active: boolean;
  expiresLabel: string;
  recipient: string | null;
  theme: "lime" | "lilac" | "photo";
};

export type TillBookingOption = { id: string; label: string; dueMinor: number };

export type TillState = {
  code: string;
  card: TillCard | null;
  bookings: TillBookingOption[];
  message: string | null;
  error: string | null;
};

export type TillTexts = {
  title: string;
  code: string;
  lookup: string;
  balance: string;
  validUntil: string;
  status: string;
  useFor: string;
  noBooking: string;
  amount: string;
  cardLabel: string;
  /** "Dra {monto} från presentkortet" med `{monto}` kvar. */
  redeemTpl: string;
  redeemNoAmount: string;
};

export function TillRedeem({
  texts: t,
  action,
}: {
  texts: TillTexts;
  action: (prev: TillState, fd: FormData) => Promise<TillState>;
}) {
  const [state, formAction, pending] = useActionState(action, {
    code: "",
    card: null,
    bookings: [],
    message: null,
    error: null,
  });
  const [code, setCode] = useState(state.code);
  const [bookingId, setBookingId] = useState<string>("");
  const [amountKr, setAmountKr] = useState<string>("");

  const card = state.card;
  const booking = state.bookings.find((b) => b.id === bookingId);
  const defaultMinor = card
    ? Math.min(
        card.balanceMinor,
        booking ? booking.dueMinor : card.balanceMinor,
      )
    : 0;
  const amountMinor =
    amountKr.trim() === "" ? defaultMinor : Math.round(Number(amountKr) * 100);
  const validAmount = Number.isInteger(amountMinor) && amountMinor > 0;

  return (
    <section
      aria-labelledby="pk-till-h"
      className="flex flex-col gap-4.5 rounded-card bg-surface p-6.5"
    >
      <h2 id="pk-till-h" className="font-display text-22 font-extrabold">
        {t.title}
      </h2>
      <form action={formAction} className="flex gap-2.5">
        <input type="hidden" name="intent" value="lookup" />
        <label className="flex flex-1 flex-col gap-1.5 text-13 font-semibold">
          {t.code}
          <input
            name="code"
            required
            autoComplete="off"
            spellCheck={false}
            value={code}
            onChange={(e) => setCode(e.target.value)}
            className="h-13 rounded-avatar border-2 border-border px-3.5 font-mono text-18 tracking-caps uppercase outline-none focus-visible:border-ink"
          />
        </label>
        <button
          type="submit"
          disabled={pending}
          className="h-13 self-end rounded-full bg-ink px-5.5 font-bold text-on-dark focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink disabled:opacity-60"
        >
          {t.lookup}
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
                "flex h-27.5 flex-col justify-between rounded-control p-3.5 lg:w-45 lg:shrink-0",
                card.theme === "lime"
                  ? "bg-lime text-ink"
                  : card.theme === "photo"
                    ? "bg-dark text-on-dark"
                    : "bg-lilac text-ink",
              )}
            >
              <span className="text-11 font-bold tracking-caps uppercase">
                {t.cardLabel} ···{card.last4}
              </span>
              <span className="font-display text-30 font-extrabold">
                {formatMoney(card.initialMinor)}
              </span>
            </div>
            <dl className="grid grid-cols-2 gap-x-3.5 gap-y-1.5 text-14">
              <dt className="text-muted">{t.balance}</dt>
              <dd className="font-extrabold">
                {formatMoney(card.balanceMinor)}
              </dd>
              <dt className="text-muted">{t.validUntil}</dt>
              <dd>{card.expiresLabel}</dd>
              <dt className="text-muted">{t.status}</dt>
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
                {t.useFor}
                <select
                  name="bookingId"
                  value={bookingId}
                  onChange={(e) => {
                    setBookingId(e.target.value);
                    setAmountKr("");
                  }}
                  className="h-12.5 rounded-avatar border-2 border-border bg-surface px-3 text-15 outline-none focus-visible:border-ink"
                >
                  <option value="">{t.noBooking}</option>
                  {state.bookings.map((b) => (
                    <option key={b.id} value={b.id}>
                      {b.label}
                    </option>
                  ))}
                </select>
              </label>
              <label className="flex flex-col gap-1.5 text-13 font-semibold">
                {t.amount}
                <input
                  type="number"
                  name="amount"
                  inputMode="decimal"
                  min={1}
                  step="any"
                  placeholder={String(defaultMinor / 100)}
                  value={amountKr}
                  onChange={(e) => setAmountKr(e.target.value)}
                  className="h-12.5 rounded-avatar border-2 border-border px-3 text-15 outline-none focus-visible:border-ink"
                />
              </label>
              <button
                type="submit"
                disabled={pending || !validAmount}
                className="min-h-13.5 rounded-full bg-lime px-6 text-16 font-bold text-ink focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink disabled:opacity-60"
              >
                {validAmount
                  ? t.redeemTpl.replace("{monto}", formatMoney(amountMinor))
                  : t.redeemNoAmount}
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
