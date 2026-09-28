// Bokningsflödes-mockup (WP-hemsida v2, punkt 4; retro 2026-09-28 punkt 2/3): en telefonram
// som loopar igenom de fyra stegen en kund ser på /[slug] — servicio → hora → datos →
// confirmada — plus en stegindikator. Två exporter i stället för en:
// - `FlujoPhoneMockup`: bara telefonen, rent dekorativ (`aria-hidden`).
// - `FlujoSteps`: den numrerade listan med en fyllande progress-linje. Sedan retrot ligger den
//   bredvid rubrik/text i vänsterkolumnen (page.tsx), inte bara bredvid telefonen, så den är
//   INTE längre `aria-hidden` — texten är nu riktigt innehåll (fyra reella steg), inte bara en
//   dekorativ upprepning av rubriken.
// Fyra absolut staplade "skärmar" i telefonen, var och en med en egen färdigfasad
// `animate-step-slide-N` (tokens.css, retro 2026-09-28: gled tidigare bara med opacitet via
// `step-fade-N` — nu glider skärmarna in/ut i sidled också) i stället för en delad animation +
// `animation-delay`: ESLint (D-015) tillåter varken `[…]`-klasser eller ett `style` med andra
// nycklar än top/height/left/width i src/components. Stegindikatorns progress-linje
// (`animate-flujo-progress`) delar exakt samma tajmning som skärmarna.
import { Check } from "lucide-react";

import { Card } from "@/components/ui/card";
import { cn } from "@/components/ui/cn";
import { strokeCard } from "@/components/ui/icons";
import { copy } from "@/i18n/marketing";
import { DEMO } from "./demo-data";

const STEP_ANIMATIONS = [
  "animate-step-slide-1",
  "animate-step-slide-2",
  "animate-step-slide-3",
  "animate-step-slide-4",
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

/** El "dedo" que toca la hora elegida (retro 2026-09-28, punto 2): un anillo que crece desde
 * el botón lime y se desvanece, sincronizado con la ventana en que HoraFrame está visible
 * (animate-flujo-tap, tokens.css). Puramente decorativo, sobre el botón ya seleccionado. */
function TapPulse() {
  return (
    <span
      aria-hidden="true"
      className="pointer-events-none absolute inset-0 flex items-center justify-center"
    >
      <span className="size-9 animate-flujo-tap rounded-full bg-lime" />
    </span>
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
              "relative flex h-9 items-center justify-center rounded-control text-13 font-bold",
              i === 1 ? "bg-lime text-ink" : "bg-dark-2 text-on-dark-soft",
            )}
          >
            {i === 1 ? <TapPulse /> : null}
            <span className="relative">{hora}</span>
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

/** Cuatro puntos de confeti (tokens de color puros) que salen disparados del check al
 * confirmar (retro 2026-09-28, punto 2), cada uno con la misma `animate-flujo-confetti`
 * (tokens.css) pero envuelto en un `rotate-*` estático distinto, así una sola animación de
 * traslación vertical basta para que los cuatro vuelen en direcciones distintas. */
const CONFETTI = [
  { rotate: "-rotate-45", tone: "bg-lilac" },
  { rotate: "rotate-45", tone: "bg-peach" },
  { rotate: "-rotate-12", tone: "bg-sky" },
  { rotate: "rotate-12", tone: "bg-lime" },
] as const;

function ConfirmadaFrame() {
  return (
    <div className="flex h-full flex-col items-center justify-center gap-3 text-center">
      <span className="relative flex size-12 items-center justify-center">
        {CONFETTI.map((dot, i) => (
          <span
            key={i}
            aria-hidden="true"
            className={cn(
              "pointer-events-none absolute inset-0 flex justify-center",
              dot.rotate,
            )}
          >
            <span
              className={cn(
                "size-1.5 animate-flujo-confetti rounded-full",
                dot.tone,
              )}
            />
          </span>
        ))}
        <span className="flex size-12 animate-flujo-check-pop items-center justify-center rounded-full bg-lime text-ink">
          <Check
            aria-hidden="true"
            className="size-6"
            strokeWidth={strokeCard}
          />
        </span>
      </span>
      <span className="text-17 font-bold text-on-dark">{PASOS[3]}</span>
    </div>
  );
}

const FRAMES = [ServicioFrame, HoraFrame, DatosFrame, ConfirmadaFrame];

/** Solo el teléfono, sin la lista de pasos (retro 2026-09-28, punto 3: la sección los separa
 * en dos columnas). Puramente decorativo — `FlujoSteps` lleva el texto real. */
export function FlujoPhoneMockup({ className }: { className?: string }) {
  return (
    <Card
      tone="dark"
      radius="hero"
      padding="lg"
      aria-hidden="true"
      className={cn(
        "relative mx-auto h-100 w-64 shrink-0 overflow-hidden",
        className,
      )}
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
  );
}

/** Lista numerada con una línea vertical que se va llenando (`animate-flujo-progress`,
 * tokens.css), en el mismo compás que `FlujoPhoneMockup`. Contenido real (no decorativo): los
 * cuatro pasos que ve el cliente, así que no lleva `aria-hidden`. */
export function FlujoSteps({ className }: { className?: string }) {
  return (
    <ol className={cn("relative flex flex-col gap-5", className)}>
      <span
        aria-hidden="true"
        className="absolute top-3 bottom-3 left-3 w-0.5 -translate-x-1/2 bg-border"
      >
        <span className="block w-full animate-flujo-progress bg-ink" />
      </span>
      {PASOS.map((paso, i) => (
        <li
          key={paso}
          className={cn(
            "flex items-center gap-3 text-14 font-semibold text-ink",
            DIM_ANIMATIONS[i],
          )}
        >
          <span className="flex size-6 shrink-0 items-center justify-center rounded-full bg-ink text-11 font-bold text-on-dark">
            {i + 1}
          </span>
          {paso}
        </li>
      ))}
    </ol>
  );
}
