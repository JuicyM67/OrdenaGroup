// "Para quién": helbrett mörkt rullande band, en rad (WP-hemsida, mappad från
// `.visual-diff/ref/sida-v1-bento.html`, marquee-sektionen). Ersätter den tidigare
// tvåradiga, ljusa versionen (pastellpiller) — nu ett enda mörkt band som bryter ut ur
// containern (`left-1/2 w-screen -translate-x-1/2`, det vanliga full-bleed-tricket:
// oberoende av vilken `max-w-*`-container den ligger i). Namnen separeras av respektive
// branschs egen emoji (ägarens val, "emoji mellan branscherna") — färgen cyklar
// lime/lilac/peach för att skilja avdelarna åt utan att göra texten själv färgad.
// `pr-3` = samma som `gap-3`: raden blir exakt 2 × (lista + mellanrum), så att
// translateX(-50 %) landar sömlöst i stället för att hoppa ett halvt mellanrum per varv.
// Pausar vid hover (`marquee-pausable`, tokens.css). `prefers-reduced-motion`: den
// duplicerade halvan (för den sömlösa loopen) göms med `motion-reduce:hidden` och raden
// wrappar normalt — en statisk lista, aldrig rörelse. Dekorativ komposition (som
// `HeroVisualPreview`): en enda `role="img"` + `aria-label`, inte 48 upprepade branscher
// för skärmläsare. Renderas direkt under `<main>` i page.tsx, INTE inuti en
// `mx-auto max-w-6xl px-4`-sektion (annars behövs `w-screen`/`left-1/2` för att bryta ut,
// vilket kan lägga på en extra horisontell scrollbredd om sidan har en synlig
// skrollist — `<main>` saknar egen padding, så `w-full` räcker för kant-till-kant).
import { cn } from "@/components/ui/cn";
import { copy } from "@/i18n/marketing";

const ITEMS = copy.SITIO_RUBROS_MARQUEE;

const DOT_TONE = ["text-lime", "text-lilac", "text-peach"] as const;

function MarqueeRow() {
  const doubled = [...ITEMS, ...ITEMS];
  return (
    <div className="flex w-max animate-marquee flex-nowrap items-center gap-3 pr-3 whitespace-nowrap marquee-pausable motion-reduce:w-full motion-reduce:flex-wrap motion-reduce:justify-center">
      {doubled.map((item, i) => (
        <span
          key={`${item.nombre}-${i}`}
          className={cn(
            "flex items-center gap-3 font-display text-24 font-semibold text-on-dark sm:text-32",
            i >= ITEMS.length && "motion-reduce:hidden",
          )}
        >
          {item.nombre}
          <span aria-hidden="true" className={DOT_TONE[i % DOT_TONE.length]}>
            {item.emoji}
          </span>
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
      className="w-full overflow-hidden bg-ink py-6"
    >
      <div aria-hidden="true">
        <MarqueeRow />
      </div>
    </div>
  );
}
