"use client";
// WP-50: ägarappens datumfält (manuell bokning, flytta bokning) — en knapp som visar
// datumet formaterat i marknadens språk (src/lib/format/dates.ts, t.ex. "Vie 2 oct 2026")
// i stället för webbläsarens `<input type="date">`, som alltid visade mm/dd/yyyy (efter
// webbläsarens språk, inte marknadens — granskningsfynd, jfr. `time24-input.tsx` som redan
// gör samma sak för `type="time"`). Samma value/onChange-kontrakt som fältet hade: en
// "YYYY-MM-DD"-sträng.
//
// Buggrapport (ägarens test, troligen Safari/WebKit): kalendern öppnade sig inte när
// fältet användes inuti en Radix `Dialog` (flash-slot-dialog.tsx, manual-booking-
// dialog.tsx, move-dialog.tsx). Tidigare version använde Radix `Popover` + `Portal`
// (samma mönster som `agenda/event-popover.tsx`) — ett innehåll portalerat till
// `document.body`, alltså UTANFÖR Dialogens DOM-gren och dess `FocusScope`-fokusfälla.
// Det är en känd konflikt mellan nästlade Radix-primitiver: Dialogens fokusfälla kan dra
// tillbaka fokus/stänga Popovern innan klicket hinner registreras, och beteendet skiljer
// sig mellan webbläsare (fungerade i Chromium, inte för ägaren). Fixen: ingen Portal, inget
// Popover — kalendern renderas INLINE, direkt i samma DOM-gren som fältet (`MiniCalendar`,
// `variant="light"`, redan byggd i WP-02/WP-12), och fälls ut under knappen i normalt
// dokumentflöde i stället för att flyta ovanpå innehållet. Stängs vid val, klick utanför
// eller Escape (egen `mousedown`/`keydown`-koll — ingen Portal att förlita sig på för det).
// `col-span-2`: när fältet används i en `grid grid-cols-2`-rad (dag/tid-rader i de tre
// dialogerna ovan) får den utfällda kalendern hela radens bredd i stället för att klämmas
// in i halva — CSS grid-auto-flow flyttar automatiskt nästa fält (tiden) till nästa rad,
// ingen koordinering med anroparen behövs. Utanför grid (t.ex. `caja-screen.tsx`s
// datumintervall) är klassen en no-op.
import { AlertCircle, CalendarDays } from "lucide-react";
import { useEffect, useId, useRef, useState } from "react";

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
  const rootRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);

  function openCalendar() {
    setBrowsedMonth(monthOf(value));
    setOpen(true);
  }

  function closeCalendar(refocus = false) {
    setOpen(false);
    if (refocus) buttonRef.current?.focus();
  }

  // Ingen Portal att förlita sig på för "klick utanför" längre (jfr. filkommentaren ovan)
  // — vanlig `mousedown`/`keydown`-koll mot roten räcker, eftersom kalendern lever kvar i
  // samma DOM-gren som fältet (och därmed inuti en eventuell Dialogs `FocusScope`).
  useEffect(() => {
    if (!open) return;
    function handlePointerDown(event: MouseEvent) {
      if (!rootRef.current?.contains(event.target as Node)) {
        setOpen(false);
      }
    }
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        event.preventDefault();
        closeCalendar(true);
      }
    }
    document.addEventListener("mousedown", handlePointerDown);
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("mousedown", handlePointerDown);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [open]);

  const labels: MiniCalendarLabels = {
    title: monthTitle(browsedMonth),
    weekdays: WEEKDAY_MIN_LABELS,
    prevMonth: calendario.mesAnterior,
    nextMonth: calendario.mesSiguiente,
    dayLabel: (date) =>
      formatLocalDate(date as LocalDate, "weekdayDayMonthLong"),
  };

  return (
    <div
      ref={rootRef}
      className={cn("flex flex-col gap-1.5", open && "col-span-2", className)}
    >
      <label htmlFor={fieldId} className="text-13 font-semibold text-ink">
        {label}
      </label>
      <button
        ref={buttonRef}
        type="button"
        id={fieldId}
        aria-haspopup="grid"
        aria-expanded={open}
        aria-describedby={describedBy}
        onClick={() => (open ? closeCalendar() : openCalendar())}
        className={cn(
          "flex h-13 w-full items-center justify-between gap-2 rounded-control border-2 border-transparent bg-field px-4 text-left text-15 font-medium text-ink transition-colors duration-150 ease-out focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink focus-visible:transition-none",
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
      {open ? (
        <MiniCalendar
          month={browsedMonth}
          selected={value || undefined}
          variant="light"
          onSelect={(date) => {
            onChange(date);
            closeCalendar(true);
          }}
          onPrevMonth={() => setBrowsedMonth((m) => addMonths(m, -1))}
          onNextMonth={() => setBrowsedMonth((m) => addMonths(m, 1))}
          labels={labels}
          className="w-full rounded-panel bg-surface p-3 shadow-popover"
        />
      ) : null}
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
