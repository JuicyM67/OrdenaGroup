// Landningens hero (rediseño, WP-hero, ingen .dc.html-referens): den visuella ytan till
// höger om lime-kortet. En komposition av riktiga produktmönster (agenda, Hoy, Reserva) i
// lager, byggd som en ren dekoration — inte de riktiga interaktiva komponenterna
// (EventBlock/NextClientCard/ServiceCard/TimeSlot), för de kräver knappar, onClick och
// fulla datamodeller som inte passar en `aria-hidden`-dekoration. Det här är den
// "förenklad preview-variant" som specen tillåter: samma tokens/klasser och samma
// vy-hjälpare (`staffBgClass`) som de riktiga komponenterna, inga egna färger.
import { staffBgClass } from "@/components/agenda/agenda-view";
import { Chip } from "@/components/ui/chip";
import { cn } from "@/components/ui/cn";
import { estados, hoy, landing } from "@/i18n";
import { formatClp } from "@/lib/format/clp";
import { formatDuration } from "@/lib/format/dates";
import { WEEKDAY_MIN } from "@/lib/format/calendar-es-CL";

type MiniEvent = {
  title: string;
  time: string;
  tone: string;
  flash?: boolean;
};

// Cinco días, ~4 horas (10:00–14:00) y varios rubros (barbería, peluquería, estética,
// kinesiología — los mismos de `landing.paraQuien`), para que el recorte se vea lleno.
const COLUMNS: readonly { day: string; events: readonly MiniEvent[] }[] = [
  {
    day: WEEKDAY_MIN[0]!,
    events: [{ title: "Corte", time: "10:00", tone: staffBgClass(1) }],
  },
  {
    day: WEEKDAY_MIN[1]!,
    events: [
      { title: "Color", time: "11:00", tone: staffBgClass(2) },
      { title: "Flash", time: "12:15", tone: "bg-lime", flash: true },
    ],
  },
  {
    day: WEEKDAY_MIN[2]!,
    events: [{ title: "Uñas", time: "12:30", tone: staffBgClass(3) }],
  },
  {
    day: WEEKDAY_MIN[3]!,
    events: [
      { title: "Masaje", time: "13:15", tone: staffBgClass(4) },
      { title: "Barba", time: "14:00", tone: staffBgClass(5) },
    ],
  },
];

const COLUMNS_MOBILE = COLUMNS.slice(0, 3);

function AgendaEvent({ event }: { event: MiniEvent }) {
  return (
    <div
      className={cn(
        "flex flex-col rounded-event px-2.25 py-1.75 text-ink",
        event.tone,
      )}
    >
      {event.flash ? (
        <Chip size="tag" tone="ink" className="mb-0.75 w-fit self-start">
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
  );
}

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
        "relative min-h-100 sm:min-h-115 lg:min-h-0",
        className,
      )}
    >
      {/* Utsnitt av veckoagendan: huvudelementet, botten i kompositionen. Fem dagar
          (tre på mobil) och ~4 timmar, så det inte ser tomt ut bredvid lime-kortet. */}
      <div
        aria-hidden="true"
        className="absolute top-0 left-0 z-10 w-full rounded-card bg-surface p-4 shadow-popover sm:p-6"
      >
        {/* Fasta kolumnhöjder (i stället för att bara staplas kompakt): kolumner med en
            enda bokning lämnar synligt utrymme under — det läser som lediga tider, inte
            som ett tomt kort, och ger hela agendakortet höjd nog att bli huvudelementet. */}
        <div className="grid grid-cols-3 gap-2 sm:hidden">
          {COLUMNS_MOBILE.map((column) => (
            <div key={column.day} className="flex h-48 flex-col gap-2">
              <span className="text-13 font-semibold text-muted">
                {column.day}
              </span>
              {column.events.map((event) => (
                <AgendaEvent key={event.title} event={event} />
              ))}
            </div>
          ))}
        </div>
        <div className="hidden grid-cols-4 gap-3 sm:grid">
          {COLUMNS.map((column) => (
            <div key={column.day} className="flex h-68 flex-col gap-2.5">
              <span className="text-13 font-semibold text-muted">
                {column.day}
              </span>
              {column.events.map((event) => (
                <AgendaEvent key={event.title} event={event} />
              ))}
            </div>
          ))}
        </div>
      </div>

      {/* Bokningskort: tjänst + tidsknappar (Reserva). Kikar ut ovanför agendakortets
          övre högra hörn (bara hörnet, inte mitten) — mittersta dagkolumnerna förblir
          fria. Nedskalad bort på mobil (ren agenda + "Siguiente" räcker där). */}
      <div
        aria-hidden="true"
        className="absolute -top-4 right-0 z-20 hidden w-6/12 rotate-2 rounded-tile bg-surface p-4 shadow-popover sm:-top-11 sm:block sm:w-4/12"
      >
        <div className="truncate text-15 font-bold text-ink">Corte + barba</div>
        <div className="truncate text-13 text-muted">
          {formatDuration(35)} · {formatClp(12_000)}
        </div>
        <div className="mt-3 grid grid-cols-3 gap-1.5">
          <span className="flex h-10 items-center justify-center rounded-control bg-surface text-13 font-bold text-ink">
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

      {/* Mobilkort: "Siguiente" (Hoy). Överlappar bara agendakortets nedre vänstra hörn,
          i det motsatta hörnet mot bokningskortet ovan — de korsar aldrig varandra. */}
      <div
        aria-hidden="true"
        className="absolute bottom-0 left-0 z-30 w-8/12 -rotate-1 rounded-hero bg-dark p-5 text-on-dark shadow-popover sm:w-4/12"
      >
        <div className="flex items-center justify-between gap-2">
          <span className="truncate text-13 text-on-dark-muted">
            {hoy.siguiente({ relativo: hoy.relativo.enMin({ n: 20 }) })}
          </span>
          <Chip size="sm" weight="bold" tone="success" className="shrink-0">
            {estados.confirmada}
          </Chip>
        </div>
        <div className="mt-3 font-display text-32 leading-none font-semibold tracking-display">
          15:00
        </div>
        <div className="mt-2 truncate text-16 font-bold">Joaquín Rivas</div>
        <div className="mt-4 grid grid-cols-2 gap-2">
          <span className="flex h-10 items-center justify-center rounded-control bg-lime text-13 font-bold text-ink">
            {hoy.acciones.llego}
          </span>
          <span className="flex h-10 items-center justify-center rounded-control border border-dark-border text-13 font-semibold text-on-dark">
            {hoy.acciones.noVino}
          </span>
        </div>
      </div>
    </div>
  );
}
