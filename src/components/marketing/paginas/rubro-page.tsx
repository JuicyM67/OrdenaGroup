// Branschsida enligt Bransch.dc.html (WP-75): foto-hero med brödsmulor, tre vardagsproblem
// med lösning i glas, färdiga tjänster som accordion (initialcirklar, längd via
// `formatDuration`, pris via `formatMonto`), "Ska vi bli buddies?" och länkar till fler
// branscher. Texten kommer från `paginas.rubros[id]` och är unik per bransch.
import { ChevronDown } from "lucide-react";
import Image from "next/image";
import Link from "next/link";

import { HomeHeading } from "@/components/marketing/home/home-heading";
import { SiteFooter } from "@/components/marketing/site-footer";
import { SiteHeader } from "@/components/marketing/site-header";
import { brand } from "@/config/brand";
import { formatMonto } from "@/config/pricing";
import {
  href,
  hrefRubro,
  hrefRubros,
  RUBRO_IDS,
  type RubroId,
} from "@/config/routes";
import { paginas } from "@/i18n/paginas";
import { formatDuration } from "@/lib/format/dates";

import { FotoHero } from "./foto-hero";
import { BreadcrumbJsonLd, type Migas } from "./json-ld";
import { HeroGlass, HeroPrimary } from "./ui";

const c = paginas.comunes;

/** Pastell per initialcirkel (samma ordning som personalfärgerna). */
const CIRKEL = ["bg-lavender", "bg-sky", "bg-peach", "bg-mint"] as const;

export function rubroMigas(id: RubroId): Migas {
  return [
    { nombre: c.inicio, href: href("inicio") },
    { nombre: paginas.nav.rubros, href: hrefRubros() },
    { nombre: paginas.rubros[id].nombre, href: hrefRubro(id) },
  ];
}

/** Närliggande branscher: de tre efter den här i listan (intern länkning). */
function relacionados(id: RubroId): RubroId[] {
  const i = RUBRO_IDS.indexOf(id);
  return [1, 2, 3, 4].map((n) => RUBRO_IDS[(i + n) % RUBRO_IDS.length]!);
}

