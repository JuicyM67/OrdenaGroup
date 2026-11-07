"use client";

// Formulär för inloggning med magisk länk (F1, WP-15), omgjort som ljust glaskort i
// startsidans designspråk (rebrand). Ingen referens i *.dc.html: TextField som i Reserva,
// lime rund knapp som i startsidans EmailForm. WP-96: efter utskicket kan koden från
// mejlet skrivas in (`CodeEntry`) — länken i mejlet fungerar som förut.
//
// `onRequestMagicLink` tas emot som prop i stället för att importeras direkt (samma mönster
// som BookingScreen/[slug]/page.tsx, WP-13): page.tsx äger vilken server action som körs.
import {
  AlertCircle,
  ArrowRight,
  Mail,
  MailCheck,
  Sparkles,
} from "lucide-react";
import Link from "next/link";
import { useId, useState } from "react";

import { cn } from "@/components/ui/cn";
import { TextField } from "@/components/ui/text-field";
import { LOGIN_PATH, SIGNUP_PATH } from "@/config/routes";
import { acceso } from "@/i18n/auth";

import type { RequestMagicLinkResult } from "@/app/(auth)/login/actions";
import type { VerifyEmailCodeResult } from "@/app/auth/code-actions";

import { CodeEntry } from "./code-entry";
import { authErrorText } from "./error-text";

type Estado =
  | { fase: "form" }
  | { fase: "enviando" }
  | { fase: "enviado"; email: string; reenviado: boolean }
  | { fase: "error"; email: string; code: string };

export type LoginFormProps = {
  onRequestMagicLink: (email: string) => Promise<RequestMagicLinkResult>;
  /** WP-96: verifierar koden från mejlet (server action från page.tsx). */
  onVerifyCode: (email: string, code: string) => Promise<VerifyEmailCodeResult>;
  /** Fel från `/auth/confirm` (link/código vencido), lästa via `?error=` (WP-15). */
  initialErrorCode?: string;
  /** E-post förifylld från startsidan (`/login?email=`, WP-71). */
  initialEmail?: string;
  /** WP-83 (D-068): `registro` = /comenzar (nytt företag). Samma mejl (kod + länk). */
  variant?: "login" | "registro";
};

