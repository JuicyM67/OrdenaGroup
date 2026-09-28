// Dekorativ blomform för landningens hero (rediseño, WP-hero, ingen .dc.html-referens):
// en mittcirkel + kronblad runtomkring, ren SVG utan extern path-fil. Bara `fill-*`-tokens,
// aldrig hex. Rent dekorativ — alltid `aria-hidden`, aldrig fokuserbar.
import { cn } from "@/components/ui/cn";

export type DecorativeBlobTone = "lime" | "lilac" | "peach" | "ink";

const FILL: Record<DecorativeBlobTone, string> = {
  lime: "fill-lime",
  lilac: "fill-lilac",
  peach: "fill-peach",
  ink: "fill-ink",
};

const PETAL_COUNT = 6;
const CENTER = 50;
const PETAL_DISTANCE = 24;
const PETAL_RADIUS = 26;
const CENTER_RADIUS = 20;

const PETALS = Array.from({ length: PETAL_COUNT }, (_, i) => {
  const angle = (i / PETAL_COUNT) * Math.PI * 2;
  return {
    cx: CENTER + Math.cos(angle) * PETAL_DISTANCE,
    cy: CENTER + Math.sin(angle) * PETAL_DISTANCE,
  };
});

export function DecorativeBlob({
  tone,
  className,
}: {
  tone: DecorativeBlobTone;
  className?: string;
}) {
  return (
    <svg
      viewBox="0 0 100 100"
      aria-hidden="true"
      className={cn(FILL[tone], className)}
    >
      {PETALS.map((petal) => (
        <circle
          key={`${petal.cx}-${petal.cy}`}
          cx={petal.cx}
          cy={petal.cy}
          r={PETAL_RADIUS}
        />
      ))}
      <circle cx={CENTER} cy={CENTER} r={CENTER_RADIUS} />
    </svg>
  );
}
