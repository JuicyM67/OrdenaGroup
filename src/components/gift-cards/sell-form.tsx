"use client";

// WP-87 (D-073): Caja → Tarjetas de regalo → "Vender tarjeta de regalo".
// Kunden betalar i salongen; formuläret registrerar försäljningen med
// metoden (efectivo/débito o crédito/transferencia). Valfritt: mottagare,
// hälsning och köpare (med e-post skickas kortet/kvittot via utkorgen).
// Efteråt visas kortet, koden och länken "Ver e imprimir" EN gång.
import Link from "next/link";
import { useActionState, useState } from "react";

import { Pill } from "@/components/ui/pill";
import { TextField } from "@/components/ui/text-field";
import { Textarea } from "@/components/ui/textarea";
import {
  GIFT_CARD_GREETING_MAX,
  GIFT_CARD_MAX_CLP,
  GIFT_CARD_MIN_CLP,
  GIFT_CARD_NAME_MAX,
  GIFT_CARD_PRESETS_CLP,
  GIFT_CARD_SALE_METHODS,
  GIFT_CARD_THEMES,
  type GiftCardSaleMethod,
  type GiftCardTheme,
} from "@/config/gift-cards";
import { caja, regalo } from "@/i18n";
import { formatMoney, parseMoney } from "@/lib/format/money";

import { GiftCardPreview } from "./gift-card-preview";
import type { SellState } from "./types";

const t = regalo.caja.vender;

const EMPTY_FIELDS = {
  recipientName: "",
  recipientEmail: "",
  greeting: "",
  buyerName: "",
  buyerEmail: "",
};

