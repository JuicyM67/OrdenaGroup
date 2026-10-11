"use client";

// WP-67 (D-054): kortet på Skapa konto / Logga in (referens
// `docs/design/reference/marketplace/Registrera.dc.html`, riktning A) i
// inloggningssidans designspråk (ljust glaskort, lime rund knapp). Google
// (bara när `googleEnabled`), magisk länk via e-post, och en ALDRIG
// förkryssad ruta för erbjudanden. Apple är dold tills den finns (D-035).
import { AlertCircle, ArrowRight, MailCheck, UserRound } from "lucide-react";
import { useId, useState, type ReactNode } from "react";

import type { RequestMagicLinkResult } from "@/app/(auth)/login/actions";
import { authErrorText } from "@/components/auth/error-text";
import { TextField } from "@/components/ui/text-field";
import { cuenta } from "@/i18n";
import { Highlight } from "@/components/marketing/highlight";

type Estado =
  | { fase: "form" }
  | { fase: "enviando" }
  | { fase: "enviado"; email: string }
  | { fase: "error"; code: string };

export type SignInCardProps = {
  onRequestMagicLink: (input: {
    email: string;
    marketing: boolean;
  }) => Promise<RequestMagicLinkResult>;
  /** Server action för Google (formulär, fungerar utan JS). */
  googleAction?: (formData: FormData) => Promise<void>;
  googleEnabled: boolean;
  initialErrorCode?: string;
  /** E-post förifylld från landningssidan "För kunder" (`?email=`). */
  initialEmail?: string;
  /** Villkor + integritet, renderade av sidan (länkar per marknad). */
  legal: ReactNode;
  businessLink: ReactNode;
};

function GoogleMark() {
  // Enfärgat "G" i bläck: inga hexvärden i komponenter (regel 1). FRÅGA till
  // ägaren: Googles riktlinjer vill ha det fyrfärgade märket — kräver i så
  // fall fyra nya tokens i tokens.css + DESIGN.md.
  return (
    <svg
      viewBox="0 0 48 48"
      aria-hidden="true"
      className="size-5 shrink-0 fill-current text-ink"
    >
      <path d="M45 24.5c0-1.6-.1-3.1-.4-4.5H24v8.5h11.8a10 10 0 0 1-4.4 6.6v5.5h7.1C42.6 36.7 45 31.1 45 24.5zM24 46c5.9 0 10.9-2 14.5-5.3l-7.1-5.5c-2 1.3-4.5 2.1-7.4 2.1-5.7 0-10.5-3.8-12.2-9H4.5v5.7A22 22 0 0 0 24 46zM11.8 28.3a13 13 0 0 1 0-8.6V14H4.5a22 22 0 0 0 0 20zM24 10.7c3.2 0 6.1 1.1 8.4 3.3l6.3-6.3A22 22 0 0 0 4.5 14l7.3 5.7c1.7-5.2 6.5-9 12.2-9z" />
    </svg>
  );
}

export function SignInCard({
  onRequestMagicLink,
  googleAction,
  googleEnabled,
  initialErrorCode,
  initialEmail,
  legal,
  businessLink,
}: SignInCardProps) {
  const t = cuenta.ingresar;
  const [estado, setEstado] = useState<Estado>(
    initialErrorCode
      ? { fase: "error", code: initialErrorCode }
      : { fase: "form" },
  );
  const [email, setEmail] = useState(initialEmail ?? "");
  const [marketing, setMarketing] = useState(false);
  const emailId = useId();
  const marketingId = useId();

  async function submit() {
    setEstado({ fase: "enviando" });
    let result: RequestMagicLinkResult;
    try {
      result = await onRequestMagicLink({ email, marketing });
    } catch {
      result = { ok: false, code: "network" };
    }
    setEstado(
      result.ok
        ? { fase: "enviado", email }
        : { fase: "error", code: result.code },
    );
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
            {cuenta.enviado.titulo}
          </h1>
          <p className="text-16 leading-body text-ink-soft">
            {cuenta.enviado.texto({ email: estado.email })}
          </p>
        </div>
        <button
          type="button"
          onClick={() => setEstado({ fase: "form" })}
          className="self-start rounded-full text-14 font-semibold text-ink underline underline-offset-4 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink"
        >
          {cuenta.enviado.otroCorreo}
        </button>
      </section>
    );
  }

  const enviando = estado.fase === "enviando";
  const errorText =
    estado.fase === "error"
      ? estado.code === "oauth_failed"
        ? t.googleError
        : authErrorText(estado.code)
      : undefined;

  return (
    <section className="flex flex-col gap-5 rounded-card p-6 glass-light sm:p-8">
      <span
        aria-hidden="true"
        className="flex size-14 items-center justify-center rounded-full bg-staff-4 text-ink"
      >
        <UserRound className="size-6" strokeWidth={2} />
      </span>
      <h1 className="font-display text-30 leading-snug font-semibold tracking-title text-ink">
        {t.titulo}
        <Highlight>{t.destacado}</Highlight>
      </h1>

      {errorText ? (
        <p
          role="alert"
          className="flex items-start gap-2 rounded-control bg-alert-bg p-3 text-14 text-ink"
        >
          <AlertCircle
            aria-hidden="true"
            className="mt-0.5 size-4 shrink-0 text-alert"
            strokeWidth={2}
          />
          {errorText}
        </p>
      ) : null}

      {googleEnabled && googleAction ? (
        <>
          <form action={googleAction}>
            <input
              type="hidden"
              name="marketing"
              value={marketing ? "1" : "0"}
            />
            <button
              type="submit"
              className="flex h-14 w-full items-center justify-center gap-2.5 rounded-icon border border-border bg-surface text-15 font-bold text-ink transition-colors duration-150 ease-out hover:bg-field focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink"
            >
              <GoogleMark />
              {t.google}
            </button>
          </form>
          <div className="flex items-center gap-3 text-12 text-muted">
            <span aria-hidden="true" className="h-px flex-1 bg-border" />
            {t.separador}
            <span aria-hidden="true" className="h-px flex-1 bg-border" />
          </div>
        </>
      ) : null}

      <form
        className="flex flex-col gap-3"
        onSubmit={(e) => {
          e.preventDefault();
          void submit();
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
          label={t.emailLabel}
          placeholder={t.emailPlaceholder}
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        />
        <div className="flex items-start gap-2.5">
          <input
            id={marketingId}
            type="checkbox"
            checked={marketing}
            onChange={(e) => setMarketing(e.target.checked)}
            className="mt-0.5 size-5 shrink-0 accent-ink"
          />
          <label
            htmlFor={marketingId}
            className="text-13 leading-body text-ink-soft"
          >
            {t.marketing}
          </label>
        </div>
        <button
          type="submit"
          disabled={enviando}
          className="mt-1 flex h-13 items-center justify-between gap-3 rounded-full bg-lime pr-2 pl-6 text-16 font-bold text-ink transition-opacity duration-150 ease-out hover:opacity-90 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink disabled:opacity-40"
        >
          {enviando ? t.enviando : t.cta}
          <span
            aria-hidden="true"
            className="flex size-9.5 items-center justify-center rounded-full bg-ink text-lime"
          >
            <ArrowRight className="size-4.5" strokeWidth={2.5} />
          </span>
        </button>
      </form>
      <p className="text-12 leading-body text-muted">{legal}</p>
      <p className="text-13 font-semibold text-ink">{businessLink}</p>
    </section>
  );
}
