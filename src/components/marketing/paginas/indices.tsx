// Översiktssidorna `/funktioner` och `/branscher` (WP-75): foto-hero + rutnät med kort till
// varje undersida (intern länkning för SEO). Detaljsektionerna med ankare på
// `/funktioner` ligger kvar under kortrutnätet (gamla ankarlänkar landar rätt).
import Image from "next/image";
import Link from "next/link";

import { HomeHeading } from "@/components/marketing/home/home-heading";
import { SiteFooter } from "@/components/marketing/site-footer";
import { SiteHeader } from "@/components/marketing/site-header";
import { brand } from "@/config/brand";
import {
  funcionesDisponibles,
  href,
  hrefFuncion,
  hrefRubro,
  hrefRubros,
  RUBRO_IDS,
} from "@/config/routes";
import { paginas } from "@/i18n/paginas";

import { FotoHero } from "./foto-hero";
import { BreadcrumbJsonLd, type Migas } from "./json-ld";
import { FUNCION_UI, TONE_CLASS } from "./registry";
import { BuddyCta, HeroGlass, HeroPrimary } from "./ui";

const c = paginas.comunes;

export function funcionesIndexMigas(): Migas {
  return [
    { nombre: c.inicio, href: href("inicio") },
    { nombre: paginas.nav.funciones, href: href("funcionalidades") },
  ];
}

export function rubrosIndexMigas(): Migas {
  return [
    { nombre: c.inicio, href: href("inicio") },
    { nombre: paginas.nav.rubros, href: hrefRubros() },
  ];
}

export function FuncionesIndexTop() {
  const t = paginas.indiceFunciones;
  const migas = funcionesIndexMigas();
  return (
    <>
      <FotoHero
        foto="funciones"
        fotoAlt={t.fotoAlt}
        migas={migas}
        migasLabel={c.migas}
        etiqueta={t.etiqueta}
        pre={t.hero.pre}
        marca={t.hero.marca}
        texto={t.hero.texto}
        acciones={
          <>
            <HeroPrimary href="/login">{c.crearGratis}</HeroPrimary>
            <HeroGlass href={`/${brand.demoSlug}`}>{c.verEjemplo}</HeroGlass>
          </>
        }
      />
      <section className="bg-linear-to-b from-canvas to-lilac-50">
        <ul className="mx-auto grid max-w-360 grid-cols-1 gap-4 px-4 py-16 sm:grid-cols-2 sm:px-8 lg:grid-cols-3 lg:px-22 lg:py-25">
          {funcionesDisponibles().map((id) => {
            const ft = paginas.funciones[id]!;
            const ui = FUNCION_UI[id];
            return (
              <li key={id}>
                <Link
                  href={hrefFuncion(id)}
                  className="flex h-full items-center gap-3.5 rounded-hero p-5 glass-light transition-opacity duration-150 ease-out hover:opacity-90 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink"
                >
                  <span
                    aria-hidden="true"
                    className={`flex size-11 flex-none items-center justify-center rounded-full ${TONE_CLASS[ui.tone]}`}
                  >
                    <ui.icon className="size-5" strokeWidth={2} />
                  </span>
                  <span className="flex flex-col gap-0.5">
                    <h2 className="text-16 font-bold">{ft.nombre}</h2>
                    <span className="text-13 text-muted">{ft.resumen}</span>
                  </span>
                </Link>
              </li>
            );
          })}
        </ul>
      </section>
      <div className="bg-canvas px-4 pt-16 sm:px-8 lg:px-22 lg:pt-25">
        <h2 className="mx-auto max-w-6xl font-display text-30 font-semibold tracking-headline">
          {t.detalleTitulo}
        </h2>
      </div>
    </>
  );
}

export function RubrosIndexPage() {
  const t = paginas.indiceRubros;
  const migas = rubrosIndexMigas();
  return (
    <div className="flex min-h-dvh flex-col bg-canvas">
      <BreadcrumbJsonLd migas={migas} />
      <SiteHeader className="mt-10" />
      <main className="flex-1">
        <FotoHero
          foto="rubros"
          fotoAlt={t.fotoAlt}
          migas={migas}
          migasLabel={c.migas}
          etiqueta={t.etiqueta}
          pre={t.hero.pre}
          marca={t.hero.marca}
          texto={t.hero.texto}
          acciones={
            <>
              <HeroPrimary href="/login">{c.crearGratis}</HeroPrimary>
              <HeroGlass href={`/${brand.demoSlug}`}>{c.verEjemplo}</HeroGlass>
            </>
          }
        />
        <section className="bg-canvas">
          <div className="mx-auto flex max-w-360 flex-col gap-8 px-4 py-16 sm:px-8 lg:px-22 lg:py-25">
            <HomeHeading
              etiqueta={t.etiqueta}
              pre={t.rejilla.pre}
              marca={t.rejilla.marca}
              size="md"
            />
            <ul className="grid grid-cols-2 gap-3.5 lg:grid-cols-4">
              {RUBRO_IDS.map((id) => (
                <li key={id}>
                  <Link
                    href={hrefRubro(id)}
                    className="group relative block h-52 overflow-hidden rounded-card focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink lg:h-64"
                  >
                    <Image
                      src={`/marketing/${id}.webp`}
                      alt=""
                      fill
                      sizes="(min-width: 1024px) 25vw, 50vw"
                      className="object-cover transition-transform duration-500 ease-out group-hover:scale-105"
                    />
                    <span
                      aria-hidden="true"
                      className="absolute inset-0 bg-scrim-bottom"
                    />
                    <span className="absolute bottom-3 left-3 rounded-control px-3 py-2 text-13 font-bold glass-light sm:text-14">
                      {paginas.rubros[id].nombre}
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        </section>
        <BuddyCta {...c.cta} />
      </main>
      <SiteFooter />
    </div>
  );
}
