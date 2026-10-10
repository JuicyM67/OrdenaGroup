"use client";

// Tre flytande liquid-glass-kort i heron: innehållet tonar mjukt mellan varianter i olika
// takt och korten svävar (CSS-drift). Ett gemensamt tick (500 ms). Desktop: absolut
// placerade till höger; mobil: bara det första kortet, i flödet (WP-71, Konv1.dc.html).
import { useEffect, useState, type ReactNode } from "react";

import { cn } from "@/components/ui/cn";
import { copy } from "@/i18n/marketing";

const t = copy.home.hero;

function Layers<T>({
  items,
  tick,
  period,
  offset,
  render,
  rowClass,
}: {
  items: readonly T[];
  tick: number;
  period: number;
  offset: number;
  render: (item: T) => ReactNode;
  rowClass?: string;
}) {
  const n = items.length;
  const idx = Math.floor((tick * 0.5 + offset) / period) % n;
  const prev = (idx + n - 1) % n;
  return (
    <>
      {items.map((item, k) => (
        <div
          key={k}
          aria-hidden={k === idx ? undefined : true}
          className={cn(
            "absolute inset-0 flex gap-1.5 p-4 transition-all duration-900 ease-out",
            rowClass ?? "flex-col justify-center",
            k === idx
              ? "translate-y-0 opacity-100 blur-none"
              : cn(
                  "blur-layer",
                  k === prev
                    ? "-translate-y-3 opacity-0"
                    : "translate-y-3 opacity-0",
                ),
          )}
        >
          {render(item)}
        </div>
      ))}
    </>
  );
}

export function FloatCards({ variant }: { variant: "desktop" | "mobile" }) {
  const [tick, setTick] = useState(0);

  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const id = setInterval(() => setTick((v) => v + 1), 500);
    return () => clearInterval(id);
  }, []);

  return (
    <>
      <div
        className={cn(
          "h-26 w-full max-w-67.5 animate-drift-1 overflow-hidden rounded-card glass-light",
          variant === "desktop"
            ? "absolute top-44 right-16 w-67.5"
            : "relative",
        )}
      >
        <Layers
          items={t.cardA}
          tick={tick}
          period={4.5}
          offset={0}
          render={(s) => (
            <>
              <span className="text-11 font-bold tracking-caps text-muted">
                {s.eyebrow}
              </span>
              <b className="text-16">{s.title}</b>
              <span className="self-start rounded-badge bg-success-bg px-2 py-0.75 text-12 font-bold text-success-fg">
                {s.chip}
              </span>
            </>
          )}
        />
      </div>

      {variant === "desktop" ? (
        <>
          <div className="absolute top-79.5 right-30 h-20.5 w-62.5 animate-drift-2 overflow-hidden rounded-card glass-light">
            <Layers
              items={t.cardB}
              tick={tick}
              period={5.5}
              offset={1.5}
              rowClass="flex-row items-center justify-start gap-3"
              render={(s) => (
                <>
                  <span className="font-display text-34 font-bold">
                    {s.big}
                  </span>
                  <span className="flex flex-col">
                    <span
                      aria-hidden="true"
                      className="tracking-caps text-full-dot"
                    >
                      ★★★★★
                    </span>
                    <span className="text-12 text-ink-soft">{s.sub}</span>
                  </span>
                </>
              )}
            />
          </div>

          <div className="absolute top-109.5 right-14 h-25 w-70 animate-drift-3 overflow-hidden rounded-card glass-light">
            <Layers
              items={t.cardC}
              tick={tick}
              period={5}
              offset={3}
              render={(s) => (
                <>
                  <span className="flex items-center gap-1.5 text-11 font-bold tracking-caps text-muted">
                    <svg
                      width="14"
                      height="14"
                      viewBox="0 0 24 24"
                      aria-hidden="true"
                      className="fill-flash-dot"
                    >
                      <path d="M13 2 4 14h7l-1 8 9-12h-7z" />
                    </svg>
                    {s.eyebrow}
                  </span>
                  <b className="text-18">{s.title}</b>
                  <span className="text-12 text-ink-soft">{s.sub}</span>
                </>
              )}
            />
          </div>
        </>
      ) : null}
    </>
  );
}
