"use client";
// WP-50: ägarappens datumfält (manuell bokning, flytta bokning) — en knapp som visar
// datumet formaterat i marknadens språk (src/lib/format/dates.ts, t.ex. "Vie 2 oct 2026")
// i stället för webbläsarens `<input type="date">`, som alltid visade mm/dd/yyyy (efter
// webbläsarens språk, inte marknadens — granskningsfynd, jfr. `time24-input.tsx` som redan
// gör samma sak för `type="time"`). Samma value/onChange-kontrakt som fältet hade: en
// "YYYY-MM-DD"-sträng. Radix Popover (samma mönster som `agenda/event-popover.tsx`) med
// `MiniCalendar` (`variant="light"`, redan byggd i WP-02/WP-12) för själva valet. `z-30`:
// högre än `Dialog.Overlay` (`z-20`, manual-booking-dialog.tsx/move-dialog.tsx) — fältet
// öppnas alltid inuti en redan öppen dialog.
import * as Popover from "@radix-ui/react-popover";
import { AlertCircle, CalendarDays } from "lucide-react";
import { useId, useState } from "react";

import { calendario } from "@/i18n";
import {
  addLocalDays,
  formatLocalDate,
  type LocalDate,
} from "@/lib/format/dates";

import { cn } from "./cn";
import { addMonths, type YearMonth } from "./mini-calendar/grid";
import {
  MiniCalendar,
  type MiniCalendarLabels,
} from "./mini-calendar/mini-calendar";

export type DateFieldProps = {
  id?: string;
  label: string;
  hint?: string;
  error?: string;
  /** Bara för anroparens egen validering (`manual-booking-dialog.tsx`/`move-dialog.tsx`
   * kollar redan `!date` i `handleSubmit`) — ingen ARIA/native `required` här: knappen har
   * ingen roll som stödjer `aria-required` (`role-supports-aria-props`), till skillnad
   * från `TextField`/`Select`s riktiga `<input>`/`<select>`. */
  required?: boolean;
  /** "YYYY-MM-DD" — anroparen sätter alltid ett giltigt startvärde (samma kontrakt som
   * `<input type="date">` hade). */
  value: string;
  onChange: (value: string) => void;
  className?: string;
};

const REFERENCE_MONDAY = "2024-01-01" as LocalDate; // känt en måndag
const WEEKDAY_MIN_LABELS: readonly [
  string,
  string,
  string,
  string,
  string,
  string,
  string,
] = Array.from({ length: 7 }, (_, i) =>
  formatLocalDate(addLocalDays(REFERENCE_MONDAY, i), "weekdayMin"),
) as [string, string, string, string, string, string, string];

function monthOf(date: string): YearMonth {
  return { year: Number(date.slice(0, 4)), month: Number(date.slice(5, 7)) };
}

function monthTitle(month: YearMonth): string {
  const first =
    `${String(month.year).padStart(4, "0")}-${String(month.month).padStart(2, "0")}-01` as LocalDate;
  return formatLocalDate(first, "monthYear");
}

/** "Vie 2 oct 2026" — inget färdigt preset i dates.ts har med året, så vi lägger till det
 * själva (ett rått årtal, inte översatt text — samma sak på alla marknader). */
function displayLabel(value: string): string {
  if (!value) return "…";
  const withoutYear = formatLocalDate(
    value as LocalDate,
    "weekdayDayMonthShort",
  );
  return `${withoutYear} ${value.slice(0, 4)}`;
}

export function DateField({
  id,
  label,
  hint,
  error,
  value,
  onChange,
  className,
}: DateFieldProps) {
  const generatedId = useId();
  const fieldId = id ?? generatedId;
  const hintId = hint ? `${fieldId}-hint` : undefined;
  const errorId = error ? `${fieldId}-error` : undefined;
  const describedBy = [hintId, errorId].filter(Boolean).join(" ") || undefined;

  const [open, setOpen] = useState(false);
  const [browsedMonth, setBrowsedMonth] = useState<YearMonth>(() =>
    monthOf(value),
  );

  const labels: MiniCalendarLabels = {
    title: monthTitle(browsedMonth),
    weekdays: WEEKDAY_MIN_LABELS,
    prevMonth: calendario.mesAnterior,
    nextMonth: calendario.mesSiguiente,
    dayLabel: (date) =>
      formatLocalDate(date as LocalDate, "weekdayDayMonthLong"),
  };

  return (
    <div className={cn("flex flex-col gap-1.5", className)}>
      <label htmlFor={fieldId} className="text-13 font-semibold text-ink">
        {label}
      </label>
      <Popover.Root
        open={open}
        onOpenChange={(next) => {
          if (next) setBrowsedMonth(monthOf(value));
          setOpen(next);
        }}
      >
        <Popover.Trigger asChild>
          <button
            type="button"
            id={fieldId}
            aria-describedby={describedBy}
            className={cn(
              "flex h-13 w-full items-center justify-between gap-2 rounded-control border-2 border-transparent bg-surface px-4 text-left text-15 font-medium text-ink transition-colors duration-150 ease-out focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink focus-visible:transition-none",
              error && "border-alert",
            )}
          >
            <span>{displayLabel(value)}</span>
            <CalendarDays
              aria-hidden="true"
              className="size-4.5 shrink-0 text-muted"
              strokeWidth={2}
            />
          </button>
        </Popover.Trigger>
        <Popover.Portal>
          <Popover.Content
            align="start"
            sideOffset={8}
            collisionPadding={12}
            className="z-30 rounded-panel bg-surface p-4 shadow-popover"
          >
            <MiniCalendar
              month={browsedMonth}
              selected={value || undefined}
              variant="light"
              onSelect={(date) => {
                onChange(date);
                setOpen(false);
              }}
              onPrevMonth={() => setBrowsedMonth((m) => addMonths(m, -1))}
              onNextMonth={() => setBrowsedMonth((m) => addMonths(m, 1))}
              labels={labels}
              className="w-64"
            />
          </Popover.Content>
        </Popover.Portal>
      </Popover.Root>
      {hint ? (
        <span id={hintId} className="text-13 text-muted">
          {hint}
        </span>
      ) : null}
      {error ? (
        <span
          id={errorId}
          className="flex items-center gap-1.5 text-13 text-ink"
        >
          <AlertCircle
            aria-hidden="true"
            className="size-4 shrink-0 text-alert"
            strokeWidth={2}
          />
          {error}
        </span>
      ) : null}
    </div>
  );
}
