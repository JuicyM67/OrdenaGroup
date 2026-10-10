// Sektion 5: "Så bokar dina kunder" (WP-71, SidaP3.dc.html): fyra steg och en mobil med
// bokningsformuläret (steg 3). Telefonen är en dekorativ mockup (`aria-hidden`).
import { Check } from "lucide-react";

import { copy } from "@/i18n/marketing";

import { HomeHeading } from "./home-heading";

const t = copy.home.como;
const m = t.movil;

export function Como() {
  return (
    <section className="bg-canvas">
      <div className="mx-auto grid max-w-360 grid-cols-1 gap-12 px-4 py-16 sm:px-8 lg:grid-cols-2 lg:items-center lg:gap-20 lg:px-22 lg:py-30">
        <div className="flex flex-col gap-5.5">
          <HomeHeading
            etiqueta={t.etiqueta}
            pre={t.tituloPre}
            marca={t.tituloMarca}
          />
          <p className="text-16 leading-relaxed text-muted sm:text-18">
            {t.texto}
          </p>
          <ol className="flex flex-col gap-2.5">
            {t.pasos.map((p, k) => (
              <li
                key={p.titulo}
                className="flex items-center gap-4 rounded-panel border border-line-strong bg-surface px-4.5 py-4"
              >
                <span
                  className={
                    k === 3
                      ? "flex size-11 flex-none items-center justify-center rounded-avatar bg-lime font-bold text-ink"
                      : "flex size-11 flex-none items-center justify-center rounded-avatar bg-canvas font-bold text-ink"
                  }
                >
                  {String(k + 1).padStart(2, "0")}
                </span>
                <span className="flex flex-col">
                  <b className="text-17">{p.titulo}</b>
                  <span className="text-13 text-muted">{p.texto}</span>
                </span>
              </li>
            ))}
          </ol>
        </div>

        <div aria-hidden="true" className="relative flex justify-center">
          <div className="h-150 w-75 rounded-device bg-ink p-3 shadow-float-lg">
            <div className="flex size-full flex-col gap-3 rounded-screen bg-surface px-4.5 py-6.5 text-ink">
              <span className="text-12 font-bold text-muted">{m.paso}</span>
              <b className="font-display text-22">{m.titulo}</b>
              <span className="flex flex-col gap-0.5 rounded-avatar bg-canvas p-3 text-13">
                <span className="text-11 text-muted">{m.resumenTop}</span>
                <b>{m.resumen}</b>
              </span>
              <span className="flex flex-col gap-1 text-12 font-semibold">
                {m.nombreLabel}
                <span className="flex h-11 items-center rounded-event border-2 border-ink px-3 text-14 font-medium">
                  {m.nombre}
                </span>
              </span>
              <span className="flex flex-col gap-1 text-12 font-semibold">
                {m.telLabel}
                <span className="flex h-11 items-center rounded-event bg-canvas px-3 text-14 font-medium">
                  {m.tel}
                </span>
              </span>
              <span className="text-11 leading-body text-muted">{m.nota}</span>
              <span className="mt-auto flex h-12.5 items-center justify-center rounded-control bg-ink font-bold text-on-dark">
                {m.boton}
              </span>
            </div>
          </div>
          <span className="absolute top-8 right-0 flex items-center gap-2 rounded-icon px-3.5 py-3 text-13 font-bold glass-light sm:right-15 lg:top-15">
            <Check
              className="size-4 text-success-fg"
              strokeWidth={2.6}
              aria-hidden="true"
            />
            {m.confirmada}
          </span>
        </div>
      </div>
    </section>
  );
}
