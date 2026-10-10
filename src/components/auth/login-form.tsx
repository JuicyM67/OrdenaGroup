"use client";

// Formulär för inloggning med magisk länk (F1, WP-15). Ingen referens i *.dc.html
// (R1 för WP-03b-texterna, se es-CL.ts): formspråket återanvänder TextField/Button som i
// Reserva (WP-13). Bara e-post — koden på 6 siffror i `acceso.enviado` är inte byggd i den
// här slimmade versionen (se rapporten till WP-15).
//
// `onRequestMagicLink` tas emot som prop i stället för att importeras direkt (samma mönster
// som BookingScreen/[slug]/page.tsx, WP-13): page.tsx äger vilken server action som körs.
import { useId, useState } from "react";

import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { TextField } from "@/components/ui/text-field";
import { acceso } from "@/i18n/auth";

import type { RequestMagicLinkResult } from "@/app/(auth)/login/actions";

import { authErrorText } from "./error-text";

type Estado =
  | { fase: "form" }
  | { fase: "enviando" }
  | { fase: "enviado"; email: string }
  | { fase: "error"; email: string; code: string };

export type LoginFormProps = {
  onRequestMagicLink: (email: string) => Promise<RequestMagicLinkResult>;
  /** Fel från `/auth/confirm` (link/código vencido), lästa via `?error=` (WP-15). */
  initialErrorCode?: string;
  /** E-post förifylld från startsidan (`/login?email=`, WP-71). */
  initialEmail?: string;
};

export function LoginForm({
  onRequestMagicLink,
  initialErrorCode,
  initialEmail,
}: LoginFormProps) {
  const [estado, setEstado] = useState<Estado>(
    initialErrorCode
      ? { fase: "error", email: "", code: initialErrorCode }
      : { fase: "form" },
  );
  const [email, setEmail] = useState(initialEmail ?? "");
  const emailId = useId();

  if (estado.fase === "enviado") {
    return (
      <Card radius="card" padding="xl" className="flex flex-col gap-3">
        <h1 className="text-22 font-bold tracking-title text-ink">
          {acceso.enviado.titulo}
        </h1>
        <p className="text-15 text-ink-soft">
          {acceso.enviado.enviadoA({ email: estado.email })}
        </p>
        <Button
          type="button"
          variant="secondary"
          size="lg"
          onClick={() => setEstado({ fase: "form" })}
        >
          {acceso.enviado.usarOtroCorreo}
        </Button>
      </Card>
    );
  }

  async function submit(input: string) {
    setEstado({ fase: "enviando" });
    let result: RequestMagicLinkResult;
    try {
      result = await onRequestMagicLink(input);
    } catch {
      setEstado({ fase: "error", email: input, code: "network" });
      return;
    }
    if (result.ok) {
      setEstado({ fase: "enviado", email: input });
    } else {
      setEstado({ fase: "error", email: input, code: result.code });
    }
  }

  const enviando = estado.fase === "enviando";

  return (
    <Card
      as="section"
      radius="card"
      padding="xl"
      className="flex flex-col gap-5"
    >
      <div className="flex flex-col gap-1.5">
        <h1 className="text-22 font-bold tracking-title text-ink">
          {acceso.login.titulo}
        </h1>
        <p className="text-13 text-muted">{acceso.login.sinContrasena}</p>
      </div>
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
            estado.fase === "error" ? authErrorText(estado.code) : undefined
          }
        />
        <Button type="submit" size="xl" disabled={enviando}>
          {enviando ? acceso.login.enviando : acceso.login.cta}
        </Button>
      </form>
      <p className="text-13 text-muted">{acceso.login.cuentaNueva}</p>
    </Card>
  );
}
