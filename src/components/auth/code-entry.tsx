"use client";

// WP-83 (D-068, BookingBuddy WP-96): fältet för koden från inloggningsmejlet
// (mejlet visar en kod, `{{ .Token }}` i supabase/templates/es-CL/). Används av
// företagets inloggning (`LoginForm`, /login och /comenzar) och kundkontot
// (`SignInCard`). Servern verifierar och svarar med målet; vi navigerar med
// en hel sidladdning så att sessionens cookies följer med.
import { ArrowRight } from "lucide-react";
import { useId, useState } from "react";

import { TextField } from "@/components/ui/text-field";
import { acceso } from "@/i18n/auth";

import type { VerifyEmailCodeResult } from "@/app/auth/code-actions";

import { authErrorText } from "./error-text";

export type CodeEntryProps = {
  email: string;
  onVerifyCode: (email: string, code: string) => Promise<VerifyEmailCodeResult>;
  /** Testbart: standard är en hel sidladdning till målet. */
  onSignedIn?: (to: string) => void;
};

export function CodeEntry({ email, onVerifyCode, onSignedIn }: CodeEntryProps) {
  const id = useId();
  const [code, setCode] = useState("");
  const [enviando, setEnviando] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit() {
    setEnviando(true);
    setError(null);
    let result: VerifyEmailCodeResult;
    try {
      result = await onVerifyCode(email, code);
    } catch {
      result = { ok: false, code: "network" };
    }
    if (result.ok) {
      (onSignedIn ?? ((to: string) => window.location.assign(to)))(result.to);
      return;
    }
    setEnviando(false);
    setError(authErrorText(result.code));
  }

  return (
    <form
      className="flex flex-col gap-3"
      onSubmit={(e) => {
        e.preventDefault();
        void submit();
      }}
    >
      <TextField
        id={id}
        name="code"
        autoComplete="one-time-code"
        inputMode="numeric"
        maxLength={12}
        required
        disabled={enviando}
        label={acceso.codigo.label}
        placeholder={acceso.codigo.placeholder}
        value={code}
        onChange={(e) => setCode(e.target.value.replace(/[^\d ]/g, ""))}
        error={error ?? undefined}
        inputClassName="text-20 font-bold tracking-label"
      />
      <button
        type="submit"
        disabled={enviando || code.replace(/\s/g, "").length < 6}
        className="flex h-13 items-center justify-between gap-3 rounded-full bg-lime pr-2 pl-6 text-16 font-bold text-ink transition-opacity duration-150 ease-out hover:opacity-90 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink disabled:opacity-40"
      >
        {enviando ? acceso.codigo.verificando : acceso.codigo.cta}
        <span
          aria-hidden="true"
          className="flex size-9.5 items-center justify-center rounded-full bg-ink text-lime"
        >
          <ArrowRight className="size-4.5" strokeWidth={2.5} />
        </span>
      </button>
      <p className="text-13 text-muted">{acceso.codigo.oLink}</p>
    </form>
  );
}
