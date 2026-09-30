"use client";
// WP-50: agendans månadsvy, härledd — ingen ritad referens (SegmentedControl-knappen "Mes"
// var hårdkodat `disabled` sedan WP-12). Samma formspråk som WeekGrid (vit panel, radie
// `rounded-tile`), men ett rutnät 7×(5–6) i stället för timmar. Klick på en dag växlar till
// dagvyn (`agenda-screen.tsx`). Ingen geometri i `style` — bara CSS-rutnät (D-021 gäller bara
// tidslinjer/lanes, inte den här vyn).
import { cn } from "@/components/ui/cn";
import type { YearMonth } from "@/components/ui/mini-calendar/grid";
import type { LocalDate } from "@/lib/format/dates";
import { agenda } from "@/i18n";

import { staffBgClass, weekdayMinLabels } from "./agenda-view";
import {
  isMonthDayClosed,
  monthCellAria,
  monthWeeks,
  type MonthDaySummary,
} from "./month-view";
import type { AgendaBusinessHours, StaffColor } from "./types";

export type MonthGridProps = {
  month: YearMonth;
  today: LocalDate;
  hours: AgendaBusinessHours;
  counts: ReadonlyMap<LocalDate, MonthDaySummary>;
  onSelectDay: (date: LocalDate) => void;
  /** WP-50: sant medan `onLoadMonthCounts` väntar på svar (`agenda-screen.tsx`) — dämpar
   * rutnätet i stället för att visa ett tomt/felaktigt läge under tiden. */
  loading?: boolean;
  className?: string;
};

export function MonthGrid({
  month,
  today,
  hours,
  counts,
  onSelectDay,
  loading = false,
  className,
}: MonthGridProps) {
  const weeks = monthWeeks(month);
  return (
    <section
      aria-label={agenda.mes.rejillaAria}
      aria-busy={loading || undefined}
      className={cn(
        "relative mt-4 flex min-h-0 flex-1 flex-col overflow-hidden rounded-tile bg-surface p-3 transition-opacity duration-150 ease-out",
        loading && "opacity-60",
        className,
      )}
    >
      <div className="grid shrink-0 grid-cols-7 px-1 pb-2">
        {weekdayMinLabels.map((wd, i) => (
          <div key={i} className="text-center text-12 font-semibold text-muted">
            {wd}
          </div>
        ))}
      </div>
      <div className="grid min-h-0 flex-1 auto-rows-fr grid-cols-7 gap-1 overflow-y-auto">
        {weeks.flat().map((cell) => {
          const date = cell.date as LocalDate;
          const summary = cell.inMonth ? counts.get(date) : undefined;
          const closed = cell.inMonth && isMonthDayClosed(date, hours);
          const isToday = cell.inMonth && date === today;
          return (
            <button
              key={date}
              type="button"
              disabled={!cell.inMonth}
              aria-current={isToday ? "date" : undefined}
              aria-label={
                cell.inMonth
                  ? monthCellAria(date, closed, summary?.count ?? 0)
                  : undefined
              }
              onClick={() => onSelectDay(date)}
              className={cn(
                "flex min-h-11 flex-col items-start gap-1 rounded-control p-2 text-left transition-colors duration-150 ease-out",
                "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink focus-visible:transition-none",
                "disabled:cursor-default",
                cell.inMonth && !closed && "hover:bg-canvas",
                cell.inMonth && closed && "bg-canvas/60",
              )}
            >
              <span
                className={cn(
                  "text-14 font-semibold",
                  !cell.inMonth
                    ? "text-subtle"
                    : isToday
                      ? "font-bold text-violet"
                      : closed
                        ? "text-muted"
                        : "text-ink",
                )}
              >
                {cell.day}
              </span>
              {summary && summary.count > 0 ? (
                <span className="mt-auto flex items-center gap-1.5">
                  <span
                    aria-hidden="true"
                    className="flex items-center gap-0.5"
                  >
                    {summary.staffColors.map((color, i) => (
                      <StaffDot key={i} color={color} />
                    ))}
                  </span>
                  <span
                    aria-hidden="true"
                    className="text-11 font-semibold text-muted"
                  >
                    {summary.count}
                  </span>
                </span>
              ) : null}
            </button>
          );
        })}
      </div>
    </section>
  );
}

function StaffDot({ color }: { color: StaffColor }) {
  return <span className={cn("size-1.5 rounded-full", staffBgClass(color))} />;
}
