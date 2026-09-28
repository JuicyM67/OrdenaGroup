// Bokningsflödes-mockup (WP-hemsida v2, punkt 4): en telefonram som loopar igenom de fyra
// stegen som en kund ser på /[slug] — servicio → hora → datos → confirmada — med en
// stegindikator bredvid. Fyra absolut staplade "skärmar", var och en med en egen
// färdigfasad `animate-step-fade-N` (tokens.css) i stället för en delad animation +
// `animation-delay`: ESLint (D-015) tillåter varken `[…]`-klasser eller ett `style` med
// andra nycklar än top/height/left/width i src/components. Stegindikatorns
// `animate-step-dim-N` delar exakt samma tajmning, så den är alltid i synk med skärmen.
// Rent dekorativ (`aria-hidden`): sektionens rubrik/text bär den faktiska informationen.
import { Check } from "lucide-react";

import { Card } from "@/components/ui/card";
import { cn } from "@/components/ui/cn";
import { strokeCard } from "@/components/ui/icons";
import { copy } from "@/i18n/marketing";
import { DEMO } from "./demo-data";

const STEP_ANIMATIONS = [
  "animate-step-fade-1",
  "animate-step-fade-2",
  "animate-step-fade-3",
  "animate-step-fade-4",
] as const;

const DIM_ANIMATIONS = [
  "animate-step-dim-1",
  "animate-step-dim-2",
  "animate-step-dim-3",
  "animate-step-dim-4",
] as const;

const PASOS = [
  copy.sitio.inicio.flujo.pasos.servicio,
  copy.sitio.inicio.flujo.pasos.hora,
  copy.sitio.inicio.flujo.pasos.datos,
  copy.sitio.inicio.flujo.pasos.confirmada,
] as const;

function ServicioFrame() {
  return (
    <div className="flex flex-col gap-2">
      <span className="text-13 font-bold text-on-dark-muted">{PASOS[0]}</span>
      <div className="flex items-center justify-between rounded-tile bg-lime px-3.5 py-3">
        <span className="text-14 font-bold text-ink">{DEMO.kort}</span>
        <span className="text-13 font-semibold text-ink">{DEMO.pris}</span>
      </div>
      <div className="flex items-center justify-between rounded-tile bg-dark-2 px-3.5 py-3">
        <span className="text-14 font-semibold text-on-dark-soft">
          {DEMO.tjanst2}
        </span>
        <span className="text-13 text-on-dark-muted">{DEMO.pris2}</span>
      </div>
    </div>
  );
}

function HoraFrame() {
  return (
    <div className="flex flex-col gap-2">
      <span className="text-13 font-bold text-on-dark-muted">{PASOS[1]}</span>
      <div className="grid grid-cols-3 gap-1.5">
        {["10:00", "11:30", "15:00"].map((hora, i) => (
          <span
            key={hora}
            className={cn(
              "flex h-9 items-center justify-center rounded-control text-13 font-bold",
              i === 1 ? "bg-lime text-ink" : "bg-dark-2 text-on-dark-soft",
            )}
          >
            {hora}
          </span>
        ))}
      </div>
    </div>
  );
}

function DatosFrame() {
  return (
    <div className="flex flex-col gap-2">
      <span className="text-13 font-bold text-on-dark-muted">{PASOS[2]}</span>
      <div className="flex h-9 items-center rounded-control bg-dark-2 px-3.5 text-14 font-semibold text-on-dark-soft">
        {DEMO.kund}
      </div>
      <div className="flex h-9 items-center rounded-control bg-dark-2 px-3.5 text-14 font-semibold text-on-dark-soft">
        +56 9 …
      </div>
    </div>
  );
}

function ConfirmadaFrame() {
  return (
    <div className="flex h-full flex-col items-center justify-center gap-3 text-center">
      <span className="flex size-12 items-center justify-center rounded-full bg-lime text-ink">
        <Check aria-hidden="true" className="size-6" strokeWidth={strokeCard} />
      </span>
      <span className="text-17 font-bold text-on-dark">{PASOS[3]}</span>
    </div>
  );
}

const FRAMES = [ServicioFrame, HoraFrame, DatosFrame, ConfirmadaFrame];

export function FlujoMockup() {
  return (
    <div
      aria-hidden="true"
      className="flex flex-col items-center gap-6 sm:flex-row sm:items-center sm:justify-center"
    >
      <Card
        tone="dark"
        radius="hero"
        padding="lg"
        className="relative h-100 w-64 shrink-0 overflow-hidden"
      >
        <span className="mx-auto mb-5 block h-1.25 w-10 rounded-full bg-dark-2" />
        {FRAMES.map((Frame, i) => (
          <div
            key={PASOS[i]}
            className={cn(
              "absolute inset-x-5 top-14 flex flex-col",
              i === 3 && "inset-y-5",
              STEP_ANIMATIONS[i],
            )}
          >
            <Frame />
          </div>
        ))}
      </Card>

      <div className="flex flex-row flex-wrap justify-center gap-3 sm:flex-col sm:flex-nowrap sm:justify-center">
        {PASOS.map((paso, i) => (
          <span
            key={paso}
            className={cn(
              "flex items-center gap-2 text-14 font-semibold text-ink",
              DIM_ANIMATIONS[i],
            )}
          >
            <span className="flex size-6 shrink-0 items-center justify-center rounded-full bg-ink text-11 font-bold text-on-dark">
              {i + 1}
            </span>
            {paso}
          </span>
        ))}
      </div>
    </div>
  );
}
