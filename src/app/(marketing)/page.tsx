// Landningssida (/, offentlig, indexerbar — ingen noindex). Route group "(marketing)"
// påverkar inte URL:en. Text via `copy` (`@/i18n/marketing`, WP-hemsida, D-025/D-026),
// aldrig direkt från `@/i18n`, så sidan fungerar för båda marknaderna (Chile och Sverige,
// D-025/D-026) från samma kod. Header/footer/CTA-band/FAQ delas med resten av
// sitio-webben (`src/components/marketing/`). Ingen `npm run visual` för den här skärmen
// (inget referensfoto finns) — se PR-rapporten.
//
// WP-hemsida v2 ("hemsidan blir rörlig", se PR-rapporten): megameny i headern, en levande
// hero (hero-visual-preview.tsx), USP-korten fick mini-mockuper + hover-lyft
// (usp-showcase.tsx), "Cómo funciona" ersattes av en animerad telefonmockup
// (flujo-mockup.tsx), en ny sektion visar Horas flash (flash-mockup.tsx), "Beneficios" blev
// ett bentogrid (bento-grid.tsx) och "Para quién" blev en rullande banner
// (rubros-marquee.tsx) — branschrutorna finns kvar på /para/*, nådda via megamenyn/footern.
import type { Metadata } from "next";
import {
  Banknote,
  Bell,
  Calendar,
  Check,
  CreditCard,
  Link2,
  List,
  Zap,
} from "lucide-react";
import Link from "next/link";

import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { TextLink } from "@/components/ui/text-link";
import { strokeCard } from "@/components/ui/icons";
import { BentoGrid } from "@/components/marketing/bento-grid";
import { CtaBand } from "@/components/marketing/cta-band";
import { DecorativeBlob } from "@/components/marketing/decorative-blob";
import { FaqAccordion } from "@/components/marketing/faq-accordion";
import { FlashMockup } from "@/components/marketing/flash-mockup";
import {
  FlujoPhoneMockup,
  FlujoSteps,
} from "@/components/marketing/flujo-mockup";
import { HeroVisualPreview } from "@/components/marketing/hero-visual-preview";
import { RubrosMarquee } from "@/components/marketing/rubros-marquee";
import { SectionHeading } from "@/components/marketing/section-heading";
import { SiteFooter } from "@/components/marketing/site-footer";
import { SiteHeader } from "@/components/marketing/site-header";
import { UspShowcase } from "@/components/marketing/usp-showcase";
import { brand } from "@/config/brand";
import { formatPrecioPlan } from "@/config/pricing";
import { copy } from "@/i18n/marketing";

export const metadata: Metadata = {
  title: copy.landing.meta.titulo({ nombre: brand.name }),
  description: copy.landing.meta.descripcion({ nombre: brand.name }),
};

const BENEFICIOS = [
  { icon: Link2, ...copy.landing.beneficios.items.linkPropio },
  { icon: Calendar, ...copy.landing.beneficios.items.agendaPorProfesional },
  { icon: Bell, ...copy.landing.beneficios.items.recordatorios },
  { icon: List, ...copy.landing.beneficios.items.listaDeEspera },
  { icon: CreditCard, ...copy.landing.beneficios.items.abono },
  { icon: Banknote, ...copy.landing.beneficios.items.precioUnico },
] as const;

const PREGUNTAS = [
  copy.landing.preguntas.items.instalar,
  copy.landing.preguntas.items.comoReservan,
  copy.landing.preguntas.items.noLlego,
  copy.landing.preguntas.items.permanencia,
  copy.landing.preguntas.items.datos,
  copy.landing.preguntas.items.ayudaConfig,
] as const;

const HERO_STATS = [
  copy.landing.heroStats.siempreAbierto,
  copy.landing.heroStats.minutos,
  copy.landing.heroStats.comision,
] as const;

const FLASH_PUNTOS = [
  copy.sitio.inicio.flash.puntos.punto1,
  copy.sitio.inicio.flash.puntos.punto2,
  copy.sitio.inicio.flash.puntos.punto3,
] as const;

