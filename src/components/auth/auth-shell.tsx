// Ram för inloggningen (rebrand): foto-hero i samma designspråk som startsidan. Desktop:
// fotot fyller hela ytan med mörk toning, varm rubrik och trygghetspunkter till vänster och
// ett ljust glaskort (children) till höger. Mobil: fotot som kort toppbild, kortet under.
// Serverkomponent; själva formuläret är den enda klientdelen.
import { ArrowLeft } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import type { ReactNode } from "react";

import { BrandLogo } from "@/components/marketing/brand-logo";
import { TrustRow } from "@/components/marketing/home/trust-row";
import { href } from "@/config/routes";
import { acceso } from "@/i18n/auth";
import { Highlight } from "@/components/marketing/highlight";

export function AuthShell({
  children,
  variant = "login",
}: {
  children: ReactNode;
  /** WP-83 (D-068): `registro` = /comenzar (nytt företag), `login` = /login.
   * `beta` = /comenzar och /app/beta under den stängda betan (src/config/beta.ts). */
  variant?: "login" | "registro" | "beta";
}) {
  const t =
    variant === "registro"
      ? acceso.registro
      : variant === "beta"
        ? acceso.beta
        : acceso.login;
  return (
    <div className="relative isolate min-h-dvh overflow-hidden bg-canvas text-on-dark lg:bg-dark">
      <div className="absolute inset-x-0 top-0 -z-10 h-80 lg:inset-y-0 lg:h-auto">
        <Image
          src="/marketing/hero.webp"
          alt=""
          fill
          priority
          sizes="100vw"
          className="object-cover object-hero-mobile lg:object-center"
        />
        <div
          aria-hidden="true"
          className="absolute inset-0 bg-photo-tint-mobile lg:bg-photo-tint"
        />
      </div>

      <div className="mx-auto flex min-h-dvh w-full max-w-360 flex-col px-4 pt-4 pb-8 sm:px-8 lg:px-22 lg:pt-8 lg:pb-12">
        <header className="flex items-center justify-between gap-3">
          <Link
            href={href("inicio")}
            className="flex h-11 items-center gap-2 rounded-full pr-5 pl-3.5 text-14 font-semibold whitespace-nowrap text-on-dark glass-nav transition-opacity duration-150 ease-out hover:opacity-90 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-lime"
          >
            <ArrowLeft
              className="size-4.5"
              strokeWidth={2.25}
              aria-hidden="true"
            />
            {acceso.login.volver}
          </Link>
          <Link
            href={href("inicio")}
            className="flex h-11 shrink-0 items-center rounded-full border border-surface/60 bg-surface/80 px-3 shadow-glass backdrop-blur-glass focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-lime"
          >
            <BrandLogo size="sm" decorative />
          </Link>
        </header>

        <div className="grid flex-1 items-center gap-8 pt-6 lg:grid-cols-2 lg:gap-16 lg:pt-0">
          <div className="flex flex-col gap-4 lg:max-w-140 lg:gap-6">
            <p className="font-display text-36 leading-display font-semibold tracking-hero text-balance sm:text-44 lg:text-54">
              {t.bienvenida.split(" ").slice(0, -1).join(" ")}
              <Highlight>{t.bienvenida.split(" ").slice(-1)[0]}</Highlight>
            </p>
            <p className="max-w-md text-16 leading-relaxed text-on-dark/90 sm:text-18">
              {t.bienvenidaTexto}
            </p>
            <TrustRow className="hidden lg:flex" />
          </div>

          <main className="w-full max-w-md justify-self-center lg:justify-self-end">
            {children}
          </main>
        </div>
      </div>
    </div>
  );
}
