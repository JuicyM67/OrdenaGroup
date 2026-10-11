// Ny hero (WP-71, ägarens valda design "Foto-berättelse", Konv1.dc.html): helbildsfoto på
// ett behandlingsrum med varm toning, glas-pill med roterande bransch, rubrik, e-postfält,
// trygghetsrad, tre flytande glaskort till höger och en USP-karusell längst ner. Den
// delade headern (`SiteHeader`) ligger ovanpå fotot (se `page.tsx`). Mobil: en kolumn, ett
// flytande kort och en kompakt karusell.
import Image from "next/image";

import { copy } from "@/i18n/marketing";

import { EmailForm } from "./email-form";
import { FloatCards } from "./float-cards";
import { TrustRow } from "./trust-row";
import { UspMarquee } from "./usp-marquee";
import { WordPill } from "./word-pill";
import { Highlight } from "@/components/marketing/highlight";

const t = copy.home.hero;

export { TrustRow };

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
            {t.tituloPre}
            <Highlight>{t.tituloMarca}</Highlight>
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
