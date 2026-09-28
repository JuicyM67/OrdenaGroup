// Landningens hero (rediseño, WP-hero, ingen .dc.html-referens): den visuella ytan till
// höger om lime-kortet. En komposition av riktiga produktmönster (agenda, Hoy, Reserva) i
// lager, byggd som en ren dekoration — inte de riktiga interaktiva komponenterna
// (EventBlock/NextClientCard/ServiceCard/TimeSlot), för de kräver knappar, onClick och
// fulla datamodeller som inte passar en `aria-hidden`-dekoration. Det här är den
// "förenklad preview-variant" som specen tillåter: samma tokens/klasser och samma
// vy-hjälpare (`staffBgClass`) som de riktiga komponenterna, inga egna färger.
import { Scissors } from "lucide-react";

import { staffBgClass } from "@/components/agenda/agenda-view";
import { Chip } from "@/components/ui/chip";
import { cn } from "@/components/ui/cn";
import { strokeCard } from "@/components/ui/icons";
import { comun, estados, hoy, landing } from "@/i18n";
import { formatClp } from "@/lib/format/clp";
import { formatDuration } from "@/lib/format/dates";
import { WEEKDAY_MIN } from "@/lib/format/calendar-es-CL";

type MiniEvent = {
  title: string;
  time: string;
  tone: string;
  flash?: boolean;
};

const COLUMNS: readonly { day: string; events: readonly MiniEvent[] }[] = [
  {
    day: WEEKDAY_MIN[0]!,
    events: [{ title: "Corte", time: "10:00", tone: staffBgClass(1) }],
  },
  {
    day: WEEKDAY_MIN[1]!,
    events: [
      { title: "Barba", time: "11:30", tone: staffBgClass(2) },
      { title: "Flash", time: "12:15", tone: "bg-lime", flash: true },
    ],
  },
  {
    day: WEEKDAY_MIN[2]!,
    events: [{ title: "Corte + barba", time: "15:00", tone: staffBgClass(3) }],
  },
];

export function HeroVisualPreview({ className }: { className?: string }) {
  return (
    <div
      role="img"
      aria-label={landing.hero.vistaPreviaAria}
      className={cn(
        // Alla lager är `absolute` (ingen egen flödeshöjd), så ytan behöver en egen höjd
        // på mobil/tablet. Från `lg` stretchar flex-raden (items-stretch) den i stället
        // till lime-kortets höjd — `lg:min-h-0` släpper `min-h-*` så stretchen vinner
        // (`lg:h-full` gav tidigare 0 px: procenthöjd mot en `auto`-hög flex-rad).
        "relative min-h-90 sm:min-h-100 lg:min-h-0",
        className,
      )}
    >
      {/* Utsnitt av veckoagendan */}
      <div
        aria-hidden="true"
        className="absolute top-0 left-0 z-10 w-10/12 rotate-2 rounded-card bg-surface p-4 shadow-popover sm:w-9/12 sm:p-5"
      >
        <div className="grid grid-cols-3 gap-2">
          {COLUMNS.map((column) => (
            <div key={column.day} className="flex flex-col gap-2">
              <span className="text-13 font-semibold text-muted">
                {column.day}
              </span>
              {column.events.map((event) => (
                <div
                  key={event.title}
                  className={cn(
                    "flex flex-col rounded-event px-2.25 py-1.75 text-ink",
                    event.tone,
                  )}
                >
                  {event.flash ? (
                    <Chip
                      size="tag"
                      tone="ink"
                      className="mb-0.75 w-fit self-start"
                    >
                      {estados.flashConDescuento({ porcentaje: 20 })}
                    </Chip>
                  ) : null}
                  <span className="truncate text-event-title leading-event font-bold">
                    {event.title}
                  </span>
                  <span className="mt-0.5 truncate text-event-meta text-ink-soft">
                    {event.time}
                  </span>
                </div>
              ))}
            </div>
          ))}
        </div>
      </div>

      {/* Mobilkort: "Siguiente" (Hoy) */}
      <div
        aria-hidden="true"
        className="absolute right-0 bottom-0 z-20 w-8/12 -rotate-1 rounded-hero bg-dark p-5 text-on-dark shadow-popover sm:w-7/12 sm:p-6"
      >
        <div className="flex items-center justify-between gap-2">
          <span className="truncate text-13 text-on-dark-muted">
            {hoy.siguiente({ relativo: hoy.relativo.enMin({ n: 20 }) })}
          </span>
          <Chip size="sm" weight="bold" tone="success" className="shrink-0">
            {estados.confirmada}
          </Chip>
        </div>
        <div className="mt-3 font-display text-32 leading-none font-semibold tracking-display sm:text-44">
          15:00
        </div>
        <div className="mt-2 truncate text-16 font-bold sm:text-18">
          Joaquín Rivas
        </div>
        <div className="mt-0.5 truncate text-13 text-on-dark-soft sm:text-14">
          {hoy.detalleCliente({
            servicio: "Corte + barba",
            profesional: "Diego",
            visita: comun.visita({ n: 3 }),
          })}
        </div>
        <div className="mt-4 grid grid-cols-2 gap-2">
          <span className="flex h-10 items-center justify-center rounded-control bg-lime text-13 font-bold text-ink">
            {hoy.acciones.llego}
          </span>
          <span className="flex h-10 items-center justify-center rounded-control border border-dark-border text-13 font-semibold text-on-dark">
            {hoy.acciones.noVino}
          </span>
        </div>
      </div>

      {/* Bokningskort: tjänst + tidsknappar (Reserva), nedskalad bort på mobil */}
      <div
        aria-hidden="true"
        className="absolute top-4 right-0 z-10 hidden w-7/12 rotate-1 rounded-tile bg-surface p-4 shadow-popover sm:block sm:w-6/12 sm:p-5"
      >
        <div className="flex items-center gap-3">
          <span
            aria-hidden="true"
            className="flex size-11 shrink-0 items-center justify-center rounded-avatar bg-lilac-50"
          >
            <Scissors className="size-5" strokeWidth={strokeCard} />
          </span>
          <div className="min-w-0 grow">
            <div className="truncate text-15 font-bold text-ink">
              Corte + barba
            </div>
            <div className="text-13 text-muted">{formatDuration(35)}</div>
          </div>
          <div className="shrink-0 text-15 font-bold text-ink">
            {formatClp(12_000)}
          </div>
        </div>
        <div className="mt-3 grid grid-cols-3 gap-1.5">
          <span className="flex h-10 items-center justify-center rounded-control bg-surface text-13 font-bold text-ink">
            10:00
          </span>
          <span className="flex h-10 items-center justify-center rounded-control bg-ink text-13 font-bold text-on-dark">
            11:30
          </span>
          <span className="flex h-10 items-center justify-center gap-1 rounded-control bg-surface text-13 font-bold text-ink">
            15:00
            <Chip tone="lime" size="badge">
              {estados.flashConDescuento({ porcentaje: 20 })}
            </Chip>
          </span>
        </div>
      </div>
    </div>
  );
}
