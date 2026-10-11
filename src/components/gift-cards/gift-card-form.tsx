"use client";

// WP-77 (D-058): köpformuläret på `/<slug>/presentkort` (designen
// `presentkort/Main.dc.html` + `Mobil.dc.html`). Enda klient-JS:n på sidan:
// förhandsvisningen följer belopp, design och mottagare. Texterna kommer
// färdiga från servern (inga i18n-importer här, D-039-mönstret); beloppet och
// avgiften räknas på servern (server action → Stripe Checkout).
import { ArrowRight, Check, Lock } from "lucide-react";
import { useActionState, useState } from "react";

import { cn } from "@/components/ui/cn";
import { formatLocalDate, type LocalDate } from "@/lib/format/dates";
import { formatMoney } from "@/lib/format/money";

import {
  GiftCardPreview,
  giftCardThemeClass,
  GiftCardPhoto,
  type GiftCardTheme,
} from "./gift-card-preview";

export type GiftCardFormTexts = {
  steps: { amount: string; design: string; to: string };
  stepsShort: { amount: string; design: string; to: string };
  other: string;
  otherLabel: string;
  themes: Record<GiftCardTheme, string>;
  fields: {
    recipient: string;
    recipientEmail: string;
    recipientEmailHelp: string;
    greeting: string;
    greetingShort: string;
    from: string;
    send: string;
    sendHelp: string;
    buyerEmail: string;
    buyerEmailShort: string;
  };
  terms: string;
  cardLabel: string;
  /** "Till {nombre}" med `{nombre}` kvar. */
  toTpl: string;
  validUntil: string;
  summary: {
    send: string;
    now: string;
    toPay: string;
    /** "Betala {monto}" med `{monto}` kvar. */
    payTpl: string;
    stripe: string;
    withdrawal: string;
    mobileNote: string;
  };
  errors: Record<string, string>;
};

export type GiftCardFormState = { error: string | null };

type Props = {
  texts: GiftCardFormTexts;
  businessName: string;
  photoUrl: string | null;
  presets: readonly number[];
  minSek: number;
  maxSek: number;
  today: string;
  maxDate: string;
  defaults: { buyerName: string; buyerEmail: string };
  initialError: string | null;
  action: (prev: GiftCardFormState, fd: FormData) => Promise<GiftCardFormState>;
};

const THEMES: readonly GiftCardTheme[] = ["lime", "lilac", "photo"];

const fieldClass =
  "h-12 rounded-avatar bg-canvas px-3.5 text-15 text-ink outline-none focus-visible:ring-2 focus-visible:ring-ink";
const labelClass = "flex flex-col gap-1.5 text-13 font-semibold text-ink";

