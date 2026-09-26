"use client";

// Se DESIGN.md §7 "MiniCalendar" och WP-02 steg 6. <table role="grid"> med roving tabindex
// (bara en dag åt gången i tabordningen) och pil/Home/End-navigering. Dagar utanför månaden
// är disabled (WCAG 1.4.3 gäller inte inaktiva kontroller, DESIGN.md §4 tillåter subtle där).
import { ChevronLeft, ChevronRight } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import type { KeyboardEvent } from "react";

import { cn } from "../cn";
import { IconButton } from "../icon-button";
import { strokeArrow } from "../icons";
import { addDays, buildMonthGrid, type YearMonth } from "./grid";

export type MiniCalendarLabels = {
  title: string;
  /** Måndag → söndag, t.ex. ["Lu","Ma","Mi","Ju","Vi","Sá","Do"]. */
  weekdays: readonly [string, string, string, string, string, string, string];
  prevMonth: string;
  nextMonth: string;
  dayLabel: (date: string) => string;
};

export type MiniCalendarProps = {
  month: YearMonth;
  selected?: string;
  today?: string;
  markedDates?: ReadonlySet<string>;
  /** Bara i den mörka varianten: markerar veckan (måndag i veckan) med ett bakgrundsband. */
  highlightWeekOf?: string;
  variant: "light" | "dark";
  onSelect?: (date: string) => void;
  onPrevMonth?: () => void;
  onNextMonth?: () => void;
  labels: MiniCalendarLabels;
  className?: string;
};

function pickInitialActive(
  weeks: ReturnType<typeof buildMonthGrid>,
  selected: string | undefined,
  today: string | undefined,
): string {
  const cells = weeks.flat();
  const bySelected =
    selected && cells.find((c) => c.date === selected && c.inMonth);
  if (bySelected) return selected as string;
  const byToday = today && cells.find((c) => c.date === today && c.inMonth);
  if (byToday) return today as string;
  const firstInMonth = cells.find((c) => c.inMonth);
  return firstInMonth ? firstInMonth.date : (cells[0]?.date ?? "");
}

