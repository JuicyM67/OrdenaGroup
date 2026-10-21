// Funktionssida enligt Funktion.dc.html (WP-75): foto-hero med brödsmulor och glaskort, tre
// fördelar i glas, "så funkar det" i steg med UI-mockup, FAQ, relaterade funktioner och CTA.
// Texten kommer från `paginas.funciones[id]` (en per marknad), adresserna från routes.ts.
import Link from "next/link";

import { HomeHeading } from "@/components/marketing/home/home-heading";
import { SiteFooter } from "@/components/marketing/site-footer";
import { SiteHeader } from "@/components/marketing/site-header";
import { href, hrefFuncion, type FuncionId } from "@/config/routes";
import { paginas } from "@/i18n/paginas";

import { FotoHero } from "./foto-hero";
import { BreadcrumbJsonLd, type Migas } from "./json-ld";
import { FUNCION_UI, TONE_CLASS } from "./registry";
import { BuddyCta, HeroCard, HeroPrimary, MockPanel, PageFaq } from "./ui";

const c = paginas.comunes;

export function funcionMigas(id: FuncionId): Migas {
  const t = paginas.funciones[id];
  return [
    { nombre: c.inicio, href: href("inicio") },
    { nombre: paginas.nav.funciones, href: href("funcionalidades") },
    { nombre: t?.nombre ?? "", href: hrefFuncion(id) },
  ];
}

export function FuncionPage({ id }: { id: FuncionId }) {
  const t = paginas.funciones[id];
  if (!t) return null;
  const ui = FUNCION_UI[id];
  const migas = funcionMigas(id);
  const relacionadas = ui.relacionadas
    .filter((r) => paginas.funciones[r])
    .slice(0, 3);

  return (
    <div className="flex min-h-dvh flex-col bg-canvas">
      <BreadcrumbJsonLd migas={migas} />
      <SiteHeader className="mt-10" />

      <main className="flex-1">
        <FotoHero
          foto={ui.foto}
          fotoPos={ui.fotoPos}
          fotoAlt={t.fotoAlt}
          migas={migas}
          migasLabel={c.migas}
          etiqueta={t.etiqueta}
          pre={t.hero.pre}
          marca={t.hero.marca}
          texto={t.hero.texto}
          acciones={<HeroPrimary href="/login">{c.crearGratis}</HeroPrimary>}
          tarjeta={<HeroCard {...t.tarjeta} />}
        />

        <section className="bg-linear-to-b from-canvas to-lilac-50">
          <ul className="mx-auto grid max-w-360 grid-cols-1 gap-4 px-4 py-16 sm:px-8 md:grid-cols-3 lg:px-22 lg:py-25">
            {t.beneficios.map((b, i) => {
              const Icon = ui.beneficios[i]!;
              const tones = ["mint", "lavender", "peach"] as const;
              return (
                <li
                  key={b.titulo}
                  className="flex flex-col gap-2.5 rounded-hero p-6.5 glass-light"
                >
                  <span
                    aria-hidden="true"
                    className={`flex size-11.5 items-center justify-center rounded-full ${TONE_CLASS[tones[i]!]}`}
                  >
                    <Icon className="size-5" strokeWidth={2} />
                  </span>
                  <h2 className="font-display text-22 leading-snug font-bold">
                    {b.titulo}
                  </h2>
                  <p className="text-15 leading-relaxed text-ink-soft">
                    {b.texto}
                  </p>
                </li>
              );
            })}
          </ul>
        </section>

        <section className="bg-canvas">
          <div className="mx-auto grid max-w-360 grid-cols-1 items-center gap-10 px-4 py-16 sm:px-8 lg:grid-cols-2 lg:gap-20 lg:px-22 lg:py-25">
            <div className="flex flex-col gap-4.5">
              <HomeHeading
                etiqueta={c.comoEtiqueta}
                pre={t.como.pre}
                marca={t.como.marca}
                size="md"
              />
              <ol>
                {t.como.pasos.map((p, i) => (
                  <li
                    key={p.titulo}
                    className="flex items-start gap-3.5 border-t border-line-strong py-4"
                  >
                    <span
                      className={`flex size-9.5 flex-none items-center justify-center rounded-full font-bold ${i === 2 ? "bg-lime" : "bg-canvas"}`}
                    >
                      {i + 1}
                    </span>
                    <span className="flex flex-col gap-0.5">
                      <b className="text-17">{p.titulo}</b>
                      <span className="text-14 text-muted">{p.texto}</span>
                    </span>
                  </li>
                ))}
              </ol>
            </div>
            <MockPanel foto={ui.foto} {...t.como.mock} />
          </div>
        </section>

        <PageFaq etiqueta={c.faqEtiqueta} titulo={c.faqTitulo} items={t.faq} />

        <section className="bg-canvas">
          <div className="mx-auto flex max-w-360 flex-col gap-4 px-4 pb-16 sm:px-8 lg:px-22 lg:pb-25">
            <h2 className="text-18 font-bold">{c.masFunciones}</h2>
            <ul className="grid grid-cols-1 gap-3.5 md:grid-cols-3">
              {relacionadas.map((r) => {
                const rt = paginas.funciones[r]!;
                const rui = FUNCION_UI[r];
                return (
                  <li key={r}>
                    <Link
                      href={hrefFuncion(r)}
                      className="flex items-center gap-3 rounded-tile p-4.5 glass-light focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink"
                    >
                      <span
                        aria-hidden="true"
                        className={`flex size-10.5 flex-none items-center justify-center rounded-full ${TONE_CLASS[rui.tone]}`}
                      >
                        <rui.icon className="size-4.5" strokeWidth={2} />
                      </span>
                      <span className="flex flex-col">
                        <b className="text-15">{rt.nombre}</b>
                        <span className="text-13 text-muted">{rt.resumen}</span>
                      </span>
                    </Link>
                  </li>
                );
              })}
            </ul>
          </div>
        </section>

        <BuddyCta {...c.cta} />
      </main>

      <SiteFooter />
    </div>
  );
}
