// Footer delad av alla sidor på sitio-webben (WP-hemsida, retro: ny design mappad från
// `.visual-diff/ref/footer.html`). Ljus lime-50-överdel, ett mörkt rundat kort med
// diskreta konturlinjer (inline SVG, låg opacitet) och en svävande 3D-kalender
// (`calendar-3d.tsx`) som sticker upp över kortets överkant. `BrandLogo` (`size="lg"`) i
// mitten — samma logga som headern/mobilmenyn, bara större.
//
// Kolumnen med sociala länkar utelämnas: `brand.ts` har inga sociala fält (regel dura 10 —
// inga påhittade länkar). E-post utelämnas av samma skäl (`brand.supportEmail` finns
// inte). "Términos"/"Privacidad" är text utan länk: de sidorna finns inte än.
import { ArrowUpRight } from "lucide-react";
import Link from "next/link";

import { Button } from "@/components/ui/button";
import { strokeArrow } from "@/components/ui/icons";
import { brand } from "@/config/brand";
import { href, hrefIndustria, type IndustriaId } from "@/config/routes";
import { copy } from "@/i18n/marketing";

import { BrandLogo } from "./brand-logo";
import { Calendar3D } from "./calendar-3d";

const INDUSTRIAS = copy.SITIO_PARA_INDUSTRIAS.map((industria) => ({
  id: industria.id,
  nombre: industria.nombre,
  href: hrefIndustria(industria.id as IndustriaId),
}));

// "Horas flash"/"Ventajas": mismo motivo que en `site-header.tsx` (sitio-v6, sin una
// entrada propia en `copy.sitio.footer.links` todavía) — reutilizan
// `megamenu.destacado.titulo` y `ventajas.hero.etiqueta`, nunca texto inventado.
const PRODUCTO_LINKS = [
  {
    href: href("funcionalidades"),
    label: copy.sitio.footer.links.funcionalidades,
  },
  { href: href("precios"), label: copy.sitio.footer.links.precios },
  { href: href("preguntas"), label: copy.sitio.footer.links.preguntas },
  { href: href("contacto"), label: copy.sitio.footer.links.contacto },
  {
    href: href("horasFlash"),
    label: copy.sitio.megamenu.destacado.titulo,
  },
  { href: href("ventajas"), label: copy.sitio.ventajas.hero.etiqueta },
] as const;

const footerLinkClass =
  "text-14 font-semibold text-on-dark-soft transition-colors duration-150 ease-out hover:text-lime focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-lime";

function ArrowCircle({ tone }: { tone: "on-lime" | "on-dark" }) {
  return (
    <span
      aria-hidden="true"
      className={
        tone === "on-lime"
          ? "flex size-6.5 shrink-0 items-center justify-center rounded-full bg-ink text-lime"
          : "flex size-6.5 shrink-0 items-center justify-center rounded-full bg-lime text-ink"
      }
    >
      <ArrowUpRight className="size-3.5" strokeWidth={strokeArrow} />
    </span>
  );
}

/** Diskreta konturlinjer i bakgrunden (WP-hemsida, mappad från `footer.html`): fyra mjuka
 * kurvor, `opacity-5` i stället för referensens `stroke-opacity=".06"` (närmaste
 * Tailwind-opacitetssteget). Rent dekorativt. */
function ContourLines() {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 1344 460"
      preserveAspectRatio="none"
      className="absolute inset-0 h-full w-full stroke-on-dark opacity-5"
      fill="none"
      strokeWidth={1.5}
    >
      <path d="M-20 120 C 200 60, 320 220, 520 160 S 900 40, 1100 140 S 1320 260, 1380 200" />
      <path d="M-20 200 C 180 150, 340 300, 540 240 S 880 120, 1080 220 S 1300 340, 1380 290" />
      <path d="M-20 290 C 220 240, 360 380, 560 320 S 900 200, 1120 300 S 1320 420, 1380 380" />
      <path d="M-20 40 C 240 0, 380 120, 600 80 S 940 -20, 1160 60 S 1320 140, 1380 110" />
    </svg>
  );
}

export function SiteFooter() {
  const anio = new Date().getFullYear();
  return (
    <footer className="bg-lime-50">
      <div className="px-4 pt-24 pb-4 sm:px-6 sm:pt-28 sm:pb-6 lg:px-8">
        <div
          data-surface="dark"
          className="relative rounded-shell bg-dark px-6 pt-20 pb-10 text-on-dark sm:px-10 sm:pt-24 sm:pb-12 lg:px-16"
        >
          <ContourLines />

          <Calendar3D className="absolute -top-14 left-1/2 w-32 -translate-x-1/2 sm:-top-20 sm:w-44" />

          <div className="relative flex flex-col items-center gap-3 text-center">
            <BrandLogo size="lg" />
            <p className="text-16 font-medium text-on-dark-soft italic">
              {brand.tagline}
            </p>
            <div className="mt-4 flex flex-wrap items-center justify-center gap-3">
              <Button asChild variant="accent" size="xl">
                <Link href="/login">
                  {copy.sitio.nav.ctaCrearAgenda}
                  <ArrowCircle tone="on-lime" />
                </Link>
              </Button>
              <Button asChild variant="outline-dark" size="xl">
                <Link href="/login">
                  {copy.sitio.nav.entrar}
                  <ArrowCircle tone="on-dark" />
                </Link>
              </Button>
            </div>
          </div>

          <div className="relative mt-14 grid gap-10 sm:grid-cols-3">
            <div className="flex flex-col gap-6">
              <div>
                <span className="font-display text-24 font-semibold">
                  {copy.sitio.footer2.contacto.titulo}
                </span>
                <p className="mt-2.5 text-14 leading-relaxed text-on-dark-soft">
                  {copy.sitio.footer2.contacto.ciudad}
                </p>
              </div>
              <div className="inline-flex w-fit items-center gap-2 rounded-full bg-dark-2 px-3 py-1.5 text-12 text-on-dark-muted">
                <span className="rounded-full bg-lime px-2 py-0.5 text-11 font-bold text-ink">
                  {copy.sitio.footer2.novedad.etiqueta}
                </span>
                {copy.sitio.footer2.novedad.texto}
              </div>
            </div>

            <div className="flex flex-col items-start gap-4 sm:col-start-3 sm:items-end">
              <span className="font-display text-24 font-semibold">
                {copy.sitio.footer2.irA.titulo}
              </span>
              <div className="grid grid-cols-2 gap-x-10 gap-y-2.5 text-left sm:text-right">
                {PRODUCTO_LINKS.map((link, i) => (
                  // `contents`: los dos <Link> participan directo en la grid de 2
                  // columnas, el <div> en sí no genera una celda propia.
                  <div key={link.href} className="contents">
                    <Link href={link.href} className={footerLinkClass}>
                      {link.label}
                    </Link>
                    {INDUSTRIAS[i] ? (
                      <Link
                        href={INDUSTRIAS[i]!.href}
                        className={footerLinkClass}
                      >
                        {INDUSTRIAS[i]!.nombre}
                      </Link>
                    ) : (
                      <span />
                    )}
                  </div>
                ))}
              </div>
              <div className="flex items-center gap-5 rounded-control bg-lime-50 px-3.5 py-2 text-12 font-semibold text-ink">
                <span>{copy.sitio.footer2.legal.terminos}</span>
                <span>{copy.sitio.footer2.legal.privacidad}</span>
                <span>©{copy.sitio.footer2.legal.derechos({ anio })}</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
}
