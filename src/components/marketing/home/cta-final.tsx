// Sektion 9: avslutande CTA över foto med e-postfält (WP-71, SidaP3.dc.html).
import Image from "next/image";

import { copy } from "@/i18n/marketing";

import { EmailForm } from "./email-form";
import { TrustRow } from "./hero";

const t = copy.home.cta;

export function CtaFinal() {
  return (
    <section className="bg-canvas px-4 pb-16 lg:px-22 lg:pb-30">
      <div className="relative mx-auto flex min-h-95 max-w-360 flex-col justify-center overflow-hidden rounded-cta px-6 py-14 text-on-dark sm:px-10 lg:px-18 lg:py-22.5">
        <Image
          src="/marketing/hero.webp"
          alt=""
          fill
          sizes="(min-width: 1440px) 1360px, 100vw"
          className="object-cover object-right"
        />
        <div
          aria-hidden="true"
          className="absolute inset-0 bg-cta-tint-mobile lg:bg-cta-tint"
        />
        <div className="relative flex max-w-150 flex-col gap-5.5">
          <h2 className="font-display text-44 leading-none font-semibold tracking-headline sm:text-60">
            {t.tituloPre}
            <br />
            <span className="rounded-highlight bg-lime box-decoration-clone px-2.5 text-ink">
              {t.tituloMarca}
            </span>
          </h2>
          <p className="text-16 leading-relaxed text-on-dark/90 sm:text-18">
            {t.texto}
          </p>
          <EmailForm id="cta-email" tone="light" className="max-w-130" />
          <TrustRow />
        </div>
      </div>
    </section>
  );
}
