// "Para quién" som en oändlig rullande banner (WP-hemsida v2, punkt 7): ersätter de fyra
// statiska rutorna som fanns på startsidan tidigare (branschsidorna /para/* finns kvar,
// nås via megamenyn och footern). Två rader åt olika håll, fade i kanterna via en maskerad
// overflow-hidden-container (bara `canvas`→`transparent`, samma tokens som resten av
// sidan — inte agendans `bg-agenda`, som DESIGN.md §4 reserverar för agendapanelen), pausar
// vid hover (`marquee-pausable`, tokens.css). Dekorativ komposition, som `HeroVisualPreview`:
// en enda `role="img"` + `aria-label` i stället för att exponera 24×2 upprepade rubroser för
// skärmläsare. `prefers-reduced-motion`: den duplicerade halvan (för den sömlösa loopen)
// göms med `motion-reduce:hidden` och raden wrappar normalt — en statisk lista, aldrig rörelse.
import { cn } from "@/components/ui/cn";
import { copy } from "@/i18n/marketing";

const ALL = copy.SITIO_RUBROS_MARQUEE;
const MID = Math.ceil(ALL.length / 2);
const ROW_A = ALL.slice(0, MID);
const ROW_B = ALL.slice(MID);

function MarqueeRow({
  items,
  reverse,
}: {
  items: readonly { emoji: string; nombre: string }[];
  reverse?: boolean;
}) {
  const doubled = [...items, ...items];
  return (
    <div
      className={cn(
        "flex w-max flex-nowrap gap-8 whitespace-nowrap marquee-pausable motion-reduce:w-full motion-reduce:flex-wrap",
        reverse ? "animate-marquee-reverse" : "animate-marquee",
      )}
    >
      {doubled.map((item, i) => (
        <span
          key={`${item.nombre}-${i}`}
          className={cn(
            "flex items-center gap-2 text-18 font-semibold text-ink",
            i >= items.length && "motion-reduce:hidden",
          )}
        >
          {item.nombre}
          <span aria-hidden="true">{item.emoji}</span>
        </span>
      ))}
    </div>
  );
}

export function RubrosMarquee() {
  return (
    <div
      role="img"
      aria-label={copy.sitio.inicio.marquee.aria}
      className="relative overflow-hidden py-2"
    >
      <div className="pointer-events-none absolute inset-y-0 left-0 z-10 w-16 bg-gradient-to-r from-canvas to-transparent sm:w-28" />
      <div className="pointer-events-none absolute inset-y-0 right-0 z-10 w-16 bg-gradient-to-l from-canvas to-transparent sm:w-28" />
      <div aria-hidden="true" className="flex flex-col gap-4">
        <MarqueeRow items={ROW_A} />
        <MarqueeRow items={ROW_B} reverse />
      </div>
    </div>
  );
}
