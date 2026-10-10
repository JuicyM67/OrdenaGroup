// Mockups de producto para /funcionalidades (WP-hemsida, sitio-v3): mismo patrón que
// `hero-bento.tsx`/`hero-visual-preview.tsx` (bits reales de la UI del producto en lugar de
// fotos de stock), pero en línea (sin capas absolutas) y con una mini-animación propia por
// sección — el mismo lenguaje de movimiento del hero, aplicado a cada funcionalidad. Ningún
// texto inventado: cada mockup usa `DEMO` (datos de ejemplo), `copy` (`@/i18n/marketing`,
// D-025/D-026) o la propia `seccion` que ya trae `SITIO_FUNCIONALIDADES` (etiquetas de los
// puntos, p. ej. las pestañas de Ajustes salen de `seccion.puntos`). Decorativo en su
// totalidad: `aria-hidden`, la sección que lo envuelve ya tiene su propio título/texto
// accesible (funcionalidades/page.tsx).
import {
  Bell,
  Check,
  Instagram,
  MessageCircle,
  PenLine,
  QrCode,
  type LucideIcon,
} from "lucide-react";
import type { ReactNode } from "react";

import { staffBgClass } from "@/components/agenda/agenda-view";
import { Avatar } from "@/components/ui/avatar";
import { Chip } from "@/components/ui/chip";
import { cn } from "@/components/ui/cn";
import { strokeCard } from "@/components/ui/icons";
import { copy } from "@/i18n/marketing";
import { WEEKDAY_MIN } from "@/lib/format/calendar-es-CL";
import { formatDuration } from "@/lib/format/dates";
import { initialsOf } from "@/lib/format/initials";

import { DEMO } from "./demo-data";

/** Misma forma que `SitioFuncionalidadSeccion` (`@/i18n/es-CL.marketing`), pero declarada
 * localmente: `copy.SITIO_FUNCIONALIDADES` ya llega con este shape vía `Widen<>`, y así este
 * archivo no depende de un tipo que solo vive en el árbol es-CL (D-025/D-026, marketing.ts
 * no reexporta el tipo, solo el valor). */
export type FeaturePreviewSeccion = {
  readonly id: string;
  readonly etiqueta: string;
  readonly titulo: string;
  readonly texto: string;
  readonly puntos: readonly string[];
  readonly proximamente: boolean;
};

const POP = [
  "animate-func-pop-1",
  "animate-func-pop-2",
  "animate-func-pop-3",
] as const;

const BENTO_LINK = copy.sitio.inicio.heroBento.link;

const SHARE_ICONS: readonly { icon: LucideIcon; tone: "dark" | "light" }[] = [
  { icon: Instagram, tone: "dark" },
  { icon: MessageCircle, tone: "light" },
  { icon: QrCode, tone: "light" },
];

/** link-reservas: el link se escribe solo y el botón "Copiar" se convierte en "Copiado",
 * igual que en la tarjeta del hero (misma técnica, tokens.css), en una tarjeta más chica. */
function LinkPreview() {
  return (
    <div className="w-full max-w-80 rounded-tile bg-lime p-4.5">
      <span className="text-12 font-bold text-on-lime-soft">
        {BENTO_LINK.titulo}
      </span>
      <div className="mt-2.5 flex items-center gap-1.5 rounded-panel bg-surface py-1.5 pr-1.5 pl-2.5">
        <span className="relative inline-flex min-w-0 flex-1 items-center truncate text-13 font-semibold text-ink">
          <span className="animate-hero-type overflow-hidden whitespace-nowrap">
            {DEMO.lank}
          </span>
          <span
            aria-hidden="true"
            className="ml-0.5 h-3.5 w-0.5 shrink-0 animate-hero-caret bg-ink"
          />
        </span>
        <span
          aria-hidden="true"
          className="relative ml-auto inline-flex h-8 w-16.5 shrink-0 animate-hero-copy-btn items-center justify-center overflow-hidden rounded-control text-11 font-bold text-on-dark"
        >
          <span className="absolute animate-hero-copy-out">
            {BENTO_LINK.copiar}
          </span>
          <span className="absolute animate-hero-copy-in">
            {BENTO_LINK.copiado}
          </span>
        </span>
      </div>
      <div
        role="group"
        aria-label={BENTO_LINK.compartirAria}
        className="mt-3 flex justify-end gap-2"
      >
        {SHARE_ICONS.map((item, i) => {
          const Icon = item.icon;
          return (
            <span
              key={i}
              aria-hidden="true"
              className={cn(
                "flex size-8.5 items-center justify-center rounded-full",
                item.tone === "dark"
                  ? "bg-ink text-on-dark"
                  : "bg-surface text-ink",
              )}
            >
              <Icon className="size-4" strokeWidth={strokeCard} />
            </span>
          );
        })}
      </div>
    </div>
  );
}

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
  {
    day: WEEKDAY_MIN[2]!,
    title: DEMO.tjanster[2]!,
    time: "12:30",
    tone: staffBgClass(3),
  },
] as const;

