// Se DESIGN.md §7 "Byggt i WP-12". Statisk (referensens tre prickar "Mostrar").
import { Card } from "@/components/ui/card";
import { cn } from "@/components/ui/cn";
import { agenda } from "@/i18n";

const ROWS = [
  { tone: "bg-lime", label: agenda.panel.horasFlash },
  { tone: "bg-peach", label: agenda.panel.desdeListaDeEspera },
  { tone: "bg-blocked", label: agenda.panel.bloqueosYAlmuerzo },
] as const;

export function LegendCard() {
  return (
    <Card
      as="section"
      aria-label={agenda.panel.mostrarAria}
      tone="dark"
      radius="card"
      padding="none"
      className="flex flex-col gap-2.5 px-5 py-4.5"
    >
      <h2 className="text-17 font-semibold">{agenda.panel.mostrar}</h2>
      {ROWS.map((row) => (
        <div
          key={row.label}
          className="flex h-6.5 items-center gap-3 text-14 text-on-dark-soft"
        >
          <span
            aria-hidden="true"
            className={cn("size-2 rounded-full", row.tone)}
          />
          {row.label}
        </div>
      ))}
    </Card>
  );
}
