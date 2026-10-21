// /precios (offentlig, WP-hemsida, sitio-v3: "roligare"). Plan-korten i startsidans
// färgade bento-stil (`PlanCards`, delad med /), en interaktiv räknare "kostnad per
// anställd" (`PrecioCalculadora`), ett mörkt band "Sin comisiones por reserva" med fyra
// chips, jämförelsetabellen i en snyggare kort-stil (Equipo-kolumnen lime-tonad, samma
// plan som "Más elegido"), fundador-bandet och FAQ. Text via `copy`, priser via
// `formatPrecioPlan`/`precioPlan` (`@/config/pricing`, aldrig `plan.precioClp` — `copy.PLANES`
// har den inte ens, se `src/i18n/marketing.ts`).
//
// `copy.sitio.precios.extra.*` (räknare/ingaAvgifter/jamfor) är texter nya för sitio-v3:
// om de ännu inte finns i `es-CL.marketing.ts` när det här körs (copywriter-es-cl skriver
// samtidigt) misslyckas typecheck på just den delen — se PR-rapporten, inget påhittat i
// stället.
import type { Metadata } from "next";
import { Sparkles } from "lucide-react";

import { Card } from "@/components/ui/card";
import { Chip } from "@/components/ui/chip";
import { strokeCard } from "@/components/ui/icons";
import { TextLink } from "@/components/ui/text-link";
import { CtaBand } from "@/components/marketing/cta-band";
import { FaqAccordion } from "@/components/marketing/faq-accordion";
import { PlanCards, PlanCustomBand } from "@/components/marketing/plan-cards";
import { PrecioCalculadora } from "@/components/marketing/precio-calculadora";
import { SectionHeading } from "@/components/marketing/section-heading";
import { SiteFooter } from "@/components/marketing/site-footer";
import { SiteHeader } from "@/components/marketing/site-header";
import { brand } from "@/config/brand";
import { href } from "@/config/routes";
import { copy } from "@/i18n/marketing";

export const metadata: Metadata = {
  title: copy.sitio.precios.meta.titulo({ nombre: brand.name }),
  description: copy.sitio.precios.meta.descripcion({ nombre: brand.name }),
};

const PRECIOS_FAQ = [
  copy.sitio.precios.faq.iva,
  copy.sitio.precios.faq.cambiarPlan,
  copy.sitio.precios.faq.permanencia,
  copy.sitio.precios.faq.fundador,
  copy.sitio.precios.faq.masWhatsapp,
] as const;

const SIN_COMISIONES_ITEMS = [
  copy.sitio.precios.extra.ingaAvgifter.items.a,
  copy.sitio.precios.extra.ingaAvgifter.items.b,
  copy.sitio.precios.extra.ingaAvgifter.items.c,
  copy.sitio.precios.extra.ingaAvgifter.items.d,
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
          <PlanCards ctaHref="/login" />
          <PlanCustomBand />
          <Card
            tone="lime"
            radius="tile"
            padding="md"
            className="mt-6 flex items-center justify-center gap-2.5 text-center text-14 font-semibold text-ink"
          >
            <Sparkles
              aria-hidden="true"
              className="size-4.5 shrink-0"
              strokeWidth={strokeCard}
            />
            {copy.sitio.precios.fundador}
          </Card>
          {copy.sitio.precios.extra.pagoOnline ? (
            <p className="mt-4 text-center text-14 text-muted">
              {copy.sitio.precios.extra.pagoOnline}
            </p>
          ) : null}
        </section>

        {/* Räknare "kostnad per anställd" (sitio-v3): reglage 1–10, precio por profesional
            para Equipo/Local. */}
        <section className="mx-auto max-w-3xl px-4 pb-14 sm:px-8">
          <PrecioCalculadora />
        </section>

        {/* Sin comisiones por reserva: banda oscura con cuatro chips (sitio-v3). */}
        <section className="mx-auto max-w-6xl px-4 pb-14 sm:px-8">
          <Card
            tone="dark"
            radius="hero"
            padding="xl"
            className="flex flex-col items-center gap-6 text-center"
          >
            <h2 className="max-w-xl font-display text-26 font-bold tracking-display text-on-dark sm:text-32">
              {copy.sitio.precios.extra.ingaAvgifter.titulo}
            </h2>
            <div className="flex flex-wrap justify-center gap-2.5">
              {SIN_COMISIONES_ITEMS.map((item) => (
                <Chip key={item} tone="dark" size="md">
                  {item}
                </Chip>
              ))}
            </div>
          </Card>
        </section>

        <section
          id="comparar"
          className="mx-auto max-w-6xl scroll-mt-24 px-4 pb-14 sm:px-8"
        >
          <SectionHeading
            title={copy.sitio.precios.compararTitulo}
            subtitle={copy.sitio.precios.extra.jamfor.texto}
          />
          <TextLink href={href("contacto")} className="mt-2 inline-block">
            {copy.sitio.precios.extra.jamfor.cta}
          </TextLink>
          <Card radius="card" padding="none" className="mt-8 overflow-x-auto">
            <table className="w-full min-w-160 border-collapse text-left text-14">
              <thead>
                <tr className="border-b border-line">
                  <th className="px-5 py-4 font-semibold text-muted"> </th>
                  <th className="px-5 py-4 text-15 font-bold text-ink">
                    {copy.PLANES[0]?.nombre}
                  </th>
                  <th className="px-5 py-4 text-15 font-bold text-ink">
                    {copy.PLANES[1]?.nombre}
                  </th>
                  <th className="bg-lime/15 px-5 py-4 text-15 font-bold text-ink">
                    <span className="flex items-center gap-2">
                      {copy.PLANES[2]?.nombre}
                      <Chip tone="lime" size="tag">
                        {copy.sitio.precios.masElegido}
                      </Chip>
                    </span>
                  </th>
                  <th className="px-5 py-4 text-15 font-bold text-ink">
                    {copy.PLANES[3]?.nombre}
                  </th>
                </tr>
              </thead>
              <tbody>
                {copy.SITIO_PRECIOS_TABLA.map((fila) => (
                  <tr
                    key={fila.funcion}
                    className="border-b border-line even:bg-canvas/60"
                  >
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
                    <td className="bg-lime/10 px-5 py-3.5 font-semibold text-ink">
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
