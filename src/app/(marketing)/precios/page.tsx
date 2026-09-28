// /precios (offentlig, WP-hemsida). Planer + jämförelsetabell (`SITIO_PRECIOS_TABLA`) +
// fundador + FAQ. Text via `copy`, priser via `formatPrecioPlan` (`@/config/pricing`,
// aldrig `plan.precioClp` — `copy.PLANES` har den inte ens, se `src/i18n/marketing.ts`).
import type { Metadata } from "next";
import { Check } from "lucide-react";
import Link from "next/link";

import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { CtaBand } from "@/components/marketing/cta-band";
import { FaqAccordion } from "@/components/marketing/faq-accordion";
import { SectionHeading } from "@/components/marketing/section-heading";
import { SiteFooter } from "@/components/marketing/site-footer";
import { SiteHeader } from "@/components/marketing/site-header";
import { brand } from "@/config/brand";
import { formatPrecioPlan } from "@/config/pricing";
import { copy } from "@/i18n/marketing";

export const metadata: Metadata = {
  title: copy.sitio.precios.meta.titulo({ nombre: brand.name }),
  description: copy.sitio.precios.meta.descripcion({ nombre: brand.name }),
};

const PRECIOS_FAQ = [
  copy.sitio.precios.faq.iva,
  copy.sitio.precios.faq.cambiarPlan,
  copy.sitio.precios.faq.masWhatsapp,
  copy.sitio.precios.faq.permanencia,
  copy.sitio.precios.faq.fundador,
] as const;

export default function PreciosPage() {
  return (
    <div className="flex min-h-dvh flex-col bg-canvas">
      <SiteHeader />

      <main className="flex-1">
        <section className="mx-auto max-w-3xl px-4 py-14 text-center sm:px-8 sm:py-18">
          <h1 className="font-display text-30 font-bold tracking-display text-ink sm:text-40">
            {copy.sitio.precios.hero.titulo}
          </h1>
          <p className="mt-4 text-16 leading-relaxed text-muted">
            {copy.sitio.precios.hero.texto}
          </p>
        </section>

        <section className="mx-auto max-w-6xl px-4 pb-14 sm:px-8">
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
            {copy.PLANES.map((plan) => (
              <Card
                key={plan.id}
                radius="tile"
                padding="lg"
                className="flex flex-col gap-4"
              >
                <div className="flex flex-col gap-2">
                  <h2 className="text-18 font-bold text-ink">{plan.nombre}</h2>
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
            {copy.sitio.precios.fundador}
          </Card>
        </section>

        <section className="mx-auto max-w-6xl px-4 pb-14 sm:px-8">
          <SectionHeading title={copy.sitio.precios.compararTitulo} />
          <Card
            radius="card"
            padding="none"
            className="mt-8 overflow-x-auto"
          >
            <table className="w-full min-w-160 border-collapse text-left text-14">
              <thead>
                <tr className="border-b border-line">
                  <th className="px-5 py-4 font-semibold text-muted">
                    {" "}
                  </th>
                  {copy.PLANES.map((plan) => (
                    <th
                      key={plan.id}
                      className="px-5 py-4 text-15 font-bold text-ink"
                    >
                      {plan.nombre}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {copy.SITIO_PRECIOS_TABLA.map((fila) => (
                  <tr key={fila.funcion} className="border-b border-line">
                    <th
                      scope="row"
                      className="px-5 py-3.5 font-semibold text-ink"
                    >
                      {fila.funcion}
                    </th>
                    <td className="px-5 py-3.5 text-ink">
                      {fila.valores.gratis}
                    </td>
                    <td className="px-5 py-3.5 text-ink">
                      {fila.valores.emprende}
                    </td>
                    <td className="px-5 py-3.5 text-ink">
                      {fila.valores.equipo}
                    </td>
                    <td className="px-5 py-3.5 text-ink">
                      {fila.valores.local}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </Card>
        </section>

        <section className="mx-auto max-w-6xl px-4 pb-14 sm:px-8">
          <SectionHeading title={copy.landing.preguntas.titulo} />
          <FaqAccordion items={PRECIOS_FAQ} className="mt-8" />
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
