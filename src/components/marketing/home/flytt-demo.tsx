"use client";

// "Smärtfri flytt" (WP-71, Flytt.dc.html): fyra klickbara steg till vänster och ett
// animerat importfönster till höger (länk skrivs in → läser in med klocka och fynd →
// välj vad som ska med → färdig företagssida). En klientkomponent eftersom stegen och
// fönstret delar tillstånd; all text kommer som props från servern (inga hela
// i18n-objekt i klient-JS). Fönstret är dekorativt (`aria-hidden`); stegen och texten
// bär informationen. `prefers-reduced-motion`: landar på sista steget, ingen timer.
import { ArrowRight, Check } from "lucide-react";
import Link from "next/link";
import {
  useEffect,
  useRef,
  useState,
  useSyncExternalStore,
  type ReactNode,
} from "react";

import { cn } from "@/components/ui/cn";

import { HomeHeading } from "./home-heading";

export type FlyttProps = {
  etiqueta: string;
  tituloPre: string;
  tituloMarca: string;
  texto: string;
  pasos: readonly { titulo: string; texto: string }[];
  cta: string;
  nota: string;
  ventana: string;
  pasoDe: readonly string[];
  linkLabel: string;
  urlEjemplo: string;
  hamta: string;
  pegado: string;
  compat: string;
  leyendo: string;
  hallazgos: readonly { at: number; label: string; count: string }[];
  elegir: string;
  opciones: readonly { at: number; label: string; count: string }[];
  importar: string;
  listo: string;
  /** Förhandsvisningen i sista steget (marknadens demoföretag). */
  preview: ReactPreview;
};

type ReactPreview = {
  cover: ReactNode;
  logo: ReactNode;
  staffA: ReactNode;
  staffB: ReactNode;
  nombre: string;
  rubro: string;
  rating: string;
  servicios: readonly { nombre: string; duracion: string; precio: string }[];
  flash: string;
  boka: string;
  staffMas: string;
};

const STEP_SECONDS = 4.2;
const REDUCE = "(prefers-reduced-motion: reduce)";

function subscribeReduce(cb: () => void) {
  const mq = window.matchMedia(REDUCE);
  mq.addEventListener("change", cb);
  return () => mq.removeEventListener("change", cb);
}

