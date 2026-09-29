// /horas-flash (offentlig, sitio-v6, F13 de MVP_SPEC.md). Sin `.dc.html` de referencia
// (ninguna pantalla de diseño dibujó esta landing todavía, mismo motivo que /funcionalidades
// y /precios, ver DESIGN.md §4 "Nya tokens (WP-hemsida, sitio-v3)"): reutiliza el lenguaje de
// movimiento y los componentes ya aprobados (`FlashMockup`, `Card`, `FaqAccordion`, `CtaBand`)
// en vez de inventar un formato nuevo. Misma URL para ambos mercados por ahora (el encargo:
// "Flashtider en SE"), texto vía `copy.sitio.flashPagina` (D-025/D-026, `@/i18n/marketing`).
import type { Metadata } from "next";
import {
  Bell,
  Check,
  Clock,
  Lock,
  Mail,
  SlidersHorizontal,
  TrendingUp,
  Zap,
} from "lucide-react";
import Link from "next/link";

import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { cn } from "@/components/ui/cn";
import { strokeCard } from "@/components/ui/icons";
import { CtaBand } from "@/components/marketing/cta-band";
import { FaqAccordion } from "@/components/marketing/faq-accordion";
import { FlashMockup } from "@/components/marketing/flash-mockup";
import { SectionHeading } from "@/components/marketing/section-heading";
import { SiteFooter } from "@/components/marketing/site-footer";
import { SiteHeader } from "@/components/marketing/site-header";
import { brand } from "@/config/brand";
import { copy } from "@/i18n/marketing";

export const metadata: Metadata = {
  title: copy.sitio.flashPagina.meta.titulo({ nombre: brand.name }),
  description: copy.sitio.flashPagina.meta.descripcion({ nombre: brand.name }),
};

const F = copy.sitio.flashPagina;

const PASOS = [
  { ...F.comoFunciona.pasos.uno, icon: Clock },
  { ...F.comoFunciona.pasos.dos, icon: Bell },
  { ...F.comoFunciona.pasos.tres, icon: Check },
] as const;

const PASO_DELAY = ["", "delay-100", "delay-200"] as const;

/** Ton por tarjeta de beneficio (bento, mismo criterio que `funcionalidades/page.tsx`
 * `SECTION_STYLE`): cuatro pasteles distintos, ninguno repetido. */
const BENEFICIOS = [
  { ...F.beneficios.items.a, icon: TrendingUp, tone: "lime" as const },
  { ...F.beneficios.items.b, icon: SlidersHorizontal, tone: "peach" as const },
  { ...F.beneficios.items.c, icon: Mail, tone: "lilac" as const },
  { ...F.beneficios.items.d, icon: Lock, tone: "dark" as const },
];

const FAQ_ITEMS = [F.faq.items.a, F.faq.items.b, F.faq.items.c] as const;