export default function LandingPage() {
  return (
    <div className="flex min-h-dvh flex-col bg-canvas">
      <SiteHeader />

      <main className="flex-1">
        {/* Hero */}
        <section className="mx-auto max-w-6xl px-4 py-10 sm:px-8 sm:py-14">
          <div className="flex flex-col gap-5 lg:flex-row lg:items-stretch">
            <Card
              as="section"
              aria-label={copy.landing.hero.titulo({ tagline: brand.tagline })}
              tone="lime"
              radius="hero"
              padding="xl"
              className="relative flex flex-col justify-between gap-6 lg:w-1/2"
            >
              <DecorativeBlob
                tone="lilac"
                className="pointer-events-none absolute -top-3 -right-3 z-0 size-8 opacity-90 sm:-top-7 sm:-right-7 sm:size-14"
              />
              <div className="relative z-10 flex flex-col gap-4">
                <span className="inline-flex w-fit items-center rounded-full bg-ink px-3.5 py-1.5 text-13 font-bold tracking-caps text-on-dark uppercase">
                  {copy.landing.hero.etiqueta}
                </span>
                <h1 className="font-display text-30 leading-hero font-semibold tracking-display text-ink sm:text-40">
                  {copy.landing.hero.titulo({ tagline: brand.tagline })}
                </h1>
                <p className="max-w-md text-16 leading-relaxed text-on-lime-soft">
                  {copy.landing.hero.subtitulo}
                </p>
              </div>
              <div className="relative z-10 flex flex-col flex-wrap gap-3 sm:flex-row">
                <Button asChild variant="primary" size="xl">
                  <Link href="/login">{copy.landing.hero.ctaPrimario}</Link>
                </Button>
                <Button asChild variant="secondary" size="xl">
                  <Link href="/barberia-norte">
                    {copy.landing.hero.ctaSecundario}
                  </Link>
                </Button>
              </div>
            </Card>

            <HeroVisualPreview className="lg:w-1/2" />
          </div>

          <Card
            tone="dark"
            radius="hero"
            padding="xl"
            className="relative mt-5 flex flex-col gap-8 sm:flex-row sm:items-center sm:justify-between"
          >
            <DecorativeBlob
              tone="lime"
              className="pointer-events-none absolute -bottom-3 -left-3 z-0 size-8 opacity-80 sm:-bottom-7 sm:-left-7 sm:size-14"
            />
            <div className="relative z-10 flex flex-col gap-6 sm:flex-row sm:gap-10">
              {HERO_STATS.map((stat) => (
                <div key={stat.etiqueta} className="flex flex-col gap-1">
                  <span className="font-display text-38 font-semibold tracking-display">
                    {stat.valor}
                  </span>
                  <span className="max-w-48 text-13 text-on-dark-muted">
                    {stat.etiqueta}
                  </span>
                </div>
              ))}
            </div>
            <div className="relative z-10 flex flex-col gap-3 sm:max-w-70 sm:items-end sm:text-right">
              <p className="text-14 text-on-dark-soft">
                {copy.landing.heroStats.texto}
              </p>
              <TextLink
                href="#como-funciona"
                className="text-on-dark hover:text-lime"
              >
                {copy.landing.heroStats.cta}
              </TextLink>
            </div>
          </Card>
        </section>

        {/* USP: cuatro razones grandes, cada una con su propia mini-mockup (sitio.inicio.usp) */}
        <section className="mx-auto max-w-6xl px-4 py-14 sm:px-8">
          <UspShowcase />

          {/* Prisnudge: precio desde + link a Funcionalidades */}
          <Card
            tone="lilac"
            radius="tile"
            padding="md"
            className="mt-5 flex flex-col items-start gap-3 sm:flex-row sm:items-center sm:justify-between"
          >
            <p className="text-14 font-semibold text-ink">
              {copy.sitio.inicio.precioDesde({
                precio: formatPrecioPlan("emprende"),
              })}
            </p>
            <TextLink href="/funcionalidades">
              {copy.sitio.inicio.verFuncionalidades}
            </TextLink>
          </Card>
        </section>

        {/* Cómo funciona: texto + indicador de pasos a la izquierda, teléfono a la derecha
            (retro 2026-09-28, punto 3 — mismo patrón de dos columnas que Horas flash). */}
        <section
          id="como-funciona"
          className="mx-auto max-w-6xl scroll-mt-24 px-4 py-14 sm:px-8"
        >
          <div className="flex flex-col items-center gap-10 lg:flex-row">
            <div className="flex flex-1 flex-col gap-4">
              <span className="inline-flex w-fit items-center gap-1.5 rounded-full bg-ink px-3.5 py-1.5 text-13 font-bold tracking-caps text-on-dark uppercase">
                <Calendar
                  aria-hidden="true"
                  className="size-3.5"
                  strokeWidth={strokeCard}
                />
                {copy.sitio.inicio.flujo.etiqueta}
              </span>
              <h2 className="font-display text-30 font-bold tracking-display text-ink sm:text-32">
                {copy.sitio.inicio.flujo.titulo}
              </h2>
              <p className="max-w-md text-15 text-muted">
                {copy.sitio.inicio.flujo.texto}
              </p>
              <FlujoSteps className="mt-2" />
            </div>
            <div className="w-full flex-1">
              <FlujoPhoneMockup />
            </div>
          </div>
        </section>

        {/* Horas flash */}
        <section
          id="horas-flash"
          className="mx-auto max-w-6xl scroll-mt-24 px-4 py-14 sm:px-8"
        >
          <div className="flex flex-col items-center gap-10 lg:flex-row">
            <div className="flex flex-1 flex-col gap-4">
              <span className="inline-flex w-fit items-center gap-1.5 rounded-full bg-ink px-3.5 py-1.5 text-13 font-bold tracking-caps text-on-dark uppercase">
                <Zap
                  aria-hidden="true"
                  className="size-3.5"
                  strokeWidth={strokeCard}
                />
                {copy.sitio.inicio.flash.etiqueta}
              </span>
              <h2 className="font-display text-30 font-bold tracking-display text-ink sm:text-32">
                {copy.sitio.inicio.flash.titulo}
              </h2>
              <p className="max-w-md text-15 text-muted">
                {copy.sitio.inicio.flash.texto}
              </p>
              <ul className="flex flex-col gap-2">
                {FLASH_PUNTOS.map((punto) => (
                  <li
                    key={punto}
                    className="flex items-start gap-2 text-14 text-ink"
                  >
                    <Check
                      aria-hidden="true"
                      className="mt-0.5 size-4 shrink-0 text-muted"
                      strokeWidth={2.4}
                    />
                    {punto}
                  </li>
                ))}
              </ul>
            </div>
            <div className="w-full flex-1">
              <FlashMockup />
            </div>
          </div>
        </section>

        {/* Todo lo que necesitas: bentogrid (mismos seis beneficios de siempre) */}
        <section
          id="beneficios"
          className="mx-auto max-w-6xl scroll-mt-24 px-4 py-14 sm:px-8"
        >
          <SectionHeading
            title={copy.sitio.inicio.bento.titulo}
            subtitle={copy.sitio.inicio.bento.subtitulo}
          />
          <div className="mt-8">
            <BentoGrid
              items={BENEFICIOS}
              imageSrc="/images/sitio/bento-salon.webp"
            />
          </div>
        </section>

        {/* Para quién: banner con todos los rubros, en bucle */}
        <section
          id="para-quien"
          className="mx-auto max-w-6xl scroll-mt-24 px-4 py-14 sm:px-8"
        >
          <SectionHeading title={copy.sitio.inicio.marquee.titulo} />
          <div className="mt-8">
            <RubrosMarquee />
          </div>
        </section>

        {/* Precios */}
        <section
          id="precios"
          className="mx-auto max-w-6xl scroll-mt-24 px-4 py-14 sm:px-8"
        >
          <SectionHeading
            title={copy.landing.precios.titulo}
            subtitle={copy.landing.precios.subtitulo}
          />
          <div className="mt-8 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
            {copy.PLANES.map((plan) => (
              <Card
                key={plan.id}
                radius="tile"
                padding="lg"
                className="flex flex-col gap-4"
              >
                <div className="flex flex-col gap-2">
                  <h3 className="text-18 font-bold text-ink">{plan.nombre}</h3>
                  <p className="font-display text-32 font-semibold tracking-display text-ink">
                    {plan.id === "gratis"
                      ? plan.nombre
                      : formatPrecioPlan(plan.id)}
                  </p>
                </div>
                <ul className="flex flex-1 flex-col gap-2">
                  {plan.puntos.map((punto) => (
                    <li
                      key={punto}
                      className="flex items-start gap-2 text-14 text-ink"
                    >
                      <Check
                        aria-hidden="true"
                        className="mt-0.5 size-4 shrink-0 text-muted"
                        strokeWidth={2.4}
                      />
                      {punto}
                    </li>
                  ))}
                </ul>
                <Button asChild variant="secondary" size="lg">
                  <Link href="/login">{plan.cta}</Link>
                </Button>
              </Card>
            ))}
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

        {/* Preguntas */}
        <section
          id="preguntas"
          className="mx-auto max-w-6xl scroll-mt-24 px-4 py-14 sm:px-8"
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
