// /funcionalidades (offentlig, WP-hemsida). Tio sektioner från `SITIO_FUNCIONALIDADES`
// (F5–F3b redan i produkten, resten `proximamente` enligt MVP_SPEC.md fas 2). Text via
// `copy` (`@/i18n/marketing`), aldrig direkt från `@/i18n` (D-025/D-026). Tre sektioner
// (redan i produkten) återanvänder riktiga UI-mönster i stället för stockbilder, samma
// idé som landningens hero (`FeaturePreview`, WP-hemsida).
import type { Metadata } from "next";
import {
  BarChart3,
  Bell,
  Calendar,
  Check,
  CreditCard,
  Link2,
  List,
  PenLine,
  SlidersHorizontal,
  Smartphone,
  Users,
  type LucideIcon,
} from "lucide-react";

import { Card } from "@/components/ui/card";
import { Chip } from "@/components/ui/chip";
import { strokeCard } from "@/components/ui/icons";
import { CtaBand } from "@/components/marketing/cta-band";
import {
  FeaturePreview,
  type FeaturePreviewVariant,
} from "@/components/marketing/feature-preview";
import { SiteFooter } from "@/components/marketing/site-footer";
import { SiteHeader } from "@/components/marketing/site-header";
import { brand } from "@/config/brand";
import { copy } from "@/i18n/marketing";

export const metadata: Metadata = {
  title: copy.sitio.funcionalidades.meta.titulo({ nombre: brand.name }),
  description: copy.sitio.funcionalidades.meta.descripcion({
    nombre: brand.name,
  }),
};

const ICONS: Record<string, LucideIcon> = {
  "link-reservas": Link2,
  agenda: Calendar,
  hoy: Smartphone,
  "reservas-manuales": PenLine,
  ajustes: SlidersHorizontal,
  recordatorios: Bell,
  "lista-espera": List,
  abono: CreditCard,
  "fichas-clientes": Users,
  reportes: BarChart3,
};

const PREVIEWS: Record<string, FeaturePreviewVariant | undefined> = {
  "link-reservas": "reservas",
  agenda: "agenda",
  hoy: "hoy",
};

export default function FuncionalidadesPage() {
  return (
    <div className="flex min-h-dvh flex-col bg-canvas">
      <SiteHeader />

      <main className="flex-1">
        <section className="mx-auto max-w-3xl px-4 py-14 text-center sm:px-8 sm:py-18">
          <h1 className="font-display text-30 font-bold tracking-display text-ink sm:text-40">
            {copy.sitio.funcionalidades.hero.titulo}
          </h1>
          <p className="mt-4 text-16 leading-relaxed text-muted">
            {copy.sitio.funcionalidades.hero.texto}
          </p>
        </section>

        <div className="mx-auto flex max-w-6xl flex-col gap-5 px-4 pb-14 sm:px-8">
          {copy.SITIO_FUNCIONALIDADES.map((seccion, i) => {
            const Icon = ICONS[seccion.id] ?? Link2;
            const preview = PREVIEWS[seccion.id];
            const reverse = i % 2 === 1;

            return (
              <Card
                key={seccion.id}
                id={seccion.id}
                radius="tile"
                padding="xl"
                // scroll-mt-24: destino de los anclajes del megamenú (Producto/Recursos,
                // WP-hemsida v2), para que el header sticky no tape el título al saltar acá.
                className="flex scroll-mt-24 flex-col items-center gap-8 lg:flex-row"
              >
                <div
                  className={
                    reverse
                      ? "flex flex-1 flex-col gap-4 lg:order-2"
                      : "flex flex-1 flex-col gap-4"
                  }
                >
                  <div className="flex items-center gap-3">
                    <span
                      aria-hidden="true"
                      className="flex size-11 shrink-0 items-center justify-center rounded-icon bg-ink text-on-dark"
                    >
                      <Icon className="size-5.5" strokeWidth={strokeCard} />
                    </span>
                    <span className="text-13 font-bold tracking-caps text-muted uppercase">
                      {seccion.etiqueta}
                    </span>
                    {seccion.proximamente ? (
                      <Chip tone="peach" size="sm">
                        {copy.sitio.funcionalidades.proximamenteBadge}
                      </Chip>
                    ) : null}
                  </div>
                  <h2 className="font-display text-24 font-bold tracking-display text-ink">
                    {seccion.titulo}
                  </h2>
                  <p className="text-15 text-muted">{seccion.texto}</p>
                  <ul className="flex flex-col gap-2">
                    {seccion.puntos.map((punto) => (
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

                {preview ? (
                  <FeaturePreview
                    variant={preview}
                    className={reverse ? "flex-1 lg:order-1" : "flex-1"}
                  />
                ) : null}
              </Card>
            );
          })}
        </div>

        <CtaBand
          title={copy.sitio.funcionalidades.cta.titulo}
          text={copy.landing.ctaFinal.texto}
          buttonLabel={copy.sitio.funcionalidades.cta.boton}
          href="/login"
        />
      </main>

      <SiteFooter />
    </div>
  );
}