export default function HorasFlashPage() {
  return (
    <div className="flex min-h-dvh flex-col bg-canvas">
      <SiteHeader />

      <main className="flex-1">
        <section className="mx-auto max-w-6xl px-4 pt-10 pb-4 sm:px-8 sm:pt-14">
          <Card
            tone="dark"
            radius="hero"
            padding="xl"
            className="flex flex-col items-center gap-10 text-center lg:flex-row lg:items-center lg:justify-between lg:text-left"
          >
            <div className="flex max-w-lg flex-col items-center gap-4 lg:items-start">
              <span className="inline-flex w-fit items-center gap-1.5 rounded-full bg-lime px-3.5 py-1.5 text-13 font-bold tracking-caps text-ink uppercase">
                <Zap
                  aria-hidden="true"
                  className="size-3.5"
                  strokeWidth={strokeCard}
                />
                {F.hero.etiqueta}
              </span>
              <h1 className="font-display text-30 leading-hero font-semibold tracking-display text-on-dark sm:text-40">
                {F.hero.titulo}
              </h1>
              <p className="text-16 leading-relaxed text-on-dark-soft">
                {F.hero.texto}
              </p>
              <Button asChild variant="accent" size="xl" className="mt-2">
                <Link href="/login">{F.hero.cta}</Link>
              </Button>
            </div>
            <FlashMockup className="h-72 max-w-lg" />
          </Card>
        </section>

        <section className="mx-auto max-w-6xl px-4 py-10 sm:px-8 sm:py-14">
          <SectionHeading title={F.comoFunciona.titulo} />
          <div className="mt-8 grid gap-5 sm:grid-cols-3">
            {PASOS.map((paso, i) => (
              <Card
                key={paso.titulo}
                radius="tile"
                padding="lg"
                className="flex flex-col gap-4"
              >
                <span
                  aria-hidden="true"
                  className={cn(
                    "flex size-12 animate-float items-center justify-center rounded-icon bg-lime text-ink",
                    PASO_DELAY[i],
                  )}
                >
                  <paso.icon className="size-5.5" strokeWidth={strokeCard} />
                </span>
                <div className="flex flex-col gap-1.5">
                  <span className="text-13 font-bold tracking-caps text-muted uppercase">{`0${i + 1}`}</span>
                  <h3 className="text-19 leading-snug font-bold text-ink">
                    {paso.titulo}
                  </h3>
                </div>
                <p className="text-14 text-muted">{paso.texto}</p>
              </Card>
            ))}
          </div>
        </section>

        <section className="mx-auto max-w-6xl px-4 pb-10 sm:px-8 sm:pb-14">
          <SectionHeading title={F.beneficios.titulo} />
          <div className="mt-8 grid grid-cols-2 gap-4 lg:grid-cols-4">
            {BENEFICIOS.map((beneficio) => {
              const dark = beneficio.tone === "dark";
              return (
                <Card
                  key={beneficio.titulo}
                  tone={beneficio.tone}
                  radius="tile"
                  padding="lg"
                  className="flex flex-col gap-4"
                >
                  <span
                    aria-hidden="true"
                    className={cn(
                      "flex size-11 items-center justify-center rounded-icon",
                      dark ? "bg-lime text-ink" : "bg-ink text-on-dark",
                    )}
                  >
                    <beneficio.icon
                      className="size-5.5"
                      strokeWidth={strokeCard}
                    />
                  </span>
                  <h3
                    className={cn(
                      "text-19 leading-snug font-bold",
                      dark ? "text-on-dark" : "text-ink",
                    )}
                  >
                    {beneficio.titulo}
                  </h3>
                  <p
                    className={cn(
                      "text-14",
                      dark ? "text-on-dark-soft" : "text-ink",
                    )}
                  >
                    {beneficio.texto}
                  </p>
                </Card>
              );
            })}
          </div>
        </section>

        <section className="mx-auto max-w-6xl px-4 pb-10 sm:px-8 sm:pb-14">
          <Card
            tone="dark"
            radius="hero"
            padding="xl"
            className="flex flex-col items-start gap-5 sm:flex-row sm:items-center sm:justify-between"
          >
            <div className="flex flex-col gap-3">
              <span className="text-13 font-bold tracking-caps text-lime uppercase">
                {F.ejemplo.titulo}
              </span>
              <p className="max-w-xl text-16 leading-relaxed text-on-dark-soft">
                {F.ejemplo.texto}
              </p>
            </div>
            <span
              aria-hidden="true"
              className="flex size-18 shrink-0 items-center justify-center rounded-full bg-lime font-display text-22 font-bold tracking-display text-ink"
            >
              {copy.sitio.inicio.flash.mock.descuento({ pct: 20 })}
            </span>
          </Card>
        </section>

        <section className="mx-auto max-w-6xl px-4 pb-14 sm:px-8">
          <SectionHeading title={F.faq.titulo} />
          <FaqAccordion items={FAQ_ITEMS} className="mt-8" />
        </section>

        <CtaBand
          title={F.cta.titulo}
          text={F.cta.texto}
          buttonLabel={F.cta.boton}
          href="/login"
        />
      </main>

      <SiteFooter />
    </div>
  );
}
