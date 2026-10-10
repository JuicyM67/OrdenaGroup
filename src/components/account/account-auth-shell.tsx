// WP-67 (D-054): ram för Skapa konto / Logga in för kunder. Samma designspråk
// som företagens inloggning (`components/auth/auth-shell.tsx`): foto-hero med
// mörk toning, glas-navet, ljust glaskort (children) till höger. Vänster:
// löftet och fyra fördelar (referensens mörka ruta, `Registrera.dc.html`) som
// runda ikoncirklar. Serverkomponent.
import {
  CalendarCheck,
  Heart,
  History,
  Star,
  X,
  type LucideIcon,
} from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import type { ReactNode } from "react";

import { BrandLogo } from "@/components/marketing/brand-logo";
import { href } from "@/config/routes";
import { cuenta } from "@/i18n";

const BENEFITS: readonly {
  key: keyof typeof cuenta.ingresar.beneficios;
  icon: LucideIcon;
  tint: string;
}[] = [
  { key: "gestionar", icon: CalendarCheck, tint: "bg-staff-1" },
  { key: "historial", icon: History, tint: "bg-staff-2" },
  { key: "favoritos", icon: Heart, tint: "bg-staff-3" },
  { key: "resenas", icon: Star, tint: "bg-staff-4" },
];

export function AccountAuthShell({ children }: { children: ReactNode }) {
  const t = cuenta.ingresar;
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
            className="flex h-11 shrink-0 items-center rounded-full border border-surface/60 bg-surface/80 px-3 shadow-glass backdrop-blur-glass focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-lime"
          >
            <BrandLogo size="sm" badge decorative className="max-sm:hidden" />
            <BrandLogo
              variant="mark"
              size="sm"
              badge
              decorative
              className="sm:hidden"
            />
          </Link>
          <Link
            href={href("inicio")}
            aria-label={t.cerrar}
            className="flex size-11 items-center justify-center rounded-full text-on-dark glass-nav transition-opacity duration-150 ease-out hover:opacity-90 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-lime"
          >
            <X className="size-4.5" strokeWidth={2.25} aria-hidden="true" />
          </Link>
        </header>

        <div className="grid flex-1 items-center gap-8 pt-6 lg:grid-cols-2 lg:gap-16 lg:pt-0">
          <div className="flex flex-col gap-5 lg:max-w-140 lg:gap-7">
            <p className="font-display text-36 leading-display font-semibold tracking-hero text-balance sm:text-44 lg:text-54">
              {t.texto}
            </p>
            <ul className="grid grid-cols-2 gap-3 rounded-card p-4 glass-dark sm:gap-4 sm:p-5">
              {BENEFITS.map(({ key, icon: Icon, tint }) => (
                <li
                  key={key}
                  className="flex items-center gap-3 text-13 leading-snug font-semibold text-on-dark sm:text-14"
                >
                  <span
                    aria-hidden="true"
                    className={`flex size-10 shrink-0 items-center justify-center rounded-full text-ink ${tint}`}
                  >
                    <Icon className="size-4.5" strokeWidth={2} />
                  </span>
                  {t.beneficios[key]}
                </li>
              ))}
            </ul>
          </div>

          <main className="w-full max-w-md justify-self-center lg:justify-self-end">
            {children}
          </main>
        </div>
      </div>
    </div>
  );
}
