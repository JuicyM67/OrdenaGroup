// Ny hero (WP-71, ägarens valda design "Foto-berättelse", Konv1.dc.html): helbildsfoto på
// ett behandlingsrum med varm toning, glas-pill med roterande bransch, rubrik, e-postfält,
// trygghetsrad, tre flytande glaskort till höger och en USP-karusell längst ner. Den
// delade headern (`SiteHeader`) ligger ovanpå fotot (se `page.tsx`). Mobil: en kolumn, ett
// flytande kort och en kompakt karusell.
import { Globe, Lock, MessageCircle, type LucideIcon } from "lucide-react";
import Image from "next/image";

import { copy } from "@/i18n/marketing";

import { EmailForm } from "./email-form";
import { FloatCards } from "./float-cards";
import { UspMarquee } from "./usp-marquee";
import { WordPill } from "./word-pill";

const t = copy.home.hero;

// Samma pasteller som personalens initialcirklar i bokningssidan.
const TRUST_TONES: Record<string, string> = {
  pago: "bg-staff-1",
  datos: "bg-staff-5",
  soporte: "bg-staff-4",
};

const TRUST_ICONS: Record<string, LucideIcon> = {
  pago: Lock,
  datos: Globe,
  soporte: MessageCircle,
};

export function TrustRow({ className }: { className?: string }) {
  return (
    <ul
      className={`flex flex-wrap gap-x-5 gap-y-2 text-13 font-semibold text-on-dark/95 ${className ?? ""}`}
    >
      {copy.home.confianza.map((c) => {
        const Icon = TRUST_ICONS[c.id] ?? Lock;
        return (
          <li key={c.id} className="flex items-center gap-2">
            <span
              className={`flex size-7 flex-none items-center justify-center rounded-full text-ink ${TRUST_TONES[c.id] ?? "bg-staff-2"}`}
            >
              <Icon className="size-3.5" strokeWidth={2} aria-hidden="true" />
            </span>
            {c.texto}
          </li>
        );
      })}
    </ul>
  );
}

export function HomeHero() {
  return (
    <section className="relative -mt-26 flex flex-col overflow-hidden bg-dark text-on-dark lg:min-h-217">
      <Image
        src="/marketing/hero.webp"
        alt={t.fotoAlt}
        fill
        priority
        sizes="100vw"
        className="object-cover object-hero-mobile lg:object-center"
      />
      <div
        aria-hidden="true"
        className="absolute inset-0 bg-photo-tint-mobile lg:bg-photo-tint"
      />

      <div className="relative mx-auto flex w-full max-w-360 flex-1 flex-col px-4 pt-32 pb-8 sm:px-8 lg:px-22 lg:pt-36 lg:pb-56">
        <div className="flex flex-col gap-5.5 lg:max-w-175">
          <WordPill prefijo={t.prefijo} palabras={t.industrias} />
          <h1 className="font-display text-44 leading-display font-semibold tracking-hero text-balance sm:text-56 lg:text-68">
            {t.tituloLinea1}
            <br />
            {t.tituloPre}{" "}
            <span className="rounded-highlight bg-lime box-decoration-clone px-2.5 whitespace-nowrap text-ink">
              {t.tituloMarca}
            </span>
          </h1>
          <p className="max-w-xl text-16 leading-relaxed text-on-dark/90 sm:text-18">
            {t.texto}
          </p>
          <EmailForm id="hero-email" tone="nav" />
          <TrustRow />
          <div className="mt-2 lg:hidden">
            <FloatCards variant="mobile" />
          </div>
        </div>
      </div>

      <div className="pointer-events-none absolute inset-0 mx-auto hidden max-w-360 lg:block">
        <FloatCards variant="desktop" />
      </div>

      <UspMarquee className="relative pb-6 lg:absolute lg:inset-x-0 lg:bottom-6 lg:pb-0" />
    </section>
  );
}