export function MiniCalendar({
  month,
  selected,
  today,
  markedDates,
  highlightWeekOf,
  variant,
  onSelect,
  onPrevMonth,
  onNextMonth,
  labels,
  className,
}: MiniCalendarProps) {
  const weeks = buildMonthGrid(month.year, month.month);
  const [activeDateState, setActiveDate] = useState(() =>
    pickInitialActive(weeks, selected, today),
  );
  // Ren härledning i stället för att nollställa activeDate i en effekt (undviker
  // cascading setState-in-effect): om det sparade datumet inte längre finns i den
  // renderade månaden faller vi tillbaka på samma val som initialt.
  const activeDate = weeks
    .flat()
    .some((c) => c.date === activeDateState && c.inMonth)
    ? activeDateState
    : pickInitialActive(weeks, selected, today);
  const cellRefs = useRef(new Map<string, HTMLButtonElement>());
  const pendingFocusRef = useRef<string | null>(null);

  useEffect(() => {
    // Efter en månadsväxling (onPrev/NextMonth) väntar en dag på att få fokus när den
    // väl finns i det nya, renderade rutnätet. Ren sidoeffekt (imperativ .focus()),
    // ingen setState här.
    const pending = pendingFocusRef.current;
    if (pending) {
      const el = cellRefs.current.get(pending);
      if (el) {
        el.focus();
        pendingFocusRef.current = null;
      }
    }
  }, [month.year, month.month]);

  function isInGrid(date: string): boolean {
    return weeks.flat().some((c) => c.date === date && c.inMonth);
  }

  function moveTo(target: string) {
    setActiveDate(target);
    if (isInGrid(target)) {
      const el = cellRefs.current.get(target);
      el?.focus();
      return;
    }
    pendingFocusRef.current = target;
    const monthFirstDate = `${String(month.year).padStart(4, "0")}-${String(month.month).padStart(2, "0")}-01`;
    if (target < monthFirstDate) {
      onPrevMonth?.();
    } else {
      onNextMonth?.();
    }
  }

  function handleKeyDown(
    event: KeyboardEvent<HTMLButtonElement>,
    date: string,
  ) {
    switch (event.key) {
      case "ArrowLeft":
        event.preventDefault();
        moveTo(addDays(date, -1));
        break;
      case "ArrowRight":
        event.preventDefault();
        moveTo(addDays(date, 1));
        break;
      case "ArrowUp":
        event.preventDefault();
        moveTo(addDays(date, -7));
        break;
      case "ArrowDown":
        event.preventDefault();
        moveTo(addDays(date, 7));
        break;
      case "Home":
        event.preventDefault();
        moveTo(
          addDays(date, -((new Date(`${date}T00:00:00Z`).getUTCDay() + 6) % 7)),
        );
        break;
      case "End":
        event.preventDefault();
        moveTo(
          addDays(
            date,
            6 - ((new Date(`${date}T00:00:00Z`).getUTCDay() + 6) % 7),
          ),
        );
        break;
      default:
        break;
    }
  }

  const isLight = variant === "light";

  return (
    <div className={cn("flex flex-col gap-3", className)}>
      <div className="flex items-center justify-between">
        <h2
          className={
            isLight ? "text-18 font-bold" : "text-17 font-semibold text-on-dark"
          }
        >
          {labels.title}
        </h2>
        <div className="flex gap-1">
          <IconButton
            label={labels.prevMonth}
            tone={isLight ? "canvas" : "ghost-dark"}
            size={isLight ? 32 : 30}
            onClick={onPrevMonth}
          >
            <ChevronLeft
              aria-hidden="true"
              className="size-4"
              strokeWidth={strokeArrow}
            />
          </IconButton>
          <IconButton
            label={labels.nextMonth}
            tone={isLight ? "canvas" : "ghost-dark"}
            size={isLight ? 32 : 30}
            onClick={onNextMonth}
          >
            <ChevronRight
              aria-hidden="true"
              className="size-4"
              strokeWidth={strokeArrow}
            />
          </IconButton>
        </div>
      </div>

      <table
        role="grid"
        aria-label={labels.title}
        className="w-full table-fixed border-collapse"
      >
        <thead>
          <tr>
            {labels.weekdays.map((wd) => (
              <th
                key={wd}
                abbr={wd}
                scope="col"
                className={cn(
                  "pb-0.5 text-12 font-semibold",
                  isLight ? "text-muted" : "text-on-dark-subtle",
                )}
              >
                {wd}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {weeks.map((week, wi) => {
            const isHighlighted = !isLight && highlightWeekOf === week[0]?.date;
            return (
              <tr
                key={wi}
                className={cn("h-8.5", isHighlighted && "bg-dark-2")}
              >
                {week.map((cell, ci) => {
                  const isSelected = cell.date === selected;
                  const isToday = cell.date === today;
                  const hasDot =
                    isLight &&
                    !isSelected &&
                    cell.inMonth &&
                    markedDates?.has(cell.date);
                  return (
                    <td
                      key={cell.date}
                      className={cn(
                        isHighlighted && ci === 0 && "rounded-l-full",
                        isHighlighted &&
                          ci === week.length - 1 &&
                          "rounded-r-full",
                      )}
                    >
                      <div className="flex flex-col items-center justify-center gap-0.5">
                        <button
                          ref={(el) => {
                            if (el) cellRefs.current.set(cell.date, el);
                            else cellRefs.current.delete(cell.date);
                          }}
                          type="button"
                          disabled={!cell.inMonth}
                          tabIndex={cell.date === activeDate ? 0 : -1}
                          aria-label={labels.dayLabel(cell.date)}
                          aria-pressed={cell.inMonth ? isSelected : undefined}
                          aria-current={isToday ? "date" : undefined}
                          onFocus={() => setActiveDate(cell.date)}
                          onKeyDown={(e) => handleKeyDown(e, cell.date)}
                          onClick={() => {
                            setActiveDate(cell.date);
                            onSelect?.(cell.date);
                          }}
                          className={cn(
                            "flex items-center justify-center font-semibold transition-colors duration-150 ease-out focus-visible:outline-2 focus-visible:outline-offset-2 disabled:cursor-default",
                            isLight
                              ? "h-6.5 w-7.5 rounded-full text-13 focus-visible:outline-ink"
                              : "h-7.5 w-7.5 rounded-full text-event-title focus-visible:outline-lime",
                            isLight && !cell.inMonth && "text-subtle",
                            isLight &&
                              cell.inMonth &&
                              !isSelected &&
                              "text-ink",
                            isLight && isSelected && "bg-ink text-on-dark",
                            !isLight && !cell.inMonth && "text-on-dark-faint",
                            !isLight &&
                              cell.inMonth &&
                              !isSelected &&
                              "text-on-dark-soft",
                            !isLight && isSelected && "bg-lime text-ink",
                          )}
                        >
                          {cell.day}
                        </button>
                        {hasDot ? (
                          <span
                            aria-hidden="true"
                            className="size-1 rounded-full bg-violet"
                          />
                        ) : null}
                      </div>
                    </td>
                  );
                })}
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
