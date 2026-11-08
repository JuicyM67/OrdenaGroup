// Stängd beta (src/config/beta.ts, ägarens beslut 2026-11-09): kortet som ersätter
// registreringen på /comenzar, och som ett konto utan företag ser på /app/beta. Samma
// ljusa glaskort som `LoginForm` (inuti `AuthShell variant="beta"`). Knappen öppnar ett
// mejl till hola@ (`invitacionMailto`, samma som startsidans beta-sektion), med adressen
// från startsidans e-postfält i texten om den finns. Serverkomponent, ingen klient-JS.
import { ArrowRight, Check, MailOpen, Ticket } from "lucide-react";
import Link from "next/link";

import { LOGIN_PATH } from "@/config/routes";
import { acceso } from "@/i18n/auth";
import { ajustes, nav } from "@/i18n";
import { invitacionMailto } from "@/lib/invitacion";

import { logout } from "@/app/auth/actions";

const t = acceso.beta;

const linkClass =
  "rounded-badge font-bold text-ink underline underline-offset-4 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink";

export function BetaInvitacion({
  email,
  sesionEmail,
}: {
  /** Följer med i mejlets text (startsidans e-postfält, eller kontots adress). */
  email?: string;
  /** Inloggad utan företag (/app/beta): visa kontot och "Cerrar sesión" i stället
   * för länken till /login. */
  sesionEmail?: string;
}) {
  return (
    <section className="flex flex-col gap-6 rounded-card p-6 glass-light sm:p-8">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <span
          aria-hidden="true"
          className="flex size-14 items-center justify-center rounded-full bg-lime text-ink"
        >
          <Ticket className="size-6" strokeWidth={2} />
        </span>
        <span className="flex w-fit items-center gap-2 rounded-chip bg-ink px-3 py-1.75 text-13 font-bold tracking-label text-on-dark">
          <span
            aria-hidden="true"
            className="size-2 animate-pulse rounded-full bg-lime"
          />
          {t.etiqueta}
        </span>
      </div>

      <div className="flex flex-col gap-2">
        <h1 className="font-display text-30 leading-snug font-semibold tracking-title text-balance text-ink">
          {t.cardTitulo}
        </h1>
        <p className="text-15 leading-body text-ink-soft">{t.cardTexto}</p>
      </div>

      <ul className="flex flex-col gap-2.5">
        {Object.values(t.puntos).map((punto) => (
          <li
            key={punto}
            className="flex items-center gap-3 text-14 font-semibold text-ink"
          >
            <span
              aria-hidden="true"
              className="flex size-7 shrink-0 items-center justify-center rounded-full bg-surface"
            >
              <Check className="size-3.5" strokeWidth={2.5} />
            </span>
            {punto}
          </li>
        ))}
      </ul>

      <div className="flex flex-col gap-2">
        <a
          href={invitacionMailto(email ?? sesionEmail)}
          className="flex h-13 items-center justify-between gap-3 rounded-full bg-lime pr-2 pl-6 text-16 font-bold text-ink transition-opacity duration-150 ease-out hover:opacity-90 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink"
        >
          {t.cta}
          <span
            aria-hidden="true"
            className="flex size-9.5 items-center justify-center rounded-full bg-ink text-lime"
          >
            <ArrowRight className="size-4.5" strokeWidth={2.5} />
          </span>
        </a>
        <p className="text-13 leading-body text-muted">{t.nota}</p>
      </div>

      <div className="flex flex-col gap-3 border-t border-border pt-5 text-14 leading-body">
        <p className="flex items-start gap-2.5 text-ink-soft">
          <MailOpen
            aria-hidden="true"
            className="mt-0.5 size-4 shrink-0 text-ink"
            strokeWidth={2}
          />
          {t.yaInvitado}
        </p>
        {sesionEmail ? (
          <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-muted">
            <span className="min-w-0 break-all">
              {ajustes.cuenta.sesionComo({ email: sesionEmail })}
            </span>
            <form action={logout}>
              <button type="submit" className={linkClass}>
                {nav.cerrarSesion}
              </button>
            </form>
          </div>
        ) : (
          <p className="text-muted">
            {t.cuentaPregunta}{" "}
            <Link href={LOGIN_PATH} className={linkClass}>
              {t.cuentaLink}
            </Link>
          </p>
        )}
      </div>
    </section>
  );
}
