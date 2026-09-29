"use client";
// Räknare "kostnad per anställd" (/precios, sitio-v3): ett reglage 1–12 anställda som visar
// priset per anställd för Equipo eller Local — vilken av de två beror på hur många som ryms
// (SITIO_PRECIOS_TABLA "Profesionales": Equipo "Hasta 5", Local "Hasta 12"). Priset rullar
// (räknar upp/ned) när reglaget flyttas i stället för att bara byta text i ett hopp, samma
// känsla som de dekorativa "rullande siffrorna" i hero-bento/por-que-bento, fast här styrd av
// användaren, så den bygger på `requestAnimationFrame` i stället för en CSS-loop (ingen
// färdig fasförskjuten keyframe kan matcha ett godtyckligt reglagevärde). Respekterar
// `prefers-reduced-motion` (hoppar direkt till slutvärdet i stället för att räkna).
import { useEffect, useRef, useState } from "react";

import { formatMonto, precioPlan } from "@/config/pricing";
import { copy } from "@/i18n/marketing";

const EXTRA = copy.sitio.precios.extra.raknare;

/** SITIO_PRECIOS_TABLA "Profesionales": Equipo llega hasta 5, Local hasta 12 — la tabla no
 * expone el número como dato tipado (son celdas de texto), así que el límite vive acá,
 * junto al único lugar que lo necesita para elegir el plan. */
const EQUIPO_MAX_PROFESIONALES = 5;

function prefersReducedMotion(): boolean {
  if (typeof window === "undefined") return false;
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

/** Cuenta desde el valor anterior hasta `target` en ~350ms (ease-out), o salta directo si el
 * usuario prefiere menos movimiento. */
function useRollingValue(target: number, duration = 350): number {
  const [display, setDisplay] = useState(target);
  const fromRef = useRef(target);

  useEffect(() => {
    const from = fromRef.current;
    if (from === target || prefersReducedMotion()) {
      fromRef.current = target;
      setDisplay(target);
      return;
    }
    const start = performance.now();
    let raf = 0;
    function tick(now: number): void {
      const t = Math.min(1, (now - start) / duration);
      const eased = 1 - (1 - t) ** 3;
      setDisplay(Math.round(from + (target - from) * eased));
      if (t < 1) {
        raf = requestAnimationFrame(tick);
      } else {
        fromRef.current = target;
      }
    }
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [target, duration]);

  return display;
}

export function PrecioCalculadora() {
  const [n, setN] = useState(3);
  const planId = n <= EQUIPO_MAX_PROFESIONALES ? "equipo" : "local";
  const porEmpleado = useRollingValue(
    Math.round(precioPlan(planId) / n),
  );

  return (
    <div className="flex flex-col gap-5 rounded-tile bg-surface p-6 sm:p-8">
      <h3 className="text-19 leading-snug font-bold text-ink">
        {EXTRA.titulo}
      </h3>

      <span className="font-display text-38 font-semibold tracking-display text-ink">
        {formatMonto(porEmpleado)}
      </span>

      <p className="text-14 text-muted">{EXTRA.texto({ n })}</p>

      <div className="flex flex-col gap-2">
        <label
          htmlFor="precio-raknare"
          className="text-13 font-semibold text-ink"
        >
          {n} {EXTRA.sufijo}
        </label>
        <input
          id="precio-raknare"
          type="range"
          min={1}
          max={12}
          step={1}
          value={n}
          onChange={(e) => setN(Number(e.target.value))}
          className="h-2 w-full cursor-pointer rounded-full bg-canvas accent-lime focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink"
        />
        <div className="flex justify-between text-11 font-semibold text-muted">
          <span>1</span>
          <span>12</span>
        </div>
      </div>
    </div>
  );
}
