// Se DESIGN.md §7 "Byggt i WP-12". Presentationell — all interaktivitet (roving tabindex
// m.m.) lever redan i MiniCalendar (WP-02, "use client"); AgendaScreen äger tillståndet
// för vilken månad som visas.
import { Card } from "@/components/ui/card";
import {
  MiniCalendar,
  type MiniCalendarLabels,
} from "@/components/ui/mini-calendar/mini-calendar";
import type { YearMonth } from "@/components/ui/mini-calendar/grid";
import { formatLocalDate, type LocalDate } from "@/lib/format/dates";
import { agenda, calendario } from "@/i18n";

import { weekdayMinLabels } from "./agenda-view";

export type MonthCardProps = {
  month: YearMonth;
  selected: LocalDate;
  today: LocalDate;
  /** Måndagen i den vecka som ska markeras (bara mörk variant, se MiniCalendar). */
  highlightWeekOf: LocalDate;
  onSelect: (date: LocalDate) => void;
  onPrevMonth: () => void;
  onNextMonth: () => void;
};

export function MonthCard({
  month,
  selected,
  today,
  highlightWeekOf,
  onSelect,
  onPrevMonth,
  onNextMonth,
}: MonthCardProps) {
  const monthStart =
    `${String(month.year).padStart(4, "0")}-${String(month.month).padStart(2, "0")}-01` as LocalDate;
  const labels: MiniCalendarLabels = {
    title: formatLocalDate(monthStart, "monthYear"),
    weekdays: weekdayMinLabels,
    prevMonth: calendario.mesAnterior,
    nextMonth: calendario.mesSiguiente,
    dayLabel: (date) =>
      formatLocalDate(date as LocalDate, "weekdayDayMonthLong"),
  };
  return (
    <Card
      as="section"
      aria-label={agenda.calendarioMensualAria}
      tone="dark"
      radius="card"
      padding="none"
      className="p-5"
    >
      <MiniCalendar
        month={month}
        selected={selected}
        today={today}
        highlightWeekOf={highlightWeekOf}
        variant="dark"
        onSelect={(date) => onSelect(date as LocalDate)}
        onPrevMonth={onPrevMonth}
        onNextMonth={onNextMonth}
        labels={labels}
      />
    </Card>
  );
}
