// /preguntas (offentlig, WP-hemsida). Grupperad FAQ (`sitio.preguntas.grupos`: Empezar,
// Reservas, Pagos y precios, Datos y seguridad). Text via `copy` (D-025/D-026).
import type { Metadata } from "next";

import { FaqAccordion } from "@/components/marketing/faq-accordion";
import { SiteFooter } from "@/components/marketing/site-footer";
import { SiteHeader } from "@/components/marketing/site-header";
import { brand } from "@/config/brand";
import { copy } from "@/i18n/marketing";

export const metadata: Metadata = {
  title: copy.sitio.preguntas.meta.titulo({ nombre: brand.name }),
  description: copy.sitio.preguntas.meta.descripcion({ nombre: brand.name }),
};

const GRUPOS = [
  copy.sitio.preguntas.grupos.empezar,
  copy.sitio.preguntas.grupos.reservas,
  copy.sitio.preguntas.grupos.pagos,
  copy.sitio.preguntas.grupos.datos,
] as const;

export default function PreguntasPage() {
  return (
    <div className="flex min-h-dvh flex-col bg-canvas">
      <SiteHeader />

      <main className="flex-1">
        <section className="mx-auto max-w-3xl px-4 py-14 text-center sm:px-8 sm:py-18">
          <h1 className="font-display text-30 font-bold tracking-display text-ink sm:text-40">
            {copy.sitio.preguntas.hero.titulo}
          </h1>
          <p className="mt-4 text-16 leading-relaxed text-muted">
            {copy.sitio.preguntas.hero.texto}
          </p>
        </section>

        <div className="mx-auto flex max-w-3xl flex-col gap-10 px-4 pb-14 sm:px-8">
          {GRUPOS.map((grupo) => (
            <section key={grupo.titulo}>
              <h2 className="font-display text-22 font-bold tracking-display text-ink">
                {grupo.titulo}
              </h2>
              <FaqAccordion
                items={Object.values(grupo.preguntas)}
                className="mt-4"
              />
            </section>
          ))}
        </div>
      </main>

      <SiteFooter />
    </div>
  );
}
