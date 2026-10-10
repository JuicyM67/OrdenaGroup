// Sektionen direkt under heron (WP-hemsida, mappad från
// `.visual-diff/ref/sida-v2-morka-band.html`, första sektionen): stor rubrik till vänster
// + tre statsrutor till höger (statiska värden, inga rullande siffror).
import { cn } from "@/components/ui/cn";
import { copy } from "@/i18n/marketing";

const INTRO = copy.sitio.inicio.intro;

function DisponibleStat() {
  return (
    <div className="flex flex-col gap-1 rounded-card bg-surface p-4.5">
      <div className="font-display text-40 leading-11.5 font-bold text-ink">
        {INTRO.stats.disponible.valor}
      </div>
      <span className="text-12 text-muted">{INTRO.stats.disponible.pie}</span>
    </div>
  );
}

function StatTileSimple({
  valor,
  pie,
  tone,
}: {
  valor: string;
  pie: string;
  tone: "lime" | "dark";
}) {
  return (
    <div
      className={cn(
        "flex flex-col gap-1 rounded-card p-4.5",
        tone === "lime" ? "bg-lime" : "bg-dark",
      )}
    >
      <div
        className={cn(
          "font-display text-40 leading-11.5 font-bold",
          tone === "lime" ? "text-on-lime-soft" : "text-lime",
        )}
      >
        {valor}
      </div>
      <span
        className={cn(
          "text-12",
          tone === "lime" ? "text-on-lime-soft" : "text-on-dark-muted",
        )}
      >
        {pie}
      </span>
    </div>
  );
}

export function IntroBand() {
  return (
    <section className="mx-auto grid max-w-6xl gap-8 px-4 py-10 sm:px-8 sm:py-14 lg:grid-cols-2 lg:items-end lg:gap-10">
      <h2 className="font-display text-32 leading-hero font-semibold tracking-display text-ink sm:text-40">
        {INTRO.titulo}{" "}
        <span className="text-violet">{INTRO.tituloDestacado}</span>
      </h2>
      <div className="grid grid-cols-3 gap-3">
        <DisponibleStat />
        <StatTileSimple
          valor={INTRO.stats.minutos.valor}
          pie={INTRO.stats.minutos.pie}
          tone="lime"
        />
        <StatTileSimple
          valor={INTRO.stats.comision.valor}
          pie={INTRO.stats.comision.pie}
          tone="dark"
        />
      </div>
    </section>
  );
}