export function GiftCardForm({
  texts: t,
  businessName,
  photoUrl,
  presets,
  minSek,
  maxSek,
  today,
  maxDate,
  defaults,
  initialError,
  action,
}: Props) {
  const [state, formAction, pending] = useActionState(action, {
    error: initialError,
  });
  const [amount, setAmount] = useState<string>(
    String(presets[1] ?? presets[0] ?? minSek),
  );
  const [custom, setCustom] = useState("");
  const [theme, setTheme] = useState<GiftCardTheme>("lilac");
  const [recipient, setRecipient] = useState("");
  const [recipientEmail, setRecipientEmail] = useState("");
  const [greeting, setGreeting] = useState("");
  const [from, setFrom] = useState(defaults.buyerName);
  const [deliverOn, setDeliverOn] = useState("");
  const [buyerEmail, setBuyerEmail] = useState(defaults.buyerEmail);

  const sek = amount === "custom" ? Number(custom) : Number(amount);
  const valid = Number.isInteger(sek) && sek >= minSek && sek <= maxSek;
  const amountLabel = formatMoney((valid ? sek : 0) * 100);
  const to = recipient.trim()
    ? t.toTpl.replace("{nombre}", recipient.trim())
    : undefined;
  const sendLabel = /^\d{4}-\d{2}-\d{2}$/.test(deliverOn)
    ? `${formatLocalDate(deliverOn as LocalDate, "dayMonthLong")}, 08:00`
    : t.summary.now;
  const payLabel = t.summary.payTpl.replace("{monto}", amountLabel);
  const error = state.error ? (t.errors[state.error] ?? t.errors.failed) : null;

  const amountButtons = (
    <div className="grid grid-cols-2 gap-2 lg:grid-cols-4 lg:gap-2.5">
      {[...presets.map(String), "custom"].map((v) => {
        const on = amount === v;
        return (
          <label
            key={v}
            className={cn(
              "flex min-h-13 cursor-pointer items-center justify-center rounded-avatar border-2 text-15 font-bold has-focus-visible:ring-2 has-focus-visible:ring-ink lg:min-h-14 lg:rounded-control lg:text-16",
              on
                ? "border-ink bg-ink text-on-dark"
                : "border-border bg-surface text-ink",
            )}
          >
            <input
              type="radio"
              name="amount"
              value={v}
              checked={on}
              onChange={() => setAmount(v)}
              className="sr-only"
            />
            {v === "custom" ? t.other : formatMoney(Number(v) * 100)}
          </label>
        );
      })}
    </div>
  );

  const customField =
    amount === "custom" ? (
      <label className={labelClass}>
        {t.otherLabel}
        <input
          type="number"
          name="customAmount"
          inputMode="numeric"
          min={minSek}
          max={maxSek}
          step={1}
          required
          value={custom}
          onChange={(e) => setCustom(e.target.value)}
          className="h-12 rounded-avatar border-2 border-border bg-surface px-3.5 text-16 text-ink outline-none focus-visible:border-ink"
        />
      </label>
    ) : null;

  const themeButtons = (
    <div className="grid grid-cols-3 gap-2 lg:gap-2.5">
      {THEMES.map((th) => {
        const on = theme === th;
        return (
          <label
            key={th}
            className={cn(
              "relative flex h-16 cursor-pointer flex-col overflow-hidden rounded-avatar border-3 has-focus-visible:ring-2 has-focus-visible:ring-ink",
              "lg:h-auto lg:gap-2 lg:rounded-icon lg:border-2 lg:bg-surface lg:p-2.5 lg:text-ink",
              giftCardThemeClass(th),
              on
                ? "border-ink lg:border-ink"
                : "border-transparent lg:border-border",
            )}
          >
            <input
              type="radio"
              name="theme"
              value={th}
              checked={on}
              onChange={() => setTheme(th)}
              className="sr-only"
            />
            {th === "photo" ? (
              <span aria-hidden="true" className="lg:hidden">
                <GiftCardPhoto src={photoUrl} />
              </span>
            ) : null}
            <span
              aria-hidden="true"
              className={cn(
                "relative hidden h-16 overflow-hidden rounded-event lg:block",
                giftCardThemeClass(th),
              )}
            >
              {th === "photo" ? <GiftCardPhoto src={photoUrl} /> : null}
            </span>
            <span className="sr-only lg:not-sr-only lg:text-14 lg:font-semibold">
              {t.themes[th]}
            </span>
          </label>
        );
      })}
    </div>
  );

  const recipientFields = (
    <>
      <div className="grid gap-3 lg:grid-cols-2">
        <label className={labelClass}>
          {t.fields.recipient}
          <input
            name="recipientName"
            required
            maxLength={80}
            autoComplete="off"
            value={recipient}
            onChange={(e) => setRecipient(e.target.value)}
            className={fieldClass}
          />
        </label>
        <label className={labelClass}>
          {t.fields.recipientEmail}
          <input
            type="email"
            name="recipientEmail"
            maxLength={254}
            autoComplete="off"
            value={recipientEmail}
            onChange={(e) => setRecipientEmail(e.target.value)}
            aria-describedby="pk-recipient-help"
            className={fieldClass}
          />
          <span id="pk-recipient-help" className="sr-only">
            {t.fields.recipientEmailHelp}
          </span>
        </label>
      </div>
      <label className={labelClass}>
        <span>
          <span className="lg:hidden">{t.fields.greetingShort}</span>
          <span className="hidden lg:inline">{t.fields.greeting}</span>
        </span>
        <textarea
          name="greeting"
          rows={3}
          maxLength={300}
          value={greeting}
          onChange={(e) => setGreeting(e.target.value)}
          className="resize-y rounded-avatar bg-canvas px-3.5 py-3 text-15 text-ink outline-none focus-visible:ring-2 focus-visible:ring-ink"
        />
      </label>
      <div className="grid gap-3 lg:grid-cols-2">
        <label className={labelClass}>
          {t.fields.from}
          <input
            name="buyerName"
            required
            maxLength={80}
            autoComplete="name"
            value={from}
            onChange={(e) => setFrom(e.target.value)}
            className={fieldClass}
          />
        </label>
        <label className={labelClass}>
          {t.fields.send}
          <input
            type="date"
            name="deliverOn"
            min={today}
            max={maxDate}
            value={deliverOn}
            onChange={(e) => setDeliverOn(e.target.value)}
            aria-describedby="pk-send-help"
            className={fieldClass}
          />
          <span id="pk-send-help" className="sr-only">
            {t.fields.sendHelp}
          </span>
        </label>
      </div>
      <label className={labelClass}>
        <span>
          <span className="lg:hidden">{t.fields.buyerEmailShort}</span>
          <span className="hidden lg:inline">{t.fields.buyerEmail}</span>
        </span>
        <input
          type="email"
          name="buyerEmail"
          required
          maxLength={254}
          autoComplete="email"
          value={buyerEmail}
          onChange={(e) => setBuyerEmail(e.target.value)}
          className={fieldClass}
        />
      </label>
    </>
  );

  const termsBox = (
    <label className="flex items-start gap-2.5 text-12 leading-relaxed text-muted">
      <input
        type="checkbox"
        name="terms"
        required
        className="mt-0.5 size-4 shrink-0 accent-ink"
      />
      <span>{t.terms}</span>
    </label>
  );

  const errorBox = error ? (
    <p
      role="alert"
      className="rounded-avatar bg-alert-bg px-3.5 py-3 text-14 font-semibold text-alert-fg"
    >
      {error}
    </p>
  ) : null;

  const payButton = (
    <button
      type="submit"
      disabled={pending}
      className="flex min-h-14 items-center justify-center gap-2.5 rounded-full bg-lilac px-6 text-16 font-bold text-ink focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink disabled:opacity-60"
    >
      {payLabel}
      <ArrowRight aria-hidden="true" className="size-4.5" strokeWidth={2} />
    </button>
  );

  const legend =
    "p-0 pb-3 font-display text-18 font-extrabold text-ink lg:text-20";

  return (
    <form action={formAction} className="contents">
      {/* Mobil: kortet överst. */}
      <GiftCardPreview
        size="md"
        theme={theme}
        photoUrl={photoUrl}
        businessName={businessName}
        label={t.cardLabel}
        amount={amountLabel}
        className="lg:hidden"
      />
      <div className="flex flex-col gap-3.5 lg:flex-row lg:items-start lg:gap-7">
        <section
          aria-label={t.steps.amount}
          className="flex min-w-0 flex-1 flex-col gap-4.5 rounded-card bg-surface p-5 lg:gap-7 lg:rounded-hero lg:p-8 lg:shadow-popover"
        >
          <fieldset className="flex flex-col gap-2.5 lg:gap-3">
            <legend className={legend}>
              <span className="lg:hidden">{t.stepsShort.amount}</span>
              <span className="hidden lg:inline">{t.steps.amount}</span>
            </legend>
            {amountButtons}
            {customField}
          </fieldset>
          <fieldset className="flex flex-col gap-2.5 lg:gap-3">
            <legend className={legend}>
              <span className="lg:hidden">{t.stepsShort.design}</span>
              <span className="hidden lg:inline">{t.steps.design}</span>
            </legend>
            {themeButtons}
          </fieldset>
          <fieldset className="flex flex-col gap-2.5 lg:gap-3.5">
            <legend className={legend}>
              <span className="lg:hidden">{t.stepsShort.to}</span>
              <span className="hidden lg:inline">{t.steps.to}</span>
            </legend>
            {recipientFields}
          </fieldset>
        </section>

        <aside className="flex flex-col gap-3.5 lg:sticky lg:top-6 lg:w-115 lg:shrink-0 lg:gap-4">
          <GiftCardPreview
            theme={theme}
            photoUrl={photoUrl}
            businessName={businessName}
            label={t.cardLabel}
            amount={amountLabel}
            to={to}
            footer={t.validUntil}
            className="hidden lg:flex"
          />
          <div className="flex flex-col gap-3.5 lg:rounded-card lg:bg-surface lg:p-5.5">
            {greeting.trim() ? (
              <p className="hidden text-14 leading-relaxed text-ink-soft italic lg:block">
                ”{greeting.trim()}”
              </p>
            ) : null}
            <dl className="hidden grid-cols-2 gap-2 border-t border-line-strong pt-3.5 text-14 lg:grid">
              <dt className="text-muted">{t.summary.send}</dt>
              <dd className="text-right">{sendLabel}</dd>
              <dt className="text-muted">{t.summary.toPay}</dt>
              <dd className="text-right font-extrabold">{amountLabel}</dd>
            </dl>
            {termsBox}
            {errorBox}
            {payButton}
            <div className="hidden flex-wrap justify-center gap-3.5 text-12 text-muted lg:flex">
              <span className="inline-flex items-center gap-1.5">
                <span className="inline-flex size-5.5 items-center justify-center rounded-full bg-lilac text-ink">
                  <Lock
                    aria-hidden="true"
                    className="size-3"
                    strokeWidth={2.4}
                  />
                </span>
                {t.summary.stripe}
              </span>
              <span className="inline-flex items-center gap-1.5">
                <span className="inline-flex size-5.5 items-center justify-center rounded-full bg-mint text-ink">
                  <Check
                    aria-hidden="true"
                    className="size-3"
                    strokeWidth={2.4}
                  />
                </span>
                {t.summary.withdrawal}
              </span>
            </div>
            <p className="text-center text-12 text-muted lg:hidden">
              {t.summary.mobileNote}
            </p>
          </div>
        </aside>
      </div>
    </form>
  );
}