export function RubroPage({ id }: { id: RubroId }) {
  const t = paginas.rubros[id];
  const migas = rubroMigas(id);

  return (
    <div className="flex min-h-dvh flex-col bg-canvas">
      <BreadcrumbJsonLd migas={migas} />
      <SiteHeader className="mt-10" />

      <main className="flex-1">
        <FotoHero
          foto={id}
          fotoPos="object-photo-top"
          fotoAlt={t.fotoAlt}
          migas={migas}
          migasLabel={c.migas}
          pre={t.hero.pre}
          marca={t.hero.marca}
          texto={t.hero.texto}
          acciones={
            <>
              <HeroPrimary href="/login">{t.hero.cta}</HeroPrimary>
              <HeroGlass href={`/${brand.demoSlug}`}>{c.verEjemplo}</HeroGlass>
            </>
          }
        />

        <section className="bg-canvas">
          <div className="mx-auto flex max-w-360 flex-col gap-7 px-4 pt-16 pb-6 sm:px-8 lg:px-22 lg:pt-22">
            <h2 className="font-display text-40 leading-none font-semibold tracking-headline text-balance sm:text-52">
              {t.problemas.pre}
              <br />
              <span className="rounded-highlight bg-lime box-decoration-clone px-2.5 text-ink">
                {t.problemas.marca}
              </span>
            </h2>
            <ul className="grid grid-cols-1 gap-4 md:grid-cols-3">
              {t.problemas.items.map((p) => (
                <li
                  key={p.problema}
                  className="flex flex-col gap-2 rounded-card p-6 glass-light"
                >
                  <span className="text-13 font-bold text-alert-fg">
                    {p.problema}
                  </span>
                  <b className="font-display text-22 leading-snug">
                    {p.solucion}
                  </b>
                </li>
              ))}
            </ul>
          </div>
        </section>

        <section className="bg-canvas">
          <div className="mx-auto grid max-w-360 grid-cols-1 items-start gap-10 px-4 py-14 sm:px-8 lg:grid-cols-2 lg:gap-15 lg:px-22 lg:pb-25">
            <div className="flex flex-col gap-4">
              <HomeHeading
                etiqueta={c.serviciosEtiqueta}
                pre={t.servicios.pre}
                marca={t.servicios.marca}
                size="md"
              />
              <p className="text-16 leading-relaxed text-muted">
                {t.servicios.texto}
              </p>
            </div>
            <div className="flex flex-col gap-2">
              {t.servicios.items.map((s, k) => (
                <details
                  key={s.nombre}
                  open={k === 0}
                  className="group rounded-panel bg-surface px-4.5 py-4"
                >
                  <summary className="flex cursor-pointer list-none items-center gap-3 rounded-event focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-ink">
                    <span className="flex-1">
                      <b className="text-15">{s.nombre}</b>
                      <span className="block text-12 text-muted">
                        {formatDuration(s.minutos)}
                      </span>
                    </span>
                    <span aria-hidden="true" className="flex">
                      {c.equipo.map((inicial, n) => (
                        <span
                          key={inicial}
                          className={`flex size-6.5 items-center justify-center rounded-full border-2 border-surface text-11 font-bold ${CIRKEL[n % CIRKEL.length]} ${n > 0 ? "-ml-1.5" : ""}`}
                        >
                          {inicial}
                        </span>
                      ))}
                    </span>
                    <b className="w-20 text-right text-14">
                      {formatMonto(s.precio)}
                    </b>
                    <ChevronDown
                      aria-hidden="true"
                      className="size-4 shrink-0 transition-transform duration-300 group-open:rotate-180"
                      strokeWidth={2.5}
                    />
                  </summary>
                  <p className="mt-2.5 text-14 leading-relaxed text-ink-soft">
                    {s.descripcion}
                  </p>
                </details>
              ))}
            </div>
          </div>
        </section>

        <section className="px-4 pb-16 lg:px-22 lg:pb-25">
          <div className="relative mx-auto flex max-w-360 flex-col justify-center overflow-hidden rounded-cta px-6 py-14 text-on-dark sm:px-10 lg:px-16 lg:py-20">
            <Image
              src={`/marketing/${id}.webp`}
              alt=""
              fill
              sizes="(min-width: 1440px) 1360px, 100vw"
              className="object-cover object-photo-top"
            />
            <div
              aria-hidden="true"
              className="absolute inset-0 bg-cta-tint-mobile lg:bg-cta-tint"
            />
            <div className="relative flex max-w-140 flex-col gap-4">
              <h2 className="font-display text-40 leading-none font-semibold tracking-headline sm:text-52">
                {c.cta.pre}
                <br />
                <span className="rounded-highlight bg-lime box-decoration-clone px-2.5 text-ink">
                  {c.cta.marca}
                </span>
              </h2>
              <p className="text-16 text-on-dark/90 sm:text-17">
                {t.cierre.texto}
              </p>
              <div>
                <HeroPrimary href="/login">{t.cierre.boton}</HeroPrimary>
              </div>
            </div>
          </div>
        </section>

        <section className="bg-canvas">
          <div className="mx-auto flex max-w-360 flex-col gap-4 px-4 pb-16 sm:px-8 lg:px-22 lg:pb-25">
            <h2 className="text-18 font-bold">{c.masRubros}</h2>
            <ul className="flex flex-wrap gap-2">
              {relacionados(id).map((r) => (
                <li key={r}>
                  <Link
                    href={hrefRubro(r)}
                    className="inline-flex rounded-control px-4 py-2.5 text-14 font-semibold glass-light focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink"
                  >
                    {paginas.rubros[r].nombre}
                  </Link>
                </li>
              ))}
              <li>
                <Link
                  href={hrefRubros()}
                  className="inline-flex rounded-control bg-ink px-4 py-2.5 text-14 font-bold text-on-dark focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink"
                >
                  {paginas.nav.menuRubros.todas}
                </Link>
              </li>
            </ul>
          </div>
        </section>
      </main>

      <SiteFooter />
    </div>
  );
}
