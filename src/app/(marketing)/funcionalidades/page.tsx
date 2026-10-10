// /funcionalidades (offentlig, WP-hemsida). Tio sektioner från `SITIO_FUNCIONALIDADES`
// (F5–F3b redan i produkten, resten `proximamente` enligt MVP_SPEC.md fas 2). Text via
// `copy` (`@/i18n/marketing`), aldrig direkt från `@/i18n` (D-025/D-026). Varje sektion
// (sitio-v3) har en egen levande mini-mockup (`FeaturePreview`) i samma rörelsespråk som
// landningens hero/por-que-bento, och ett eget kort-tema (bento-färger, DESIGN.md §2:
// "Lista de espera = lilac", "Mörkt = viktigt nu" för Hoy/Informes) i stället för att alla
// tio se likadana ut. Ordningen växlar text/bild sida (`reverse`), som förut. Tål att en
// sektion saknas helt (t.ex. `abono` försvinner i SE när stämpelkortet tas bort): koden
// itererar bara över det `copy.SITIO_FUNCIONALIDADES` faktiskt innehåller, ingen fast
// referens till något specifikt id.
import { anchor } from "@/config/url-params";
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

import { Card, type CardProps } from "@/components/ui/card";
import { Chip } from "@/components/ui/chip";
import { cn } from "@/components/ui/cn";
import { strokeCard } from "@/components/ui/icons";
import { CtaBand } from "@/components/marketing/cta-band";
import { FeaturePreview } from "@/components/marketing/feature-preview";
import { SiteFooter } from "@/components/marketing/site-footer";
import { SiteHeader } from "@/components/marketing/site-header";
import {
  FuncionesIndexTop,
  funcionesIndexMigas,
} from "@/components/marketing/paginas/indices";
import { BreadcrumbJsonLd } from "@/components/marketing/paginas/json-ld";
import { pageMetadata } from "@/components/marketing/paginas/metadata";
import { href } from "@/config/routes";
import { copy } from "@/i18n/marketing";
import { paginas } from "@/i18n/paginas";

export const metadata: Metadata = pageMetadata({
  titulo: paginas.indiceFunciones.meta.titulo,
  descripcion: paginas.indiceFunciones.meta.descripcion,
  path: href("funcionalidades"),
});

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

/** Kort-ton per sektion (bento-variation, sitio-v3): samma pastellpalett som
 * hero-bento/por-que-bento, ingen färg upprepas mer än nödvändigt. `hoy`/`reportes` = `dark`
 * följer DESIGN.md §2 ("Mörkt = viktigt nu") rakt av. Där mockupen redan bär en stark egen
 * färg (`link-reservas` = lime, `lista-espera` = lilac, se `feature-preview.tsx`) står kortet
 * i `surface` i stället för att lägga samma pastell på båda — annars försvinner mockupens
 * kant mot kortet. `extraClass` används där ingen `Card`-ton matchar tonen rakt av (samma
 * mönster som `por-que-bento.tsx`s `bg-lavender`-kort: `tone="surface"` + egen
 * bakgrundsklass). */
const SECTION_STYLE: Record<
  string,
  { tone: NonNullable<CardProps["tone"]>; extraClass?: string }
> = {
  "link-reservas": { tone: "surface" },
  agenda: { tone: "surface" },
  hoy: { tone: "dark" },
  "reservas-manuales": { tone: "peach" },
  ajustes: { tone: "surface", extraClass: "bg-lavender" },
  recordatorios: { tone: "surface", extraClass: "bg-sky" },
  "lista-espera": { tone: "surface" },
  abono: { tone: "surface", extraClass: "bg-mint" },
  "fichas-clientes": { tone: "surface" },
  reportes: { tone: "dark" },
};
const DEFAULT_STYLE: {
  tone: NonNullable<CardProps["tone"]>;
  extraClass?: string;
} = { tone: "surface" };

export default function FuncionalidadesPage() {
  return (
    <div className="flex min-h-dvh flex-col bg-canvas">
      <BreadcrumbJsonLd migas={funcionesIndexMigas()} />
      <SiteHeader className="mt-10" />

      <main className="flex-1">
        <FuncionesIndexTop />

        <div className="mx-auto flex max-w-6xl flex-col gap-5 px-4 pt-8 pb-14 sm:px-8">
          {copy.SITIO_FUNCIONALIDADES.map((seccion, i) => {
            const Icon = ICONS[seccion.id] ?? Link2;
            const style = SECTION_STYLE[seccion.id] ?? DEFAULT_STYLE;
            const dark = style.tone === "dark" || style.tone === "dark-2";
            const reverse = i % 2 === 1;

            return (
              <Card
                key={seccion.id}
                id={anchor(seccion.id)}
                tone={style.tone}
                radius="tile"
                padding="xl"
                // scroll-mt-24: destino de los anclajes del megamenú (Producto/Recursos,
                // WP-hemsida v2), para que el header sticky no tape el título al saltar acá.
                className={cn(
                  // `lg:items-center` i stället för ett bas-`items-center`: på mobil (flex-col)
                  // gör `items-center` att korsaxeln inte sträcks ut, så mockupens `max-w-96`
                  // (384 px) fick plats trots en smalare skärm (360 px, overflow-fynd). Med
                  // stretch (standard) som bas krymper båda kolumnerna till kortets bredd, och
                  // `lg:items-center` behåller den lodräta centreringen mellan text/mockup i
                  // skrivbordsraden.
                  "flex min-w-0 scroll-mt-24 flex-col gap-8 lg:flex-row lg:items-center",
                  style.extraClass,
                )}
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
                      className={cn(
                        "flex size-11 shrink-0 items-center justify-center rounded-icon",
                        dark ? "bg-lime text-ink" : "bg-ink text-on-dark",
                      )}
                    >
                      <Icon className="size-5.5" strokeWidth={strokeCard} />
                    </span>
                    <span
                      className={cn(
                        "text-13 font-bold tracking-caps uppercase",
                        dark ? "text-on-dark-muted" : "text-muted",
                      )}
                    >
                      {seccion.etiqueta}
                    </span>
                    {seccion.proximamente ? (
                      <Chip tone="peach" size="sm">
                        {copy.sitio.funcionalidades.proximamenteBadge}
                      </Chip>
                    ) : null}
                  </div>
                  <h2
                    className={cn(
                      "font-display text-24 font-bold tracking-display",
                      dark ? "text-on-dark" : "text-ink",
                    )}
                  >
                    {seccion.titulo}
                  </h2>
                  <p
                    className={cn(
                      "text-15",
                      dark ? "text-on-dark-soft" : "text-muted",
                    )}
                  >
                    {seccion.texto}
                  </p>
                  <ul className="flex flex-col gap-2">
                    {seccion.puntos.map((punto) => (
                      <li
                        key={punto}
                        className={cn(
                          "flex items-start gap-2 text-14",
                          dark ? "text-on-dark" : "text-ink",
                        )}
                      >
                        <Check
                          aria-hidden="true"
                          className={cn(
                            "mt-0.5 size-4 shrink-0",
                            dark ? "text-on-dark-muted" : "text-muted",
                          )}
                          strokeWidth={2.4}
                        />
                        {punto}
                      </li>
                    ))}
                  </ul>
                </div>

                <FeaturePreview
                  seccion={seccion}
                  className={
                    reverse ? "min-w-0 flex-1 lg:order-1" : "min-w-0 flex-1"
                  }
                />
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
