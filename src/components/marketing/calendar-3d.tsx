// Footerns svävande 3D-kalender (WP-hemsida, mappad från `.visual-diff/ref/footer.html`).
// Rent dekorativ (`aria-hidden`) — `brand.name`/`brand.tagline` runt om bär informationen.
// Referensens SVG bygger djupet med `linearGradient`/`radialGradient` (stop-color i hex).
// SVG:s `stop-color` har ingen Tailwind-klass att mappa till (till skillnad från `fill`/
// `stroke`, som Tailwind genererar automatiskt ur `--color-*`), så gradienterna är
// förenklade till platta tonfyllningar här — en medveten avvikelse, se DESIGN.md
// "Nya tokens (WP-hemsida, startsidan efter heron + footer)". `animate-float` (redan i
// tokens.css, används annars i hero-bento.tsx) ger svävningen; skuggellipsen använder den
// nya `animate-shadow-pulse` i samma takt (6s).
export function Calendar3D({ className }: { className?: string }) {
  return (
    <div className={className}>
      <div aria-hidden="true" className="relative mx-auto aspect-square w-full">
        <div className="absolute inset-x-6 bottom-0 h-6 animate-shadow-pulse rounded-full bg-ink/45 blur-glass" />
        <svg
          viewBox="0 0 220 220"
          className="relative h-full w-full animate-float overflow-visible"
        >
          {/* Sidoskugga: en andra platta bakom kroppen, förskjuten ned/åt höger. */}
          <rect
            x={34}
            y={52}
            width={160}
            height={150}
            rx={30}
            className="fill-border"
          />
          <rect
            x={28}
            y={42}
            width={160}
            height={150}
            rx={30}
            className="fill-surface"
          />
          {/* Lime-topp, rundad bara upptill (path i stället för rect, samma geometri som
              referensen). */}
          <path
            d="M28 72 a30 30 0 0 1 30 -30 h100 a30 30 0 0 1 30 30 v18 h-160z"
            className="fill-lime"
          />
          <rect
            x={28}
            y={88}
            width={160}
            height={4}
            className="fill-flash-dot opacity-35"
          />
          <text
            x={108}
            y={160}
            textAnchor="middle"
            fontSize={64}
            fontWeight={700}
            className="fill-ink font-display"
          >
            16
          </text>
          <text
            x={108}
            y={182}
            textAnchor="middle"
            fontSize={12}
            fontWeight={700}
            letterSpacing={2}
            className="fill-violet font-sans"
          >
            MIÉ
          </text>
          {/* Metallringar. */}
          <rect
            x={62}
            y={28}
            width={16}
            height={36}
            rx={8}
            className="fill-dark-2"
          />
          <rect
            x={138}
            y={28}
            width={16}
            height={36}
            rx={8}
            className="fill-dark-2"
          />
          <ellipse cx={70} cy={62} rx={9} ry={4} className="fill-ink/35" />
          <ellipse cx={146} cy={62} rx={9} ry={4} className="fill-ink/35" />
          {/* Glans: en ljus platta i stället för referensens radiella gradient. */}
          <rect
            x={28}
            y={42}
            width={160}
            height={150}
            rx={30}
            className="fill-surface/45"
          />
          <circle cx={160} cy={132} r={15} className="fill-ink" />
          <path
            d="M153 132 l5 5 l9 -10"
            className="stroke-lime"
            strokeWidth={3.5}
            fill="none"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      </div>
    </div>
  );
}