export function LoginForm({
  onRequestMagicLink,
  onVerifyCode,
  initialErrorCode,
  initialEmail,
  variant = "login",
}: LoginFormProps) {
  const registro = variant === "registro";
  const [estado, setEstado] = useState<Estado>(
    initialErrorCode
      ? { fase: "error", email: "", code: initialErrorCode }
      : { fase: "form" },
  );
  const [email, setEmail] = useState(initialEmail ?? "");
  const emailId = useId();
  const [reenviando, setReenviando] = useState(false);

  async function submit(input: string, reenvio = false) {
    if (reenvio) setReenviando(true);
    else setEstado({ fase: "enviando" });
    let result: RequestMagicLinkResult;
    try {
      result = await onRequestMagicLink(input);
    } catch {
      result = { ok: false, code: "network" };
    }
    setReenviando(false);
    if (result.ok) {
      setEstado({ fase: "enviado", email: input, reenviado: reenvio });
    } else {
      setEmail(input);
      setEstado({ fase: "error", email: input, code: result.code });
    }
  }

  if (estado.fase === "enviado") {
    return (
      <section className="flex flex-col gap-5 rounded-card p-6 glass-light sm:p-8">
        <span
          aria-hidden="true"
          className="flex size-14 items-center justify-center rounded-full bg-staff-3 text-ink"
        >
          <MailCheck className="size-6" strokeWidth={2} />
        </span>
        <div className="flex flex-col gap-2">
          <h1 className="font-display text-30 leading-snug font-semibold tracking-title text-ink">
            {acceso.enviado.tituloBandeja}
          </h1>
          <p className="text-16 leading-body text-ink-soft">
            {acceso.enviado.enviadoA({ email: estado.email })}
          </p>
        </div>
        <CodeEntry email={estado.email} onVerifyCode={onVerifyCode} />
        <div className="flex flex-col gap-3 rounded-tile bg-surface/70 p-4">
          <p className="text-14 font-semibold text-ink">
            {acceso.enviado.sinCorreo}
          </p>
          <p className="text-13 leading-body text-muted">
            {acceso.enviado.sinCorreoAyuda}
          </p>
          <button
            type="button"
            disabled={reenviando}
            onClick={() => void submit(estado.email, true)}
            className="h-11 self-start rounded-full border border-border bg-surface px-5 text-14 font-semibold text-ink transition-colors duration-150 ease-out hover:bg-field focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink disabled:opacity-40"
          >
            {reenviando ? acceso.login.enviando : acceso.enviado.reenviar}
          </button>
          <p role="status" className="text-13 font-semibold text-ink">
            {estado.reenviado ? acceso.enviado.reenviado : null}
          </p>
        </div>
        <button
          type="button"
          onClick={() => setEstado({ fase: "form" })}
          className="self-start rounded-full text-14 font-semibold text-ink underline underline-offset-4 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink"
        >
          {acceso.enviado.usarOtroCorreo}
        </button>
      </section>
    );
  }

  const enviando = estado.fase === "enviando";
  // Fel från /auth/confirm (utgången länk): egen ruta ovanför fältet.
  const bannerError =
    initialErrorCode && estado.fase === "error" && estado.email === ""
      ? authErrorText(estado.code)
      : undefined;

  return (
    <section className="flex flex-col gap-6 rounded-card p-6 glass-light sm:p-8">
      <span
        aria-hidden="true"
        className={cn(
          "flex size-14 items-center justify-center rounded-full text-ink",
          registro ? "bg-lime" : "bg-staff-4",
        )}
      >
        {registro ? (
          <Sparkles className="size-6" strokeWidth={2} />
        ) : (
          <Mail className="size-6" strokeWidth={2} />
        )}
      </span>
      <div className="flex flex-col gap-2">
        <h1 className="font-display text-30 leading-snug font-semibold tracking-title text-ink">
          {registro ? acceso.registro.cardTitulo : acceso.login.cardTitulo}
        </h1>
        <p className="text-15 leading-body text-ink-soft">
          {registro ? acceso.registro.cardTexto : acceso.login.cardTexto}
        </p>
      </div>
      {registro ? (
        <ol className="flex flex-col gap-2.5">
          {Object.values(acceso.registro.pasos).map((paso, i) => (
            <li
              key={paso}
              className="flex items-center gap-3 text-14 font-semibold text-ink"
            >
              <span
                aria-hidden="true"
                className="flex size-7 shrink-0 items-center justify-center rounded-full bg-surface text-13 font-bold"
              >
                {i + 1}
              </span>
              {paso}
            </li>
          ))}
        </ol>
      ) : null}
      {bannerError ? (
        <p
          role="alert"
          className="flex items-start gap-2 rounded-control bg-alert-bg p-3 text-14 text-ink"
        >
          <AlertCircle
            aria-hidden="true"
            className="mt-0.5 size-4 shrink-0 text-alert"
            strokeWidth={2}
          />
          {bannerError}
        </p>
      ) : null}
      <form
        className="flex flex-col gap-4"
        onSubmit={(e) => {
          e.preventDefault();
          void submit(email);
        }}
      >
        <TextField
          id={emailId}
          type="email"
          name="email"
          autoComplete="email"
          inputMode="email"
          required
          disabled={enviando}
          label={acceso.login.emailLabel}
          placeholder={acceso.login.emailPlaceholder}
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          error={
            estado.fase === "error" && !bannerError
              ? authErrorText(estado.code)
              : undefined
          }
        />
        <button
          type="submit"
          disabled={enviando}
          className="flex h-13 items-center justify-between gap-3 rounded-full bg-lime pr-2 pl-6 text-16 font-bold text-ink transition-opacity duration-150 ease-out hover:opacity-90 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink disabled:opacity-40"
        >
          {enviando
            ? acceso.login.enviando
            : registro
              ? acceso.registro.cta
              : acceso.login.cta}
          <span
            aria-hidden="true"
            className="flex size-9.5 items-center justify-center rounded-full bg-ink text-lime"
          >
            <ArrowRight className="size-4.5" strokeWidth={2.5} />
          </span>
        </button>
      </form>
      <p className="text-14 text-muted">
        {registro ? acceso.registro.cuentaPregunta : acceso.login.nuevoPregunta}{" "}
        <Link
          href={registro ? LOGIN_PATH : SIGNUP_PATH}
          className="rounded-badge font-bold text-ink underline underline-offset-4 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink"
        >
          {registro ? acceso.registro.cuentaLink : acceso.login.nuevoLink}
        </Link>
      </p>
    </section>
  );
}
