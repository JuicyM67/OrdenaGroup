// /para/[industria] (offentlig, WP-hemsida). Statiska sidor för de fyra rubriken i
// `SITIO_PARA_INDUSTRIAS` (barberías, peluquerías, estética, kinesiología). 404 för ett
// okänt rubro. Text via `copy` (D-025/D-026); `formatDuration` (tid, regel 5) för
// tjänsternas minuter, aldrig ett eget `${n} min`.
import type { Metadata } from "next";
import { Check } from "lucide-react";
import Link from "next/link";
import { notFound } from "next/navigation";

import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { CtaBand } from "@/components/marketing/cta-band";
import { FaqAccordion } from "@/components/marketing/faq-accordion";
import { SiteFooter } from "@/components/marketing/site-footer";
import { SiteHeader } from "@/components/marketing/site-header";
import { brand } from "@/config/brand";
import { copy } from "@/i18n/marketing";
import { formatDuration } from "@/lib/format/dates";

type PageParams = { industria: string };

function findIndustria(id: string) {
  return copy.SITIO_PARA_INDUSTRIAS.find((industria) => industria.id === id);
}

export function generateStaticParams(): PageParams[] {
  return copy.SITIO_PARA_INDUSTRIAS.map((industria) => ({
    industria: industria.id,
  }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<PageParams>;
}): Promise<Metadata> {
  const { industria: id } = await params;
  const industria = findIndustria(id);
  if (!industria) return {};
  return {
    title: industria.meta.titulo({ nombre: brand.name }),
    description: industria.meta.descripcion({ nombre: brand.name }),
  };
}

export default async function ParaIndustriaPage({
  params,
}: {
  params: Promise<PageParams>;
}) {
  const { industria: id } = await params;
  const industria = findIndustria(id);
  if (!industria) notFound();

  return (
    <div className="flex min-h-dvh flex-col bg-canvas">
      <SiteHeader />

      <main className="flex-1">
        <section className="mx-auto max-w-6xl px-4 py-10 sm:px-8 sm:py-14">
          <Card
            tone="lime"
            radius="hero"
            padding="xl"
            className="flex flex-col gap-4"
          >
            <span className="inline-flex w-fit items-center rounded-full bg-ink px-3.5 py-1.5 text-13 font-bold tracking-caps text-on-dark uppercase">
              {industria.nombre}
            </span>
            <h1 className="font-display text-30 leading-hero font-semibold tracking-display text-ink sm:text-40">
              {industria.hero.titulo}
            </h1>
            <p className="max-w-xl text-16 leading-relaxed text-on-lime-soft">
              {industria.hero.texto}
            </p>
            <Button asChild variant="primary" size="xl" className="w-fit">
              <Link href="/login">{industria.cta}</Link>
            </Button>
          </Card>
        </section>

        <section className="mx-auto max-w-6xl px-4 pb-14 sm:px-8">
          <div className="grid gap-5 sm:grid-cols-3">
            {industria.beneficios.map((beneficio) => (
              <Card
                key={beneficio}
                radius="tile"
                padding="lg"
                className="flex flex-col gap-3"
              >
                <Check
                  aria-hidden="true"
                  className="size-5.5 text-ink"
                  strokeWidth={2.4}
                />
                <p className="text-15 font-semibold text-ink">{beneficio}</p>
              </Card>
            ))}
          </div>
        </section>

        <section className="mx-auto max-w-6xl px-4 pb-14 sm:px-8">
          {/* TODO_COPY: falta un título propio para la lista de servicios de
              ejemplo por rubro (p.ej. "Servicios de ejemplo"); `sitio.para.titulo`
              es el título del índice "Para quién es", no el de esta lista.
              Avisado en el reporte de WP-hemsida. */}
          <h2 className="font-display text-24 font-bold tracking-display text-ink">
            TODO_COPY: Servicios de ejemplo
          </h2>
          <Card radius="card" padding="none" className="mt-6">
            {industria.servicios.map((servicio) => (
              <div
                key={servicio.nombre}
                className="flex items-center justify-between border-t border-line px-6 py-4 first:border-t-0"
              >
                <span className="text-15 font-semibold text-ink">
                  {servicio.nombre}
                </span>
                <span className="text-13 text-muted">
                  {formatDuration(servicio.minutos)}
                </span>
              </div>
            ))}
          </Card>
        </section>

        <section className="mx-auto max-w-6xl px-4 pb-14 sm:px-8">
          <h2 className="font-display text-24 font-bold tracking-display text-ink">
            {copy.landing.preguntas.titulo}
          </h2>
          <FaqAccordion items={industria.faq} className="mt-6" />
        </section>

        <CtaBand
          title={copy.landing.ctaFinal.titulo}
          text={copy.landing.ctaFinal.texto}
          buttonLabel={industria.cta}
          href="/login"
        />
      </main>

      <SiteFooter />
    </div>
  );
}
