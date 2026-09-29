// /ventajas (offentlig, sitio-v6). Sin `.dc.html` de referencia (mismo motivo que
// /funcionalidades, /precios y /horas-flash, ver DESIGN.md §4). Seis razones concretas
// (`copy.sitio.ventajas.items`) en un bento de pasteles, la tabla comparativa honesta
// (`copy.SITIO_COMPARACION`, una columna por competidor + la nuestra marcada en lima),
// la frase de honestidad explícita y la recomendación de Stampello. Texto vía `copy`
// (D-025/D-026, `@/i18n/marketing`).
import type { Metadata } from "next";
import {
  Info,
  Link2,
  List,
  MessageCircle,
  Percent,
  Users,
  Zap,
} from "lucide-react";

import { Card } from "@/components/ui/card";
import { cn } from "@/components/ui/cn";
import { strokeCard } from "@/components/ui/icons";
import { CtaBand } from "@/components/marketing/cta-band";
import { PartnerStampello } from "@/components/marketing/partner-stampello";
import { SectionHeading } from "@/components/marketing/section-heading";
import { SiteFooter } from "@/components/marketing/site-footer";
import { SiteHeader } from "@/components/marketing/site-header";
import { brand } from "@/config/brand";
import { copy } from "@/i18n/marketing";

export const metadata: Metadata = {
  title: copy.sitio.ventajas.meta.titulo({ nombre: brand.name }),
  description: copy.sitio.ventajas.meta.descripcion({ nombre: brand.name }),
};

const V = copy.sitio.ventajas;
const COMPARACION = copy.SITIO_COMPARACION;

/** Ton por tarjeta (bento, mismo criterio que `funcionalidades/page.tsx` `SECTION_STYLE`):
 * seis pasteles distintos, ninguno repetido. */
const ITEM_STYLE = [
  { ...V.items.a, icon: Percent, tone: "lime" as const, extraClass: "" },
  { ...V.items.b, icon: Users, tone: "peach" as const, extraClass: "" },
  { ...V.items.c, icon: Link2, tone: "surface" as const, extraClass: "" },
  { ...V.items.d, icon: Zap, tone: "dark" as const, extraClass: "" },
  { ...V.items.e, icon: List, tone: "lilac" as const, extraClass: "" },
  {
    ...V.items.f,
    icon: MessageCircle,
    tone: "surface" as const,
    extraClass: "bg-sky",
  },
];

export default function VentajasPage() {
  return (
    <div className="flex min-h-dvh flex-col bg-canvas">
      <SiteHeader />

      <main className="flex-1">
        <section className="mx-auto max-w-3xl px-4 py-14 text-center sm:px-8 sm:py-18">
          <span className="mx-auto mb-4 inline-flex w-fit items-center rounded-full border border-border bg-surface px-3.5 py-1.5 text-12 font-bold tracking-caps text-ink uppercase">
            {V.hero.etiqueta}
          </span>
          <h1 className="font-display text-30 font-bold tracking-display text-ink sm:text-40">
            {V.hero.titulo}
          </h1>
          <p className="mt-4 text-16 leading-relaxed text-muted">
            {V.hero.texto}
          </p>
        </section>

        <section className="mx-auto max-w-6xl px-4 pb-14 sm:px-8">
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {ITEM_STYLE.map((item) => {
              const dark = item.tone === "dark";
              return (
                <Card
                  key={item.titulo}
                  tone={item.tone}
                  radius="tile"
                  padding="lg"
                  className={cn("flex flex-col gap-4", item.extraClass)}
                >
                  <span
                    aria-hidden="true"
                    className={cn(
                      "flex size-11 items-center justify-center rounded-icon",
                      dark ? "bg-lime text-ink" : "bg-ink text-on-dark",
                    )}
                  >
                    <item.icon className="size-5.5" strokeWidth={strokeCard} />
                  </span>
                  <h2
                    className={cn(
                      "text-19 leading-snug font-bold",
                      dark ? "text-on-dark" : "text-ink",
                    )}
                  >
                    {item.titulo}
                  </h2>
                  <p
                    className={cn(
                      "text-14",
                      dark ? "text-on-dark-soft" : "text-muted",
                    )}
                  >
                    {item.texto}
                  </p>
                </Card>
              );
            })}
          </div>
        </section>

        <section className="mx-auto max-w-6xl px-4 pb-14 sm:px-8">
          <SectionHeading
            title={V.comparacion.titulo}
            subtitle={V.comparacion.texto}
          />
          <Card radius="card" padding="none" className="mt-8 overflow-x-auto">
            <table className="w-full min-w-160 border-collapse text-left text-14">
              <thead>
                <tr className="border-b border-line">
                  <th className="px-5 py-4 font-semibold text-muted"> </th>
                  <th className="bg-lime px-5 py-4 text-15 font-bold text-ink">
                    {brand.name}
                  </th>
                  {COMPARACION.competidores.map((competidor) => (
                    <th
                      key={competidor}
                      className="px-5 py-4 text-15 font-bold text-ink"
                    >
                      {competidor}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {COMPARACION.filas.map((fila) => (
                  <tr key={fila.aspecto} className="border-b border-line">
                    <th
                      scope="row"
                      className="px-5 py-3.5 font-semibold text-ink"
                    >
                      {fila.aspecto}
                    </th>
                    <td className="bg-lime/30 px-5 py-3.5 font-semibold text-ink">
                      {fila.nosotros}
                    </td>
                    {fila.valores.map((valor, i) => (
                      <td key={i} className="px-5 py-3.5 text-ink">
                        {valor}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </Card>
          <p className="mt-4 text-13 text-muted">{V.comparacion.nota}</p>
          <Card
            tone="peach"
            radius="tile"
            padding="md"
            className="mt-4 flex items-start gap-3"
          >
            <Info
              aria-hidden="true"
              className="mt-0.5 size-5 shrink-0 text-on-peach-soft"
              strokeWidth={strokeCard}
            />
            <p className="text-14 font-semibold text-ink">
              {V.comparacion.honestidad}
            </p>
          </Card>
        </section>

        <section className="mx-auto max-w-6xl px-4 pb-14 sm:px-8">
          <PartnerStampello />
        </section>

        <CtaBand
          title={V.cta.titulo}
          text={copy.landing.ctaFinal.texto}
          buttonLabel={V.cta.boton}
          href="/login"
        />
      </main>

      <SiteFooter />
    </div>
  );
}