export function GiftCardSellForm({
  action,
  businessName,
  validityMonths,
}: {
  action: (prev: SellState, fd: FormData) => Promise<SellState>;
  businessName: string;
  validityMonths: number;
}) {
  const [state, formAction, pending] = useActionState(action, {
    status: "idle",
  } as SellState);
  const [preset, setPreset] = useState<number | "custom">(
    GIFT_CARD_PRESETS_CLP[1] ?? GIFT_CARD_MIN_CLP,
  );
  const [custom, setCustom] = useState("");
  const [method, setMethod] = useState<GiftCardSaleMethod>("cash");
  const [theme, setTheme] = useState<GiftCardTheme>("lilac");
  // Kontrollerade fält: React nollställer annars formuläret efter varje
  // anrop, även när servern svarar med ett fel.
  const [fields, setFields] = useState(EMPTY_FIELDS);
  const field = (k: keyof typeof EMPTY_FIELDS) => ({
    name: k,
    value: fields[k],
    onChange: (e: { target: { value: string } }) =>
      setFields((f) => ({ ...f, [k]: e.target.value })),
  });
  const [dismissed, setDismissed] = useState<SellState | null>(null);

  const parsedCustom = parseMoney(custom);
  const amount =
    preset === "custom" ? (parsedCustom.ok ? parsedCustom.value : 0) : preset;
  const validAmount =
    amount >= GIFT_CARD_MIN_CLP && amount <= GIFT_CARD_MAX_CLP;

  if (state.status === "done" && dismissed !== state) {
    return (
      <section
        aria-labelledby="tr-sell-h"
        className="flex flex-col gap-4.5 rounded-card bg-surface p-5 lg:p-6.5"
      >
        <h2 id="tr-sell-h" className="font-display text-22 font-extrabold">
          {t.listo({ monto: state.amountLabel })}
        </h2>
        <GiftCardPreview
          theme={state.theme}
          businessName={businessName}
          label={regalo.tarjeta.etiqueta}
          amount={state.amountLabel}
          to={
            state.recipient
              ? regalo.tarjeta.para({ nombre: state.recipient })
              : undefined
          }
          footer={state.expiresLabel}
          size="md"
        />
        <div className="flex flex-col gap-1.5">
          <span className="text-13 text-muted">{t.codigo}</span>
          <span className="self-start rounded-avatar border-2 border-dashed border-border px-4 py-3 font-mono text-24 font-bold tracking-caps">
            {state.code}
          </span>
        </div>
        <p className="text-14 text-ink-soft">
          {state.emailed ? t.correos : t.sinCorreo} {t.codigoUnaVez}
        </p>
        <div className="flex flex-wrap gap-2.5">
          <Link
            href={state.cardHref}
            target="_blank"
            rel="noreferrer"
            className="inline-flex min-h-12 items-center rounded-full bg-ink px-5.5 font-bold text-on-dark focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink"
          >
            {t.verImprimir}
          </Link>
          <button
            type="button"
            onClick={() => {
              setDismissed(state);
              setFields(EMPTY_FIELDS);
              setCustom("");
            }}
            className="inline-flex min-h-12 items-center rounded-full border-2 border-border bg-surface px-5.5 font-bold text-ink focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink"
          >
            {t.otra}
          </button>
        </div>
      </section>
    );
  }

  return (
    <section
      aria-labelledby="tr-sell-h"
      className="flex flex-col gap-4.5 rounded-card bg-surface p-5 lg:p-6.5"
    >
      <div className="flex flex-col gap-1">
        <h2 id="tr-sell-h" className="font-display text-22 font-extrabold">
          {t.titulo}
        </h2>
        <p className="text-14 text-muted">
          {t.bajada({ meses: validityMonths })}
        </p>
      </div>
      <form action={formAction} className="flex flex-col gap-4.5">
        <input
          type="hidden"
          name="amount"
          value={preset === "custom" ? "custom" : String(preset)}
        />
        <input type="hidden" name="method" value={method} />
        <input type="hidden" name="theme" value={theme} />

        <fieldset className="flex flex-col gap-2">
          <legend className="mb-2 text-13 font-semibold text-ink">
            {t.monto}
          </legend>
          <div className="flex flex-wrap gap-2">
            {GIFT_CARD_PRESETS_CLP.map((v) => (
              <Pill
                key={v}
                selected={preset === v}
                onClick={() => setPreset(v)}
                className="border border-border"
              >
                {formatMoney(v)}
              </Pill>
            ))}
            <Pill
              selected={preset === "custom"}
              onClick={() => setPreset("custom")}
              className="border border-border"
            >
              {t.otro}
            </Pill>
          </div>
          {preset === "custom" ? (
            <TextField
              name="customAmount"
              label={t.otroLabel({
                min: formatMoney(GIFT_CARD_MIN_CLP),
                max: formatMoney(GIFT_CARD_MAX_CLP),
              })}
              inputMode="numeric"
              autoComplete="off"
              value={custom}
              onChange={(e) => setCustom(e.target.value)}
            />
          ) : null}
        </fieldset>

        <fieldset className="flex flex-col gap-2">
          <legend className="mb-2 text-13 font-semibold text-ink">
            {t.metodo}
          </legend>
          <div className="flex flex-wrap gap-2">
            {GIFT_CARD_SALE_METHODS.map((m) => (
              <Pill
                key={m}
                selected={method === m}
                onClick={() => setMethod(m)}
                className="border border-border"
              >
                {caja.metodo[m]}
              </Pill>
            ))}
          </div>
        </fieldset>

        <fieldset className="flex flex-col gap-2">
          <legend className="mb-2 text-13 font-semibold text-ink">
            {t.diseno}
          </legend>
          <div className="flex flex-wrap gap-2">
            {GIFT_CARD_THEMES.map((th) => (
              <Pill
                key={th}
                selected={theme === th}
                onClick={() => setTheme(th)}
                className="border border-border"
              >
                {t.temas[th]}
              </Pill>
            ))}
          </div>
        </fieldset>

        <fieldset className="flex flex-col gap-3">
          <legend className="mb-1 text-15 font-bold text-ink">
            {t.paraQuien}
          </legend>
          <TextField
            {...field("recipientName")}
            label={t.destinatario}
            maxLength={GIFT_CARD_NAME_MAX}
            autoComplete="off"
          />
          <TextField
            {...field("recipientEmail")}
            type="email"
            label={t.destinatarioEmail}
            hint={t.destinatarioEmailAyuda}
            autoComplete="off"
          />
          <Textarea
            {...field("greeting")}
            label={t.saludo}
            hint={t.saludoAyuda}
            maxLength={GIFT_CARD_GREETING_MAX}
          />
        </fieldset>

        <fieldset className="flex flex-col gap-3">
          <legend className="mb-1 text-15 font-bold text-ink">
            {t.comprador}
          </legend>
          <TextField
            {...field("buyerName")}
            label={t.compradorNombre}
            maxLength={GIFT_CARD_NAME_MAX}
            autoComplete="off"
          />
          <TextField
            {...field("buyerEmail")}
            type="email"
            label={t.compradorEmail}
            hint={t.compradorEmailAyuda}
            autoComplete="off"
          />
        </fieldset>

        {state.status === "error" ? (
          <p
            role="alert"
            className="rounded-avatar bg-alert-bg px-3.5 py-3 text-14 font-semibold text-alert-fg"
          >
            {state.message}
          </p>
        ) : null}

        <button
          type="submit"
          disabled={pending || !validAmount}
          className="min-h-13.5 rounded-full bg-lime px-6 text-16 font-bold text-ink focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink disabled:opacity-60"
        >
          {validAmount ? t.cta({ monto: formatMoney(amount) }) : t.ctaSinMonto}
        </button>
      </form>
    </section>
  );
}
