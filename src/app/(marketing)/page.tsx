// Landningssida (/, offentlig, indexerbar — ingen noindex). Route group "(marketing)"
// påverkar inte URL:en. Text via `copy` (`@/i18n/marketing`, WP-hemsida, D-025/D-026),
// aldrig direkt från `@/i18n`, så sidan fungerar för båda marknaderna (Chile och Sverige,
// D-025/D-026) från samma kod. Header/footer/CTA-band/FAQ delas med resten av
// sitio-webben (`src/components/marketing/`). Ingen `npm run visual` för den här skärmen
// (inget referensfoto finns) — se PR-rapporten.
//
// WP-hemsida v2 ("hemsidan blir rörlig"): megameny i headern, en levande hero
// (hero-bento.tsx — KLAR, rörs inte här), "Cómo funciona" en animerad telefonmockup
// (flujo-mockup.tsx).
//
// Retro (efter heron + glas-navet): resten av startsidan byggd om i den ordning ägaren
// valde, se PR-rapporten. Ny ordning: Intro (stats-band) → Por qué funciona (bento) →
// Reservar en un minuto (flujo) → Horas flash (fotoband) → Marquee (rubros) → Precios →
// Preguntas → CTA. Tar bort: usp-showcase.tsx, bento-grid.tsx och den gamla tvåradiga
// rubros-marquee (ersatta).
import type { Metadata } from "next";

import { CtaBand } from "@/components/marketing/cta-band";
import { FaqAccordion } from "@/components/marketing/faq-accordion";
import { FlashBand } from "@/components/marketing/flash-band";
import {
  FlujoPhoneMockup,
  FlujoSteps,
} from "@/components/marketing/flujo-mockup";
import { HeroSection } from "@/components/marketing/hero-bento";
import { IntroBand } from "@/components/marketing/intro-band";
import { PartnerStampello } from "@/components/marketing/partner-stampello";
import { PlanCards } from "@/components/marketing/plan-cards";
import { PorQueBento } from "@/components/marketing/por-que-bento";
import { RubrosMarquee } from "@/components/marketing/rubros-marquee";
import { SectionHeading } from "@/components/marketing/section-heading";
import { SiteFooter } from "@/components/marketing/site-footer";
import { SiteHeader } from "@/components/marketing/site-header";
import { Card } from "@/components/ui/card";
import { brand } from "@/config/brand";
import { copy } from "@/i18n/marketing";

export const metadata: Metadata = {
  title: copy.landing.meta.titulo({ nombre: brand.name }),
  description: copy.landing.meta.descripcion({ nombre: brand.name }),
};

const PREGUNTAS = [
  copy.landing.preguntas.items.instalar,
  copy.landing.preguntas.items.comoReservan,
  copy.landing.preguntas.items.noLlego,
  copy.landing.preguntas.items.permanencia,
  copy.landing.preguntas.items.datos,
  copy.landing.preguntas.items.ayudaConfig,
] as const;

export default function LandingPage() {
  return (
    <div className="flex min-h-dvh flex-col bg-canvas">
      <SiteHeader />

      <main className="flex-1">
        <HeroSection />

        <IntroBand />

        <PorQueBento />

        {/* Reservar en menos de un minuto: texto + stegindikador a la izquierda, teléfono
            en un panel lavender a la derecha (WP-hemsida, mappad från sida-v2, sektion
            "Reservar toma menos de un minuto" + sida-v1:s lavender-panel). */}
        <section
          id="como-funciona"
          className="mx-auto max-w-6xl scroll-mt-24 px-4 py-10 sm:px-8 sm:py-14"
        >
          <div className="flex flex-col items-center gap-10 lg:flex-row">
            <div className="flex flex-1 flex-col gap-4">
              <span className="w-fit rounded-full border border-border bg-surface px-3.5 py-1.5 text-12 font-bold tracking-caps text-ink uppercase">
                {copy.sitio.inicio.flujo.etiqueta}
              </span>
              <h2 className="font-display text-32 leading-hero font-semibold tracking-display text-ink sm:text-40">
                {copy.sitio.inicio.flujo.titulo}
              </h2>
              <p className="max-w-md text-16 leading-relaxed text-muted">
                {copy.sitio.inicio.flujo.texto}
              </p>
              <FlujoSteps className="mt-2" />
            </div>
            <div className="flex w-full flex-1 items-center justify-center rounded-hero bg-lavender p-8 sm:p-10">
              <FlujoPhoneMockup />
            </div>
          </div>
        </section>

        <FlashBand />

        {/* Para quién: banner con todos los rubros, en bucle (id="para-quien": enlazado
            desde el megamenú y el footer de site-header.tsx). */}
        <section id="para-quien" className="scroll-mt-24 py-10 sm:py-14">
          <SectionHeading
            title={copy.sitio.inicio.marquee.titulo}
            className="mx-auto max-w-6xl items-center px-4 text-center sm:px-8"
          />
          <div className="mt-8">
            <RubrosMarquee />
          </div>
        </section>

        {/* Precios */}
        <section
          id="precios"
          className="mx-auto max-w-6xl scroll-mt-24 px-4 py-10 sm:px-8 sm:py-14"
        >
          <h2 className="text-center font-display text-32 leading-hero font-semibold tracking-display text-ink sm:text-40">
            <span className="rounded-event bg-lime px-2.5">
              {copy.landing.precios.titulo}
            </span>
          </h2>
          <p className="mx-auto mt-3 max-w-2xl text-center text-15 text-muted">
            {copy.landing.precios.subtitulo}
          </p>
          <div className="mt-8">
            <PlanCards ctaHref="/login" />
          </div>
          <Card
            tone="lime"
            radius="tile"
            padding="md"
            className="mt-6 text-14 font-semibold text-ink"
          >
            {copy.landing.precios.fundador}
          </Card>
        </section>

        {/* Partner Stampello: recomendación externa antes de las Preguntas (sitio-v6,
            encargo explícito), versión chica del mismo componente que /ventajas. */}
        <section className="mx-auto max-w-6xl px-4 py-10 sm:px-8 sm:py-14">
          <PartnerStampello compact />
        </section>

        {/* Preguntas */}
        <section
          id="preguntas"
          className="mx-auto max-w-6xl scroll-mt-24 px-4 py-10 sm:px-8 sm:py-14"
        >
          <SectionHeading title={copy.landing.preguntas.titulo} />
          <FaqAccordion items={PREGUNTAS} className="mt-8" />
        </section>

        <CtaBand
          title={copy.landing.ctaFinal.titulo}
          text={copy.landing.ctaFinal.texto}
          buttonLabel={copy.landing.ctaFinal.boton}
          href="/login"
        />
      </main>

      <SiteFooter />
    </div>
  );
}
