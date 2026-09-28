// "Horas flash": sektion med fotobakgrund (WP-hemsida, mappad från
// `.visual-diff/ref/sida-v1-bento.html`, sektionen med klassen `.p2`). Ersätter den tidigare
// flash-sektionen i page.tsx (ren `FlashMockup`-kort utan foto). `hero-salong.webp` här
// eftersom `bento-salon.webp` redan används i por-que-bento.tsx (se uppdragets regel "välj
// den som inte krockar"). Mörk gradient från vänster (`bg-gradient-to-r`) så texten är
// läsbar ovanpå fotot, `FlashMockup` (glaskort) till höger.
import { Check, Zap } from "lucide-react";
import Image from "next/image";

import { strokeCard } from "@/components/ui/icons";
import { copy } from "@/i18n/marketing";

import { FlashMockup } from "./flash-mockup";

const FLASH = copy.sitio.inicio.flash;

const PUNTOS = [FLASH.puntos.punto1, FLASH.puntos.punto2, FLASH.puntos.punto3];

export function FlashBand() {
  return (
    <section
      id="horas-flash"
      className="mx-auto max-w-6xl scroll-mt-24 px-4 py-10 sm:px-8 sm:py-14"
    >
      <div className="relative overflow-hidden rounded-hero">
        <Image
          src="/images/sitio/hero-salong.webp"
          alt=""
          fill
          sizes="(min-width: 1024px) 1152px, 100vw"
          className="object-cover"
        />
        <div
          aria-hidden="true"
          className="absolute inset-0 bg-gradient-to-r from-ink/95 via-ink/70 to-ink/10"
        />
        <div className="relative grid gap-8 p-8 sm:p-10 lg:min-h-110 lg:grid-cols-2 lg:items-center lg:p-14">
          <div className="flex flex-col gap-4">
            <span className="inline-flex w-fit items-center gap-1.5 rounded-full bg-lime px-3.5 py-1.5 text-13 font-bold tracking-caps text-ink uppercase">
              <Zap
                aria-hidden="true"
                className="size-3.5"
                strokeWidth={strokeCard}
              />
              {FLASH.etiqueta}
            </span>
            <h2 className="max-w-lg font-display text-32 leading-hero font-semibold tracking-display text-on-dark sm:text-40">
              {FLASH.titulo}
            </h2>
            <p className="max-w-md text-16 leading-relaxed text-on-dark-soft">
              {FLASH.texto}
            </p>
            <ul className="mt-2 flex flex-col gap-2">
              {PUNTOS.map((punto) => (
                <li
                  key={punto}
                  className="flex items-start gap-2 text-14 text-on-dark"
                >
                  <Check
                    aria-hidden="true"
                    className="mt-0.5 size-4 shrink-0 text-on-dark-muted"
                    strokeWidth={2.4}
                  />
                  {punto}
                </li>
              ))}
            </ul>
          </div>
          <FlashMockup />
        </div>
      </div>
    </section>
  );
}
