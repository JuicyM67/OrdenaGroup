// Sektionen direkt under heron (WP-hemsida, mappad från
// `.visual-diff/ref/sida-v2-morka-band.html`, första sektionen): stor rubrik till vänster
// + tre statsrutor till höger. Den första rutan rullar 0→8→16→24/7 innan den landar på det
// riktiga värdet (`copy.sitio.inicio.intro.stats.disponible.valor`) — samma teknik som
// hero-bento.tsx:s "Comisión"-ruta (`animate-hero-comision`, fyra rader, samma animation
// återanvänd här i stället för en ny token), de tre mellanstegen är dekorativa siffror
// (språkoberoende), inte text som behöver översättas.
import { cn } from "@/components/ui/cn";
import { copy } from "@/i18n/marketing";

const INTRO = copy.sitio.inicio.intro;

function DisponibleStat() {
  return (
    <div className="flex flex-col gap-1 rounded-card bg-surface p-4.5">
      <div className="h-11.5 overflow-hidden">
        <div className="flex animate-hero-comision flex-col font-display text-40 leading-11.5 font-bold text-ink">
          <span>0</span>
          <span>8</span>
          <span>16</span>
          <span>{INTRO.stats.disponible.valor}</span>
        </div>
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
