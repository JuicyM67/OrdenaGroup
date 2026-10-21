// Statisk mockup av ägarappen (WP-72, Foretag.dc.html): sidomeny, veckokalender, klocka med
// förfrågningar, blixttid, omdömen, kassa och "Idag". Fast fiktiv data
// ur i18n, ingen inloggning och inga DB-anrop. Mobil: dagslista i stället för veckorutnät.
"use client";

import { Bell } from "lucide-react";
import dynamic from "next/dynamic";
import Link from "next/link";
import { useCallback, useState } from "react";

import { BrandLogo } from "@/components/marketing/brand-logo";
import { cn } from "@/components/ui/cn";
import { brand } from "@/config/brand";
import { visita } from "@/i18n";

const BusinessTour = dynamic(() => import("./business-tour"), { ssr: false });

const n = visita.negocio;

const HOUR_PX = 72;
const HOURS = [9, 10, 11, 12, 13, 14, 15, 16, 17, 18];
const TONES = ["bg-lavender", "bg-peach-50", "bg-sky", "bg-mint"] as const;

type SvcKey = keyof typeof n.servicios;
type Booking = {
  day: number;
  start: number;
  dur: number;
  name: string;
  svc: SvcKey;
  tone: 0 | 1 | 2 | 3;
};

const BOOKINGS: readonly Booking[] = [
  { day: 0, start: 0, dur: 1, name: "Amir", svc: "barba", tone: 0 },
  {
    day: 0,
    start: 2,
    dur: 1.5,
    name: "Lisa",
    svc: "corte",
    tone: 1,
  },
  {
    day: 0,
    start: 6,
    dur: 1,
    name: "Noah",
    svc: "corteHombre",
    tone: 2,
  },
  { day: 1, start: 1, dur: 2, name: "Elin", svc: "color", tone: 3 },
  {
    day: 1,
    start: 4.5,
    dur: 1,
    name: "Moa",
    svc: "esmaltado",
    tone: 0,
  },
  { day: 2, start: 0, dur: 1, name: "Ali", svc: "fade", tone: 2 },
  { day: 2, start: 3, dur: 1, name: "Ebba", svc: "lash", tone: 1 },
  {
    day: 2,
    start: 5,
    dur: 2,
    name: "Sofia",
    svc: "mechas",
    tone: 3,
  },
  {
    day: 3,
    start: 1,
    dur: 1,
    name: "Jonas",
    svc: "masaje",
    tone: 0,
  },
  {
    day: 3,
    start: 3.5,
    dur: 1.5,
    name: "Vera",
    svc: "facial",
    tone: 1,
  },
  {
    day: 4,
    start: 0.5,
    dur: 1,
    name: "Leo",
    svc: "barba",
    tone: 2,
  },
  { day: 4, start: 2, dur: 2, name: "Maja", svc: "color", tone: 3 },
  { day: 4, start: 6, dur: 1, name: "Ida", svc: "corte", tone: 0 },
];
const FLASH = { day: 3, start: 7.5 };
const BARS: readonly { pct: string; tone: string }[] = [
  { pct: "55%", tone: "bg-lavender" },
  { pct: "70%", tone: "bg-lavender" },
  { pct: "92%", tone: "bg-ink" },
  { pct: "84%", tone: "bg-lavender" },
  { pct: "100%", tone: "bg-lime" },
];
const AFTER_FLASH = new Set(["resenas", "caja"]);
const BEFORE_FLASH = new Set(["semana", "solicitudes", "flash"]);

function BookingBlock({ b }: { b: Booking }) {
  return (
    <div
      className={cn(
        "absolute inset-x-1 flex flex-col gap-0.5 overflow-hidden rounded-event px-2.25 py-1.75",
        TONES[b.tone],
      )}
      style={{ top: b.start * HOUR_PX + 2, height: b.dur * HOUR_PX - 4 }}
    >
      <b className="text-12">{b.name}</b>
      <span className="text-11 text-ink-soft">{n.servicios[b.svc]}</span>
    </div>
  );
}

function FlashBlock({
  taken,
  className,
}: {
  taken: boolean;
  className?: string;
}) {
  return (
    <div
      data-tour="flash"
      className={cn(
        "flex h-18 flex-col gap-0.5 rounded-event border-2 border-dashed px-2.25 py-1.75 transition-colors duration-300",
        taken ? "border-flash-dot bg-lime" : "border-flash-dot/60 bg-lime-50",
        className,
      )}
    >
      <b className="text-12 text-on-lime-soft">
        {taken ? n.flashTomada : n.flashLibre}
      </b>
      <span className="text-11 text-ink-soft">
        {taken ? n.flashTomadaSub : n.flashLibreSub}
      </span>
    </div>
  );
}

