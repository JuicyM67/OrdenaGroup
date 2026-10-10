// Sektion 8: Frågor & svar (WP-71, SidaP3.dc.html) med native <details>/<summary>
// (tangentbord och skärmläsare gratis). Första frågan är öppen.
import { ChevronDown } from "lucide-react";

import { anchor } from "@/config/url-params";
import { copy } from "@/i18n/marketing";

const t = copy.home.faq;

export function Faq() {
  return (
    <section id={anchor("preguntas")} className="scroll-mt-24 bg-canvas">
      <div className="mx-auto grid max-w-360 gap-10 px-4 py-16 sm:px-8 lg:grid-cols-12 lg:px-22 lg:py-30">
        <div className="flex flex-col gap-4.5 lg:col-span-4">
          <span className="self-start rounded-chip bg-surface px-3 py-1.75 text-13 font-bold tracking-label">
            {t.etiqueta}
          </span>
          <h2 className="font-display text-44 leading-none font-semibold tracking-headline sm:text-52">
            {t.titulo}
          </h2>
          <p className="text-16 leading-relaxed text-muted">{t.texto}</p>
        </div>
        <div className="lg:col-span-8">
          {t.items.map((item, k) => (
            <details
              key={item.pregunta}
              open={k === 0}
              className="group border-t border-line-strong px-1 py-5"
            >
              <summary className="flex cursor-pointer list-none items-center justify-between gap-5 rounded-event text-16 font-bold focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-ink sm:text-18">
                {item.pregunta}
                <span className="flex size-9 flex-none items-center justify-center rounded-event bg-canvas group-open:bg-surface">
                  <ChevronDown
                    aria-hidden="true"
                    className="size-4 transition-transform duration-300 group-open:rotate-180"
                    strokeWidth={2.5}
                  />
                </span>
              </summary>
              <p className="mt-3 max-w-190 text-16 leading-relaxed text-muted">
                {item.respuesta}
              </p>
            </details>
          ))}
        </div>
      </div>
    </section>
  );
}
