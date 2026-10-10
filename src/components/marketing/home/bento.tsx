// Sektion 4: Funktioner-bento över ett hudterapeut-foto med glasrutor (WP-71,
// SidaP3.dc.html). Den stora rutan är betalning vid bokning på SE och påminnelser på CL
// (marknadens texter, se `copy.home.bento.grande`).
import { Check, Star, Zap } from "lucide-react";
import Image from "next/image";

import { copy } from "@/i18n/marketing";

import { HomeHeading } from "./home-heading";

const t = copy.home.bento;

const label = "text-12 font-bold tracking-label text-ink-soft";
const glass = "glass-light flex flex-col gap-3.5 rounded-hero p-7";

export function Bento() {
  return (
    <section className="relative overflow-hidden text-on-dark">
      <Image
        src="/marketing/hudterapeut.webp"
        alt=""
        fill
        sizes="100vw"
        className="object-cover brightness-45"
      />
      <div className="relative mx-auto max-w-360 px-4 py-16 sm:px-8 lg:px-22 lg:py-30">
        <div className="mb-10 flex flex-col justify-between gap-6 lg:flex-row lg:items-end lg:gap-10">
          <HomeHeading
            etiqueta={t.etiqueta}
            pre={t.tituloPre}
            marca={t.tituloMarca}
          />
          <p className="max-w-95 text-16 leading-relaxed text-on-dark/90 sm:text-17">
            {t.texto}
          </p>
        </div>

        <div className="grid gap-4 lg:grid-cols-12">
          <div className={`${glass} min-h-95 lg:col-span-6`}>
            <span className={label}>{t.grande.etiqueta}</span>
            <h3 className="font-display text-30 leading-snug font-semibold">
              {t.grande.titulo}
            </h3>
            <p className="text-15 leading-relaxed text-ink-soft">
              {t.grande.texto}
            </p>
            <div className="mt-auto flex items-stretch gap-3">
              <div className="flex flex-1 flex-col gap-2 rounded-panel bg-surface p-4 text-ink shadow-soft">
                <span className="text-12 text-muted">
                  {t.grande.ejemploLinea}
                </span>
                <b className="text-18">{t.grande.ejemploValor}</b>
                <span className="flex h-10 items-center justify-center gap-1.5 rounded-event bg-success-bg text-13 font-bold text-success-fg">
                  <Check
                    className="size-4"
                    strokeWidth={2.6}
                    aria-hidden="true"
                  />
                  {t.grande.ejemploEstado}
                </span>
              </div>
              <div className="flex flex-1 flex-col justify-between gap-2 rounded-panel bg-ink p-4 text-on-dark">
                <span className="text-12 text-on-dark-muted">
                  {t.grande.cajaEtiqueta}
                </span>
                <b className="font-display text-40 leading-none text-lime">
                  {t.grande.cajaValor}
                </b>
                <span className="text-12 text-on-dark-soft">
                  {t.grande.cajaTexto}
                </span>
              </div>
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2 lg:col-span-6">
            <div className={glass}>
              <span className={label}>{t.resenas.etiqueta}</span>
              <span className="flex items-baseline gap-2.5">
                <b className="font-display text-54 leading-none">
                  {t.resenas.nota}
                </b>
                <span className="flex gap-0.5" aria-hidden="true">
                  {[0, 1, 2, 3, 4].map((k) => (
                    <Star
                      key={k}
                      className="size-3.5 fill-full-dot text-full-dot"
                      strokeWidth={0}
                    />
                  ))}
                </span>
              </span>
              <p className="text-15 leading-relaxed text-ink-soft">
                {t.resenas.texto}
              </p>
            </div>
            <div className={glass}>
              <span className={label}>{t.flash.etiqueta}</span>
              <span className="flex animate-pulse-ring items-center gap-2 self-start rounded-control bg-lime px-3.5 py-2.5 font-bold text-on-lime-soft">
                <Zap
                  className="size-4 fill-current"
                  strokeWidth={0}
                  aria-hidden="true"
                />
                {t.flash.chip}
              </span>
              <p className="text-15 leading-relaxed text-ink-soft">
                {t.flash.texto}
              </p>
            </div>
          </div>

          {t.pequenas.map((c) => (
            <div key={c.etiqueta} className={`${glass} lg:col-span-4`}>
              <span className={label}>{c.etiqueta}</span>
              <b className="font-display text-24 leading-snug">{c.titulo}</b>
              <span className="text-14 leading-relaxed text-ink-soft">
                {c.texto}
              </span>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