export function BusinessDemo() {
  const [stepId, setStepId] = useState<string | null>(null);
  const [taken, setTaken] = useState(false);
  const onStep = useCallback((id: string | null) => {
    setStepId(id);
    if (id && AFTER_FLASH.has(id)) setTaken(true);
    else if (id && BEFORE_FLASH.has(id)) setTaken(false);
  }, []);
  const mobileDay = BOOKINGS.filter((b) => b.day === 2).sort(
    (a, b) => a.start - b.start,
  );

  return (
    <div className="flex min-h-dvh bg-canvas text-ink">
      <aside
        aria-label={n.navMenu}
        className="sticky top-0 hidden h-dvh w-55 shrink-0 flex-col gap-1.5 bg-ink px-3.5 py-5.5 text-on-dark xl:flex"
      >
        <Link
          href="/"
          aria-label={n.volver}
          className="mb-3 self-start rounded-event bg-surface px-2.5 py-1.5"
        >
          <BrandLogo size="sm" />
        </Link>
        {n.nav.map((label, i) => (
          <span
            key={label}
            aria-current={i === 1 ? "page" : undefined}
            className={cn(
              "flex h-10.5 items-center gap-2.5 rounded-control px-3 text-14 font-semibold",
              i === 1 ? "bg-lime text-ink" : "text-on-dark-soft",
            )}
          >
            <span
              aria-hidden="true"
              className={cn(
                "size-2 rounded-full",
                i === 1 ? "bg-ink" : "bg-dark-border",
              )}
            />
            {label}
          </span>
        ))}
        <span className="mt-auto rounded-icon bg-dark-2 p-3 text-12 text-on-dark-soft">
          {n.nombre}
          <br />
          <b className="text-on-dark">{n.plan}</b>
        </span>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col gap-4 px-3 py-4 sm:px-5 sm:py-5">
        <header className="relative flex items-center justify-between gap-3">
          <Link href="/" aria-label={n.volver} className="xl:hidden">
            <BrandLogo size="sm" />
          </Link>
          <span className="hidden flex-col xl:flex">
            <b className="font-display text-26">{n.agenda}</b>
            <span className="text-12 text-muted">{n.semana}</span>
          </span>
          <span className="flex items-center gap-2.5">
            <span className="flex h-11 items-center rounded-event bg-ink px-4 text-14 font-bold text-on-dark">
              {n.nuevaReserva}
            </span>
            <span
              role="img"
              aria-label={n.campanaAria}
              className="relative flex size-11 items-center justify-center rounded-event bg-surface"
            >
              <Bell className="size-5" strokeWidth={2} aria-hidden="true" />
              <span className="absolute top-1.5 right-1.5 flex h-4 min-w-4 items-center justify-center rounded-badge bg-alert text-10 font-bold text-on-dark">
                2
              </span>
            </span>
            <span
              aria-hidden="true"
              className="flex size-11 items-center justify-center rounded-event bg-lavender font-bold"
            >
              I
            </span>
          </span>
          <div
            data-tour="requests"
            className={cn(
              "absolute top-full right-0 z-10 mt-2 w-full max-w-90 animate-fade-up flex-col gap-2.5 rounded-panel bg-surface p-4 shadow-popover",
              stepId === "solicitudes" ? "flex" : "hidden",
            )}
          >
            <b className="text-14">{n.campana.titulo}</b>
            <div className="flex flex-col gap-2 rounded-control bg-canvas p-3">
              <span className="text-13">{n.campana.uno}</span>
              <span className="flex gap-1.5">
                <span className="flex h-8.5 flex-1 items-center justify-center rounded-chip bg-ink text-12 font-bold text-on-dark">
                  {n.campana.confirmar}
                </span>
                <span className="flex h-8.5 flex-1 items-center justify-center rounded-chip bg-surface text-12 font-bold">
                  {n.campana.rechazar}
                </span>
              </span>
            </div>
            <div className="rounded-control bg-canvas p-3 text-13">
              {n.campana.dos}{" "}
              <b className="text-pending-fg">{n.campana.aprobar}</b>
            </div>
          </div>
        </header>

        <div className="grid gap-4 xl:grid-cols-agenda-demo">
          <section
            aria-label={n.agenda}
            data-tour="week"
            className="overflow-hidden rounded-card bg-surface"
          >
            {/* Dator: veckorutnät */}
            <div className="hidden md:block">
              <div className="flex h-11 text-12 font-bold text-muted">
                <span className="w-17.5 shrink-0" />
                <div className="grid flex-1 grid-cols-5">
                  {n.dias.map((d, i) => (
                    <span
                      key={d}
                      className={cn(
                        "flex items-center justify-center",
                        i === 2 && "text-violet",
                      )}
                    >
                      {d}
                    </span>
                  ))}
                </div>
              </div>
              <div
                className="relative"
                style={{ height: HOURS.length * HOUR_PX + 8 }}
              >
                {HOURS.map((h, i) => (
                  <div key={h}>
                    <span
                      className="absolute left-0 w-17.5 text-center text-11 text-subtle"
                      style={{ top: i * HOUR_PX }}
                    >
                      {h}:00
                    </span>
                    <span
                      aria-hidden="true"
                      className="absolute right-0 left-17.5 h-px bg-line"
                      style={{ top: i * HOUR_PX }}
                    />
                  </div>
                ))}
                <div className="absolute inset-y-0 right-0 left-17.5 grid grid-cols-5">
                  {[0, 1, 2, 3, 4].map((day) => (
                    <div key={day} className="relative">
                      {BOOKINGS.filter((b) => b.day === day).map((b) => (
                        <BookingBlock key={b.name} b={b} />
                      ))}
                      {day === FLASH.day ? (
                        <div
                          className="absolute inset-x-1"
                          style={{ top: FLASH.start * HOUR_PX + 2 }}
                        >
                          <FlashBlock taken={taken} />
                        </div>
                      ) : null}
                    </div>
                  ))}
                </div>
              </div>
            </div>
            {/* Mobil: dagsvy som lista */}
            <div className="flex flex-col gap-2 p-3.5 md:hidden">
              <b className="text-14">{n.dia}</b>
              {mobileDay.map((b) => (
                <div
                  key={b.name}
                  className={cn(
                    "flex items-center justify-between gap-3 rounded-event px-3 py-2.5",
                    TONES[b.tone],
                  )}
                >
                  <span className="flex flex-col">
                    <b className="text-13">{b.name}</b>
                    <span className="text-12 text-ink-soft">
                      {n.servicios[b.svc]} · {HOURS[0]! + Math.floor(b.start)}:
                      {b.start % 1 ? "30" : "00"}
                    </span>
                  </span>
                </div>
              ))}
              <FlashBlock taken={taken} className="h-auto py-2.5" />
            </div>
          </section>

          <div className="flex flex-col gap-4">
            <section
              data-tour="reviews"
              className="flex flex-col gap-2 rounded-tile bg-surface px-5 py-4.5"
            >
              <span className="flex items-baseline justify-between">
                <b className="text-14">{n.resenas.titulo}</b>
                <span className="text-13 font-bold">
                  <span className="text-full-dot">★</span> {n.resenas.nota}
                </span>
              </span>
              <span className="text-13 text-ink-soft">{n.resenas.cita}</span>
              <span className="flex h-8 items-center self-start rounded-chip bg-canvas px-3 text-12 font-bold">
                {n.resenas.responder}
              </span>
            </section>
            <section
              data-tour="caja"
              className="flex flex-col gap-2.5 rounded-tile bg-surface px-5 py-4.5"
            >
              <span className="flex justify-between">
                <b className="text-14">{n.caja.titulo}</b>
                <span className="text-12 text-muted">{n.caja.periodo}</span>
              </span>
              <span className="flex gap-4.5">
                <span>
                  <b className="font-display text-24">{n.caja.ingresos}</b>
                  <span className="block text-11 text-muted">
                    {n.caja.ingresosEtiqueta}
                  </span>
                </span>
                <span>
                  <b className="font-display text-24">{n.caja.ocupacion}</b>
                  <span className="block text-11 text-muted">
                    {n.caja.ocupacionEtiqueta}
                  </span>
                </span>
              </span>
              <div
                role="img"
                aria-label={n.caja.graficoAria}
                className="flex h-18 items-end gap-2"
              >
                {BARS.map((bar, i) => (
                  <span
                    key={i}
                    className={cn("flex-1 rounded-tag", bar.tone)}
                    style={{ height: bar.pct }}
                  />
                ))}
              </div>
            </section>
            <section className="flex flex-col gap-2.5 rounded-tile bg-surface px-5 py-4.5">
              <b className="text-14">{n.hoy.titulo}</b>
              {n.hoy.filas.map((f, i) => (
                <span
                  key={f.hora}
                  className="flex justify-between rounded-event bg-canvas px-3 py-2.5 text-13"
                >
                  <span>
                    <b>{f.hora}</b> {f.texto}
                  </span>
                  {i !== 0 ? (
                    <span
                      className={cn(
                        i === 0 && "font-bold text-success-fg",
                        i === 1 && "text-muted",
                        i === 2 && "font-bold text-flash-dot",
                      )}
                    >
                      {f.estado}
                    </span>
                  ) : null}
                </span>
              ))}
            </section>
          </div>
        </div>
      </div>

      <BusinessTour nombre={brand.name} onStepChange={onStep} />
    </div>
  );
}
