"use client";
// Se DESIGN.md §7 "Byggt i WP-12". Gemensamt rutnät för vecka OCH dag (dagvyns formspråk
// härleds ur samma komponent, se docs/tasks/plans/WP-12.md steg 5/7). GUTTER_PX/RIGHT_PX är
// konstanter (klasser), inte data — bara `top`/`height` av den enskilda tidslinjen/etiketten
// räknas ur data (D-021).
import { useEffect, useRef, type ReactNode } from "react";

import { HOUR_PX, TOP_PX } from "./geometry";
import { ClosedDay } from "./closed-day";

/** Utrymme under sista timmen, så sista radens etikett inte klipps av panelens kant. */
const BOTTOM_PAD_PX = 16;

export type TimeGridColumn = {
  key: string;
  header?: ReactNode;
  closed: boolean;
  /** Redan positionerade barn (EventBlock/BlockItem/NowLine), se agenda-screen.tsx. */
  items: ReactNode;
};

export type TimeGridProps = {
  ariaLabel: string;
  startHour: number;
  endHour: number;
  /** 0 i veckovyn, 44 i dagvyn (DAY_HEADER_PX). */
  headerHeight: number;
  columns: readonly TimeGridColumn[];
  /** Första synliga timmen vid montering (öppningen, eller nu − 1 h om idag syns). */
  initialScrollHour?: number;
};

export function TimeGrid({
  ariaLabel,
  startHour,
  endHour,
  headerHeight,
  columns,
  initialScrollHour,
}: TimeGridProps) {
  const scrollRef = useRef<HTMLDivElement>(null);

  // Bara vid montering: scrollar till öppningen (eller nu − 1 h), aldrig på senare props-
  // ändringar (det skulle rycka bort användarens egen scroll).
  useEffect(() => {
    const el = scrollRef.current;
    if (!el || initialScrollHour === undefined) return;
    el.scrollTop = Math.max(0, (initialScrollHour - startHour) * HOUR_PX);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- bara vid montering, se ovan
  }, []);

  const hourCount = Math.max(0, endHour - startHour);
  const hours = Array.from({ length: hourCount }, (_, i) => startHour + i);
  const contentHeight =
    headerHeight + TOP_PX + hourCount * HOUR_PX + BOTTOM_PAD_PX;

  return (
    <section
      aria-label={ariaLabel}
      className="relative mt-4 flex-1 overflow-hidden rounded-tile bg-surface"
    >
      <div
        ref={scrollRef}
        className="absolute inset-0 overflow-x-hidden overflow-y-auto"
      >
        <div className="relative" style={{ height: contentHeight }}>
          {hours.map((h) => (
            <HourMark
              key={h}
              hour={h}
              top={headerHeight + TOP_PX + (h - startHour) * HOUR_PX}
            />
          ))}
          <div className="absolute inset-y-0 right-2 left-16 flex">
            {columns.map((col) => (
              <div
                key={col.key}
                className="relative min-w-0 flex-1 border-l border-line"
              >
                {col.header ? (
                  <div
                    className="absolute inset-x-0 top-0 border-b border-line"
                    style={{ height: headerHeight }}
                  >
                    {col.header}
                  </div>
                ) : null}
                <div
                  className="absolute inset-x-0"
                  style={{ top: headerHeight }}
                >
                  {col.items}
                </div>
                {col.closed ? <ClosedDay /> : null}
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}

function HourMark({ hour, top }: { hour: number; top: number }) {
  return (
    <>
      <div
        aria-hidden="true"
        className="absolute right-2 left-16 h-px bg-line"
        style={{ top }}
      />
      <div
        aria-hidden="true"
        className="absolute left-4 text-12 font-semibold text-muted"
        style={{ top: top - 8 }}
      >
        {hour}:00
      </div>
    </>
  );
}
