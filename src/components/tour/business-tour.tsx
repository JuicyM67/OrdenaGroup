// Guidad visning av företagsvyns mockup (WP-72, Foretag.dc.html). Lazy chunk.
"use client";

import { ArrowRight } from "lucide-react";
import Link from "next/link";

import { visita } from "@/i18n";

import { GuidedTour, type TourStep } from "./guided-tour";
import { SIGNUP_PATH } from "@/config/routes";

const v = visita;
const n = v.negocio;

function step(
  id: string,
  targets: string[],
  s: { titulo: string; texto: string; chips: readonly string[] },
): TourStep {
  return { id, targets, title: s.titulo, text: s.texto, chips: s.chips };
}

const STEPS: TourStep[] = [
  step("semana", ["week"], n.pasos.semana),
  step("solicitudes", ["requests"], n.pasos.solicitudes),
  step("flash", ["flash"], n.pasos.flash),
  step("resenas", ["reviews"], n.pasos.resenas),
  step("caja", ["caja"], n.pasos.caja),
];

export default function BusinessTour({
  nombre,
  onStepChange,
}: {
  nombre: string;
  onStepChange: (id: string | null) => void;
}) {
  return (
    <GuidedTour
      steps={STEPS}
      storageKey="tour-negocio"
      doneAria={n.final.aria}
      onStepChange={onStepChange}
      restartClassName="bottom-4 left-4 xl:left-64"
      copy={{
        skip: v.comun.saltar,
        back: v.comun.atras,
        next: v.comun.siguiente,
        restart: v.comun.reiniciar,
        progress: v.comun.progreso,
        counter: (i, total) => v.comun.contador({ n: i, total }),
      }}
      welcome={{
        aria: n.aria,
        title: n.bienvenida.titulo,
        text: n.bienvenida.texto({ negocio: n.nombre, nombre }),
        start: n.bienvenida.empezar,
        skip: n.bienvenida.saltar,
      }}
      renderDone={({ close }) => (
        <div className="flex flex-col gap-3.5 rounded-shell p-6 tour-glass sm:p-7.5">
          <span className="self-start rounded-event bg-lime px-3.5 py-1.75 text-13 font-bold text-ink">
            {n.final.etiqueta}
          </span>
          <h2 className="font-display text-30 leading-snug font-semibold">
            {n.final.titulo}
          </h2>
          <p className="text-15 leading-relaxed text-muted">{n.final.texto}</p>
          <div className="flex flex-col gap-2.5 sm:flex-row">
            <Link
              href={SIGNUP_PATH}
              data-autofocus
              className="flex h-13.5 shrink-0 items-center justify-center gap-2.5 rounded-full bg-lilac font-bold text-ink focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink sm:flex-1"
            >
              {n.final.cta}
              <ArrowRight
                aria-hidden="true"
                className="size-4.5 text-ink"
                strokeWidth={2.5}
              />
            </Link>
            <button
              type="button"
              onClick={close}
              className="flex h-13.5 items-center justify-center rounded-full border-2 border-ink/15 bg-surface/60 px-4.5 font-bold text-muted focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink"
            >
              {n.final.seguir}
            </button>
          </div>
        </div>
      )}
    />
  );
}