export function FlyttDemo(props: FlyttProps) {
  const [iState, setI] = useState(0);
  const [pState, setP] = useState(0);
  const [paused, setPaused] = useState(false);
  // Animationen startar först när sektionen syns (och pausar utanför skärmen) så att
  // den alltid börjar från steg 1 och inte konkurrerar med sidladdningen.
  const [visible, setVisible] = useState(false);
  const rootRef = useRef<HTMLElement>(null);
  useEffect(() => {
    const el = rootRef.current;
    if (!el) return;
    const io = new IntersectionObserver(
      ([e]) => setVisible(e?.isIntersecting ?? false),
      {
        threshold: 0.35,
      },
    );
    io.observe(el);
    return () => io.disconnect();
  }, []);
  const reduce = useSyncExternalStore(
    subscribeReduce,
    () => window.matchMedia(REDUCE).matches,
    () => false,
  );
  // Minskad rörelse: stanna på sista steget, ingen timer.
  const i = reduce ? 3 : iState;
  const p = reduce ? 1 : pState;

  useEffect(() => {
    if (reduce || paused || !visible) return;
    const id = setInterval(() => {
      setP((prev) => {
        const next = prev + 0.1 / STEP_SECONDS;
        if (next >= 1) {
          setI((s) => (s + 1) % 4);
          return 0;
        }
        return next;
      });
    }, 100);
    return () => clearInterval(id);
  }, [reduce, paused, visible]);

  const url = props.urlEjemplo;
  const typedLen = Math.min(url.length, Math.floor(p * 2.2 * url.length));
  const pasted = p > 0.5;
  const secs = Math.floor(p * 118);
  const clock = `${Math.floor(secs / 60)}:${String(secs % 60).padStart(2, "0")}`;
  const pv = props.preview;

  return (
    <section
      ref={rootRef}
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
      className="mx-auto grid max-w-360 grid-cols-1 gap-10 px-4 py-16 sm:px-8 lg:grid-cols-2 lg:items-center lg:gap-18 lg:px-22 lg:py-20"
    >
      <div className="flex flex-col gap-6.5">
        <HomeHeading
          chip="lavender"
          etiqueta={props.etiqueta}
          pre={props.tituloPre}
          marca={props.tituloMarca}
          className="gap-6.5"
        />
        <p className="max-w-130 text-16 leading-relaxed text-muted sm:text-18">
          {props.texto}
        </p>

        <ol className="flex max-w-135 flex-col gap-2">
          {props.pasos.map((s, k) => (
            <li key={s.titulo}>
              <button
                type="button"
                onClick={() => {
                  setI(k);
                  setP(0);
                }}
                aria-current={k === i ? "step" : undefined}
                className={cn(
                  "flex w-full cursor-pointer flex-col gap-2.5 rounded-panel px-4 py-3.5 text-left text-ink transition-all duration-500 ease-out focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink",
                  k === i ? "bg-surface shadow-soft" : "text-ink-soft",
                )}
              >
                <span className="flex items-center gap-3.5">
                  <span
                    className={cn(
                      "flex size-8.5 flex-none items-center justify-center rounded-event font-bold",
                      k <= i ? "bg-ink text-lime" : "bg-surface text-ink",
                    )}
                  >
                    {k + 1}
                  </span>
                  <span className="flex flex-1 flex-col">
                    <b className="text-16">{s.titulo}</b>
                    <span className="text-13 text-muted">{s.texto}</span>
                  </span>
                </span>
                <span className="ml-12 block h-0.75 overflow-hidden rounded-full bg-line-strong">
                  <span
                    style={{
                      width: `${k < i ? 100 : k === i ? Math.round(p * 100) : 0}%`,
                    }}
                    className="block h-full bg-ink"
                  />
                </span>
              </button>
            </li>
          ))}
        </ol>

        <div className="flex flex-wrap items-center gap-4">
          <Link
            href="/login"
            className="flex h-14 items-center gap-3.5 rounded-form bg-ink pr-2 pl-6 text-16 font-bold text-on-dark transition-opacity duration-150 ease-out hover:opacity-90 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink"
          >
            {props.cta}
            <span
              aria-hidden="true"
              className="flex size-10 items-center justify-center rounded-full bg-lime text-ink"
            >
              <ArrowRight className="size-4.5" strokeWidth={2.5} />
            </span>
          </Link>
          <span className="text-13 text-muted">{props.nota}</span>
        </div>
      </div>

      <div
        aria-hidden="true"
        className="relative flex items-center justify-center rounded-shell bg-flytt-stage p-4 sm:p-8 lg:h-140 lg:p-0"
      >
        <div className="flex max-h-130 min-h-95 w-full max-w-117.5 flex-col gap-3.5 rounded-hero bg-surface p-5.5 shadow-float-md">
          <div className="flex items-center justify-between gap-2">
            <b className="text-15">{props.ventana}</b>
            <span className="rounded-badge bg-canvas px-2 py-1 text-12 font-bold whitespace-nowrap text-muted">
              {props.pasoDe[i]}
            </span>
          </div>

          {i === 0 ? (
            <div className="flex animate-fade-up flex-col gap-3">
              <span className="text-13 font-semibold text-ink-soft">
                {props.linkLabel}
              </span>
              <div className="flex gap-2">
                <span className="flex h-13 min-w-0 flex-1 items-center overflow-hidden rounded-control border-2 border-ink px-3.5 font-mono text-13 whitespace-nowrap">
                  {url.slice(0, typedLen)}
                  <span className="ml-0.5 h-5 w-0.5 flex-none animate-hero-caret bg-ink" />
                </span>
                <span
                  className={cn(
                    "flex h-13 items-center rounded-control px-4.5 font-bold transition-colors duration-500",
                    pasted
                      ? "bg-ink text-on-dark"
                      : "bg-line-strong text-muted",
                  )}
                >
                  {props.hamta}
                </span>
              </div>
              {pasted ? (
                <span className="animate-pop-in self-start rounded-chip bg-success-bg px-2.5 py-1.25 text-12 font-bold text-success-fg">
                  {props.pegado}
                </span>
              ) : null}
              <span className="text-12 text-muted">{props.compat}</span>
            </div>
          ) : null}

          {i === 1 ? (
            <div className="flex animate-fade-up flex-col gap-3">
              <div className="flex items-center gap-3">
                <span className="size-5.5 flex-none animate-spin rounded-full border-3 border-line-strong border-t-ink" />
                <b className="text-16">{props.leyendo}</b>
                <span className="ml-auto text-13 font-bold text-muted">
                  {clock}
                </span>
              </div>
              <span className="block h-2 overflow-hidden rounded-full bg-line-strong">
                <span
                  style={{ width: `${Math.round(p * 100)}%` }}
                  className="block h-full bg-lime transition-all duration-500 ease-linear"
                />
              </span>
              {props.hallazgos
                .filter((f) => p > f.at)
                .map((f) => (
                  <div
                    key={f.label}
                    className="flex animate-fade-up items-center justify-between rounded-avatar bg-canvas px-3.5 py-2.75 text-14"
                  >
                    <span className="flex items-center gap-2.5">
                      <Check
                        className="size-4 text-success-fg"
                        strokeWidth={3}
                      />
                      {f.label}
                    </span>
                    <b>{f.count}</b>
                  </div>
                ))}
            </div>
          ) : null}

          {i === 2 ? (
            <div className="flex animate-fade-up flex-col gap-2.5">
              <b className="text-16">{props.elegir}</b>
              {props.opciones.map((k) => {
                const on = p > k.at;
                return (
                  <div
                    key={k.label}
                    className="flex items-center gap-3 rounded-avatar bg-canvas px-3 py-2.5"
                  >
                    <span
                      className={cn(
                        "flex size-5.5 flex-none items-center justify-center rounded-badge border-2 border-ink transition-colors duration-300",
                        on ? "bg-ink" : "bg-surface",
                      )}
                    >
                      {on ? (
                        <Check
                          className="size-3.5 animate-pop-in text-lime"
                          strokeWidth={3.5}
                        />
                      ) : null}
                    </span>
                    <span className="flex-1 text-14 font-semibold">
                      {k.label}
                    </span>
                    <span className="text-13 text-muted">{k.count}</span>
                  </div>
                );
              })}
              <span className="flex h-12.5 items-center justify-center rounded-control bg-ink font-bold text-on-dark">
                {props.importar}
              </span>
            </div>
          ) : null}

          {i === 3 ? (
            <div className="flex animate-fade-up flex-col gap-3">
              <span className="flex animate-pop-in items-center gap-2 self-start rounded-event bg-success-bg px-3 py-2 text-14 font-bold text-success-fg">
                <Check className="size-4" strokeWidth={3} />
                {props.listo}
              </span>
              <div className="overflow-hidden rounded-tile bg-surface shadow-soft">
                <div className="relative h-33 overflow-hidden">
                  {pv.cover}
                  <span className="absolute inset-0 bg-scrim-bottom" />
                  <span className="absolute top-3 right-3 flex items-center gap-1.5 rounded-event bg-surface/85 px-2.5 py-1.5 text-12 font-bold backdrop-blur-glass">
                    <span className="text-full-dot">★</span>
                    {pv.rating}
                  </span>
                  <span className="absolute -bottom-6.5 left-4 block size-15.5 overflow-hidden rounded-icon border-3 border-surface bg-dark shadow-soft">
                    {pv.logo}
                  </span>
                </div>
                <div className="flex flex-col gap-3 px-4 pt-8 pb-4">
                  <div className="flex items-end justify-between gap-2.5">
                    <span className="flex flex-col gap-0.5">
                      <b className="font-display text-20 tracking-title">
                        {pv.nombre}
                      </b>
                      <span className="text-12 text-muted">{pv.rubro}</span>
                    </span>
                    <span className="flex flex-none">
                      {pv.staffA}
                      <span className="-ml-2 flex">{pv.staffB}</span>
                      <span className="-ml-2 flex size-7.5 items-center justify-center rounded-full border-2 border-surface bg-lavender text-11 font-bold">
                        {pv.staffMas}
                      </span>
                    </span>
                  </div>
                  <div className="flex flex-col gap-1.5">
                    {pv.servicios.slice(0, 2).map((s) => (
                      <span
                        key={s.nombre}
                        className="flex items-center justify-between rounded-avatar bg-canvas px-3 py-2.5 text-13"
                      >
                        <span className="flex flex-col">
                          <b>{s.nombre}</b>
                          <span className="text-event-meta text-muted">
                            {s.duracion}
                          </span>
                        </span>
                        <b>{s.precio}</b>
                      </span>
                    ))}
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="flex items-center gap-1.5 rounded-event bg-lime px-2.5 py-2 text-12 font-bold text-on-lime-soft">
                      <svg
                        width="12"
                        height="12"
                        viewBox="0 0 24 24"
                        fill="currentColor"
                        aria-hidden="true"
                      >
                        <path d="M13 2 4 14h7l-1 8 9-12h-7z" />
                      </svg>
                      {pv.flash}
                    </span>
                    <span className="flex h-11 flex-1 items-center justify-center rounded-avatar bg-ink font-bold text-on-dark">
                      {pv.boka}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          ) : null}
        </div>
      </div>
    </section>
  );
}