/** agenda: las tres reservas del día aparecen una tras otra en sus columnas y vuelven a
 * aparecer en bucle — "las reservas se anotan solas". */
function AgendaPreview() {
  return (
    <div className="grid w-full max-w-96 grid-cols-3 gap-3 rounded-tile bg-surface p-4 shadow-popover">
      {AGENDA_COLUMNS.map((column, i) => (
        <div key={column.day} className="flex flex-col gap-2">
          <span className="text-13 font-semibold text-muted">{column.day}</span>
          <div
            className={cn(
              "flex flex-col rounded-event px-2.25 py-1.75 text-ink",
              column.tone,
              POP[i],
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

/** hoy: los botones Llegó/No vino se turnan para mostrarse "presionados", como si el dueño
 * los tocara con una mano desde el celular. */
function HoyPreview() {
  return (
    <div className="w-full max-w-80 rounded-hero bg-dark-2 p-5 text-on-dark shadow-popover">
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
        <span className="flex h-10 animate-func-toggle-llego items-center justify-center rounded-control bg-lime text-13 font-bold text-ink">
          {copy.hoy.acciones.llego}
        </span>
        <span className="flex h-10 animate-func-toggle-novino items-center justify-center rounded-control border border-dark-border text-13 font-semibold text-on-dark">
          {copy.hoy.acciones.noVino}
        </span>
      </div>
    </div>
  );
}

/** reservas-manuales: dos horas ya agendadas y una tercera que aparece a mano, con un
 * contorno punteado distinto (recién agregada). */
function ReservasManualesPreview() {
  const rows = [
    { title: DEMO.tjanster[0]!, time: "10:00", tone: staffBgClass(1) },
    { title: DEMO.tjanster[1]!, time: "11:30", tone: staffBgClass(4) },
  ];
  return (
    <div className="flex w-full max-w-80 flex-col gap-2 rounded-tile bg-surface p-4 shadow-popover">
      {rows.map((row) => (
        <div
          key={row.title}
          className={cn(
            "flex items-center justify-between rounded-event px-3 py-2.5 text-ink",
            row.tone,
          )}
        >
          <span className="truncate text-13 font-bold">{row.title}</span>
          <span className="text-11 text-ink-soft">{row.time}</span>
        </div>
      ))}
      <div className="flex animate-func-pop-2 items-center justify-between rounded-event border-2 border-dashed border-border px-3 py-2.5 text-ink">
        <span className="flex min-w-0 items-center gap-1.5 truncate text-13 font-bold">
          <PenLine
            aria-hidden="true"
            className="size-3.5 shrink-0 text-muted"
            strokeWidth={strokeCard}
          />
          <span className="truncate">{DEMO.tjanster[2]}</span>
        </span>
        <span className="text-11 text-ink-soft">13:00</span>
      </div>
    </div>
  );
}

/** Primer segmento antes de ":" de un punto ("Servicios: nombre, duración…" → "Servicios"),
 * para las pestañas del mockup de Ajustes — nunca un texto nuevo, solo un recorte mecánico
 * de `seccion.puntos` (mismo criterio que `splitLastWord` en hero-bento.tsx). Sin ":" se
 * trunca visualmente con la clase `truncate`. */
function tabLabel(punto: string): string {
  const i = punto.indexOf(":");
  return i === -1 ? punto : punto.slice(0, i);
}

const TAB_ANIM = [
  "animate-func-tab-1",
  "animate-func-tab-2",
  "animate-func-tab-3",
] as const;

/** ajustes: tres pestañas (sacadas de `seccion.puntos`) se turnan como activas. */
function AjustesPreview({ seccion }: { seccion: FeaturePreviewSeccion }) {
  const tabs = seccion.puntos.slice(0, 3).map(tabLabel);
  return (
    <div className="w-full max-w-96 rounded-tile bg-surface p-4 shadow-popover">
      <div className="flex gap-1.5 rounded-control bg-canvas p-1">
        {tabs.map((tab, i) => (
          <span
            key={tab}
            className={cn(
              "min-w-0 flex-1 truncate rounded-event px-2.5 py-2 text-center text-12 font-bold",
              TAB_ANIM[i],
            )}
          >
            {tab}
          </span>
        ))}
      </div>
      <div className="mt-3 flex items-center justify-between rounded-control bg-canvas px-3.5 py-3">
        <span className="truncate text-14 font-bold text-ink">{DEMO.kort}</span>
        <span className="shrink-0 text-13 text-muted">
          {formatDuration(35)} · {DEMO.pris}
        </span>
      </div>
    </div>
  );
}

/** recordatorios: la tarjeta de "próxima reserva" de Hoy, con un aviso de WhatsApp que
 * entra deslizándose y vuelve a salir. */
function RecordatoriosPreview() {
  return (
    <div className="w-full max-w-80 overflow-hidden rounded-hero bg-dark p-5 text-on-dark shadow-popover">
      <span className="text-13 text-on-dark-muted">
        {copy.hoy.siguiente({ relativo: copy.hoy.relativo.enMin({ n: 20 }) })}
      </span>
      <div className="mt-2 font-display text-26 leading-none font-semibold tracking-display">
        15:00
      </div>
      <div className="mt-2 truncate text-14 font-bold">{DEMO.kund}</div>
      <div className="relative mt-4 h-9">
        <div className="absolute inset-x-0 flex animate-func-notif-slide items-center gap-2 rounded-event bg-dark-2 px-3 py-2 text-12 font-bold text-lime">
          <Bell
            aria-hidden="true"
            className="size-3.5 shrink-0"
            strokeWidth={strokeCard}
          />
          <span className="truncate">{copy.estados.confirmoPorWhatsapp}</span>
        </div>
      </div>
    </div>
  );
}

/** lista-espera: tres servicios en cola, el primero con la tagg de "lista de espera"
 * (DESIGN.md §4) y un aviso de notificación nueva que entra y sale. */
function ListaEsperaPreview() {
  const rows = [DEMO.tjanster[0]!, DEMO.tjanster[1]!, DEMO.tjanster[2]!];
  return (
    <div className="w-full max-w-80 rounded-tile bg-lilac p-4.5">
      <span className="text-12 font-bold text-on-lilac-soft">
        {copy.hoy.accionesRapidas.listaEspera({ n: rows.length })}
      </span>
      <div className="mt-2.5 flex flex-col gap-1.5">
        {rows.map((row, i) => (
          <div
            key={row}
            className="flex items-center justify-between rounded-event bg-surface px-3 py-2"
          >
            <span className="truncate text-13 font-semibold text-ink">
              {row}
            </span>
            {i === 0 ? (
              <Chip tone="peach" size="tag">
                {copy.estados.listaDeEspera}
              </Chip>
            ) : (
              <span className="text-11 text-muted">10:00</span>
            )}
          </div>
        ))}
      </div>
      <div className="relative mt-2.5 h-8">
        <div className="absolute inset-x-0 flex animate-func-notif-slide items-center gap-2 rounded-event bg-surface px-3 py-1.5 text-11 font-bold text-ink shadow-popover">
          <Bell
            aria-hidden="true"
            className="size-3.5 shrink-0 text-flash-dot"
            strokeWidth={strokeCard}
          />
          {copy.nav.notificacionesNuevas({ n: 1 })}
        </div>
      </div>
    </div>
  );
}

/** abono: el monto del servicio y la tagg "Abono pagado" (DESIGN.md §4, tone deposit)
 * apareciendo. */
function AbonoPreview() {
  return (
    <div className="flex w-full max-w-72 flex-col gap-3 rounded-tile bg-peach p-4.5">
      <div className="flex items-center justify-between gap-3">
        <span className="text-13 font-bold text-on-peach-soft">
          {copy.estados.abono}
        </span>
        <span className="font-display text-24 font-semibold tracking-display text-ink">
          {DEMO.pris}
        </span>
      </div>
      <div className="animate-func-pop-2">
        <Chip tone="deposit" size="sm" weight="bold">
          {copy.estados.abonoPagado}
        </Chip>
      </div>
    </div>
  );
}

/** fichas-clientes: una ficha con el cliente de ejemplo y su historial apareciendo en
 * cascada. */
function FichasClientesPreview() {
  return (
    <div className="w-full max-w-80 rounded-tile bg-surface p-4.5 shadow-popover">
      <div className="flex items-center gap-3">
        <Avatar initials={initialsOf(DEMO.kund)} size={40} tone="lilac-100" />
        <div className="min-w-0">
          <div className="truncate text-15 font-bold text-ink">{DEMO.kund}</div>
          <div className="truncate text-12 text-muted">{DEMO.tjanster[0]}</div>
        </div>
      </div>
      <div className="mt-3 flex flex-col gap-1.5">
        {[DEMO.tjanster[1]!, DEMO.tjanster[2]!, DEMO.tjanster[3]!].map(
          (title, i) => (
            <div
              key={title}
              className={cn(
                "flex items-center gap-2 rounded-event bg-canvas px-3 py-2 text-12 text-ink",
                POP[i],
              )}
            >
              <Check
                aria-hidden="true"
                className="size-3.5 shrink-0 text-muted"
                strokeWidth={2.4}
              />
              <span className="truncate">{title}</span>
            </div>
          ),
        )}
      </div>
    </div>
  );
}

const REPORTES_BARS: readonly { height: number; delay: boolean }[] = [
  { height: 55, delay: false },
  { height: 85, delay: true },
  { height: 70, delay: false },
  { height: 100, delay: true },
  { height: 78, delay: false },
];

/** reportes: barras de ingresos creciendo (mismo mockup que "Por qué funciona") más una
 * cifra que rueda, con el primer punto de la sección como pie (texto real, no inventado). */
function ReportesPreview({ seccion }: { seccion: FeaturePreviewSeccion }) {
  return (
    <div className="w-full max-w-80 rounded-hero bg-dark-2 p-5 text-on-dark shadow-popover">
      <div aria-hidden="true" className="flex h-16 items-end gap-1.5">
        {REPORTES_BARS.map((bar, i) => (
          <span
            key={i}
            style={{ height: `${bar.height}%` }}
            className={cn(
              "w-full origin-bottom rounded-badge bg-lime/70",
              bar.delay ? "animate-grow-bar-delay" : "animate-grow-bar",
            )}
          />
        ))}
      </div>
      <div className="mt-4 flex items-baseline gap-2.5">
        <div className="h-9 overflow-hidden">
          <div className="flex animate-count-roll flex-col font-display text-26 leading-9 font-bold text-lime">
            <span>6</span>
            <span>9</span>
            <span>14</span>
          </div>
        </div>
        <span className="truncate text-11 text-on-dark-muted">
          {seccion.puntos[0]}
        </span>
      </div>
    </div>
  );
}

const PREVIEWS: Record<string, (seccion: FeaturePreviewSeccion) => ReactNode> =
  {
    "link-reservas": () => <LinkPreview />,
    agenda: () => <AgendaPreview />,
    hoy: () => <HoyPreview />,
    "reservas-manuales": () => <ReservasManualesPreview />,
    ajustes: (seccion) => <AjustesPreview seccion={seccion} />,
    recordatorios: () => <RecordatoriosPreview />,
    "lista-espera": () => <ListaEsperaPreview />,
    abono: () => <AbonoPreview />,
    "fichas-clientes": () => <FichasClientesPreview />,
    reportes: (seccion) => <ReportesPreview seccion={seccion} />,
  };

/** Un mockup por `seccion.id`. Si el id no tiene mockup (o desaparece de
 * `SITIO_FUNCIONALIDADES`, p. ej. `abono` en SE), no renderiza nada — la sección se queda
 * solo con su texto, sin espacio reservado ni error. */
export function FeaturePreview({
  seccion,
  className,
}: {
  seccion: FeaturePreviewSeccion;
  className?: string;
}) {
  const render = PREVIEWS[seccion.id];
  if (!render) return null;
  return (
    <div aria-hidden="true" className={cn("flex justify-center", className)}>
      {render(seccion)}
    </div>
  );
}
