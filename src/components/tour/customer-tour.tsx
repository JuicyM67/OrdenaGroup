// Guidad visning av demoföretagets bokningssida (WP-72, Main/Mobil.dc.html). Lazy chunk:
// importeras bara via `next/dynamic` i BookingScreen när visningsläget är aktivt.
"use client";

import { ArrowRight, Lock } from "lucide-react";
import Link from "next/link";

import { brand, market } from "@/config/brand";
import { href } from "@/config/routes";
import { visita } from "@/i18n";

import { GuidedTour, type TourStep } from "./guided-tour";

const v = visita;
const c = v.cliente;

function buildSteps(): TourStep[] {
  const p = c.pasos;
  const steps: TourStep[] = [
    { id: "servicios", targets: ["services"], ...p.servicios },
    { id: "equipo", targets: ["staff"], ...p.equipo },
    { id: "flash", targets: ["flash"], ...p.flash },
    { id: "resenas", targets: ["rating"], ...p.resenas },
    // Stripe-betalning finns bara i SE (steget hoppas över i CL).
    ...(market === "SE"
      ? [{ id: "pago", targets: ["payment"], ...p.pago }]
      : []),
    { id: "reservar", targets: ["book-bar", "book"], ...p.reservar },
  ].map((s) => ({
    id: s.id,
    targets: s.targets,
    title: s.titulo,
    text: s.texto,
    compactText: s.corto,
    chips: s.chips,
  }));
  return steps;
}

const STEPS = buildSteps();

const BTN_GHOST =
  "flex h-13.5 items-center justify-center rounded-full border-2 border-bronze/35 bg-surface/55 px-4.5 font-bold text-tour-soft focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-bronze";

export default function CustomerTour({
  coverUrl,
  onStepChange,
}: {
  coverUrl: string | null;
  onStepChange?: (id: string | null) => void;
}) {
  return (
    <GuidedTour
      steps={STEPS}
      storageKey="tour-cliente"
      doneAria={c.final.aria}
      onStepChange={onStepChange}
      restartClassName="bottom-28 left-3 lg:bottom-6 lg:left-10"
      copy={{
        skip: v.comun.saltar,
        back: v.comun.atras,
        next: v.comun.siguiente,
        restart: v.comun.reiniciar,
        progress: v.comun.progreso,
        counter: (n, total) => v.comun.contador({ n, total }),
      }}
      welcome={{
        aria: c.bienvenida.aria,
        title: c.bienvenida.titulo,
        text: c.bienvenida.texto,
        start: c.bienvenida.empezar,
        skip: c.bienvenida.saltar,
        pills: { label: v.rubros.etiqueta, items: v.rubros.items },
      }}
      renderDone={({ industry, close }) => {
        const slug =
          v.rubros.items.find((i) => i.id === industry)?.slug ??
          v.rubros.items[0]!.slug;
        const prefix = brand.domain ? `${brand.domain}/` : "/";
        return (
          <div className="flex flex-col gap-3">
            <div className="relative h-45 overflow-hidden rounded-shell bg-dark sm:h-57.5">
              {coverUrl ? (
                // eslint-disable-next-line @next/next/no-img-element -- lazy chunk, samma som profilhuvudet.
                <img
                  src={coverUrl}
                  alt=""
                  className="absolute inset-0 size-full object-cover"
                />
              ) : null}
              <span
                aria-hidden="true"
                className="absolute inset-0 tour-scrim"
              />
              <span className="absolute top-4.5 left-4.5 rounded-event px-3 py-1.5 text-13 font-bold tour-glass">
                {c.final.etiqueta}
              </span>
              <div className="absolute inset-x-4.5 bottom-4.5 flex h-12.5 items-center gap-2.5 rounded-icon pr-2 pl-4 tour-glass sm:h-14.5">
                <Lock
                  aria-hidden="true"
                  className="size-4 shrink-0"
                  strokeWidth={2.4}
                />
                <b className="min-w-0 flex-1 truncate text-15 tracking-title sm:text-20">
                  {prefix}
                  <span className="text-bronze">{slug}</span>
                </b>
                <span className="flex h-9 items-center rounded-avatar px-3.5 text-13 font-bold tour-bronze sm:h-10.5">
                  {c.final.live}
                </span>
              </div>
            </div>
            <div className="flex flex-col gap-3.5 rounded-shell p-4.5 tour-glass sm:p-6.5">
              <h2 className="font-display text-24 leading-snug font-semibold sm:text-32">
                {c.final.titulo}
              </h2>
              <p className="text-14 leading-relaxed text-tour-soft sm:text-15">
                <span className="sm:hidden">{c.final.corto}</span>
                <span className="hidden sm:inline">{c.final.texto}</span>
              </p>
              <div className="flex flex-col gap-2.5 sm:flex-row">
                <Link
                  href="/login"
                  data-autofocus
                  className="flex h-13 shrink-0 items-center justify-center gap-2.5 rounded-full bg-ink font-bold text-on-dark focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-bronze sm:h-13.5 sm:flex-1"
                >
                  {c.final.cta}
                  <ArrowRight
                    aria-hidden="true"
                    className="size-4.5 text-lime"
                    strokeWidth={2.5}
                  />
                </Link>
                <button type="button" onClick={close} className={BTN_GHOST}>
                  {c.final.seguir}
                </button>
              </div>
              <Link
                href={href("ejemploNegocio")}
                className="self-center text-13 font-semibold text-bronze underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-bronze"
              >
                {c.final.negocio}
              </Link>
            </div>
          </div>
        );
      }}
    />
  );
}
