// Mockups de producto para /funcionalidades (WP-hemsida): mismo patrón que
// `hero-visual-preview.tsx` (bits reales de la UI del producto — Reserva, Agenda, Hoy —
// en lugar de fotos de stock), pero en línea (sin capas absolutas) y más simples, para
// intercalar con el texto de un par de secciones. Decorativo: `aria-hidden`, la sección
// que lo envuelve ya tiene su propio título/texto accesible.
import { staffBgClass } from "@/components/agenda/agenda-view";
import { Chip } from "@/components/ui/chip";
import { cn } from "@/components/ui/cn";
import { copy } from "@/i18n/marketing";
import { formatDuration } from "@/lib/format/dates";
import { WEEKDAY_MIN } from "@/lib/format/calendar-es-CL";
import { DEMO } from "./demo-data";

export type FeaturePreviewVariant = "reservas" | "agenda" | "hoy";

const AGENDA_COLUMNS = [
  {
    day: WEEKDAY_MIN[0]!,
    title: DEMO.tjanster[0]!,
    time: "10:00",
    tone: staffBgClass(1),
  },
  {
    day: WEEKDAY_MIN[1]!,
    title: DEMO.tjanster[1]!,
    time: "11:00",
    tone: staffBgClass(2),
  },
  { day: WEEKDAY_MIN[2]!, title: "Uñas", time: "12:30", tone: staffBgClass(3) },
] as const;

function ReservasPreview() {
  return (
    <div className="w-full max-w-80 rounded-tile bg-surface p-4 shadow-popover">
      <div className="text-15 font-bold text-ink">{DEMO.kort}</div>
      <div className="text-13 text-muted">
        {formatDuration(35)} · {DEMO.pris}
      </div>
      <div className="mt-3 grid grid-cols-3 gap-1.5">
        <span className="flex h-10 items-center justify-center rounded-control bg-canvas text-13 font-bold text-ink">
          10:00
        </span>
        <span className="flex h-10 items-center justify-center rounded-control bg-ink text-13 font-bold text-on-dark">
          11:30
        </span>
        <span className="flex h-10 items-center justify-center rounded-control bg-lime text-13 font-bold text-ink">
          15:00
        </span>
      </div>
    </div>
  );
}

function AgendaPreview() {
  return (
    <div className="grid w-full max-w-96 grid-cols-3 gap-3 rounded-tile bg-surface p-4 shadow-popover">
      {AGENDA_COLUMNS.map((column) => (
        <div key={column.day} className="flex flex-col gap-2">
          <span className="text-13 font-semibold text-muted">{column.day}</span>
          <div
            className={cn(
              "flex flex-col rounded-event px-2.25 py-1.75 text-ink",
              column.tone,
            )}
          >
            <span className="truncate text-event-title leading-event font-bold">
              {column.title}
            </span>
            <span className="mt-0.5 truncate text-event-meta text-ink-soft">
              {column.time}
            </span>
          </div>
        </div>
      ))}
    </div>
  );
}

function HoyPreview() {
  return (
    <div className="w-full max-w-80 rounded-hero bg-dark p-5 text-on-dark shadow-popover">
      <div className="flex flex-col items-start gap-2">
        <span className="text-13 text-on-dark-muted">
          {copy.hoy.siguiente({ relativo: copy.hoy.relativo.enMin({ n: 20 }) })}
        </span>
        <Chip size="sm" weight="bold" tone="success" className="shrink-0">
          {copy.estados.confirmada}
        </Chip>
      </div>
      <div className="mt-3 font-display text-32 leading-none font-semibold tracking-display">
        15:00
      </div>
      <div className="mt-2 truncate text-16 font-bold">{DEMO.kund}</div>
      <div className="mt-4 grid grid-cols-2 gap-2">
        <span className="flex h-10 items-center justify-center rounded-control bg-lime text-13 font-bold text-ink">
          {copy.hoy.acciones.llego}
        </span>
        <span className="flex h-10 items-center justify-center rounded-control border border-dark-border text-13 font-semibold text-on-dark">
          {copy.hoy.acciones.noVino}
        </span>
      </div>
    </div>
  );
}

export function FeaturePreview({
  variant,
  className,
}: {
  variant: FeaturePreviewVariant;
  className?: string;
}) {
  return (
    <div aria-hidden="true" className={cn("flex justify-center", className)}>
      {variant === "reservas" ? <ReservasPreview /> : null}
      {variant === "agenda" ? <AgendaPreview /> : null}
      {variant === "hoy" ? <HoyPreview /> : null}
    </div>
  );
}
