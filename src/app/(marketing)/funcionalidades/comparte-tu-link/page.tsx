// /funcionalidades/comparte-tu-link (WP-89, D-075): publik guide för att lägga ut
// bokningslänken i Instagram, Google, WhatsApp Business, Facebook och TikTok. Samma steg som
// Ajustes → Comparte tu link (`compartir.canales`), så guiden finns på ett ställe. Egen
// sidfil (statiskt segment går före `[funcion]`), inte i funktionsmallen eller menyn; finns
// i sitemap.xml.
import type { Metadata } from "next";

import { CtaBand } from "@/components/marketing/cta-band";
import { pageMetadata } from "@/components/marketing/paginas/metadata";
import { SiteFooter } from "@/components/marketing/site-footer";
import { SiteHeader } from "@/components/marketing/site-header";
import { brand } from "@/config/brand";
import { href, SIGNUP_PATH } from "@/config/routes";
import { compartir } from "@/i18n";
import { SHARE_CHANNELS, type ShareChannel } from "@/lib/share/channels";

const t = compartir.guiaPublica;

export const metadata: Metadata = pageMetadata({
  titulo: t.meta.titulo,
  descripcion: t.meta.descripcion,
  path: href("guiaLinkReservas"),
});

function nota(channel: ShareChannel): string {
  if (channel === "instagram") {
    return compartir.canales.instagram.nota({ marca: brand.name });
  }
  return compartir.canales[channel].nota;
}

export default function ComparteTuLinkPage() {
  return (
    <div className="flex min-h-dvh flex-col bg-canvas">
      <SiteHeader />

      <main className="flex-1">
        <section className="mx-auto max-w-3xl px-4 py-14 text-center sm:px-8 sm:py-18">
          <h1 className="font-display text-30 font-bold tracking-display text-ink sm:text-40">
            {t.titulo}
          </h1>
          <p className="mt-4 text-16 leading-relaxed text-muted">{t.intro}</p>
          <nav aria-label={t.indice} className="mt-6">
            <ul className="flex flex-wrap justify-center gap-2">
              {SHARE_CHANNELS.map((c) => (
                <li key={c}>
                  <a
                    href={`#${c}`}
                    className="inline-flex h-10 items-center rounded-full bg-surface px-4 text-14 font-semibold text-ink transition-colors duration-150 ease-out hover:bg-line-strong focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink focus-visible:transition-none"
                  >
                    {compartir.canales[c].nombre}
                  </a>
                </li>
              ))}
            </ul>
          </nav>
        </section>

        <div className="mx-auto flex max-w-3xl flex-col gap-6 px-4 pb-6 sm:px-8">
          {SHARE_CHANNELS.map((c) => {
            const canal = compartir.canales[c];
            return (
              <section
                key={c}
                id={c}
                className="flex scroll-mt-24 flex-col gap-4 rounded-tile bg-surface p-5.5 sm:p-8"
              >
                <h2 className="font-display text-22 font-bold tracking-display text-ink">
                  {t.pasosTitulo({ canal: canal.nombre })}
                </h2>
                <ol className="flex flex-col gap-3">
                  {[
                    canal.pasos.uno,
                    canal.pasos.dos,
                    canal.pasos.tres,
                    canal.pasos.cuatro,
                  ].map((step, i) => (
                    <li key={step} className="flex items-start gap-3">
                      <span
                        aria-hidden="true"
                        className="flex size-8 shrink-0 items-center justify-center rounded-full bg-canvas font-display text-15 font-bold text-ink"
                      >
                        {i + 1}
                      </span>
                      <span className="pt-1.5 text-15 leading-body text-ink">
                        {step}
                      </span>
                    </li>
                  ))}
                </ol>
                <p className="text-14 leading-body text-muted">{nota(c)}</p>
              </section>
            );
          })}

          <section className="flex flex-col gap-2 rounded-tile bg-surface p-5.5 sm:p-8">
            <h2 className="font-display text-22 font-bold tracking-display text-ink">
              {t.qr.titulo}
            </h2>
            <p className="text-15 leading-body text-ink">
              {t.qr.texto({ marca: brand.name })}
            </p>
          </section>

          <p className="text-13 leading-body text-muted">
            {compartir.guias.aviso}
          </p>
        </div>

        <CtaBand
          title={t.cta.titulo}
          text={t.cta.texto}
          buttonLabel={t.cta.boton}
          href={SIGNUP_PATH}
        />
      </main>

      <SiteFooter />
    </div>
  );
}
