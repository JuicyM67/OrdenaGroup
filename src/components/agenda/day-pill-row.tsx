// Se DESIGN.md §7 "Byggt i WP-12" och docs/design/reference/Agenda.dc.html (rad GMT + dagar).
import { cn } from "@/components/ui/cn";
import { formatLocalDate, type LocalDate } from "@/lib/format/dates";

export type DayPillRowProps = {
  days: readonly LocalDate[];
  today: LocalDate;
  closedDates: ReadonlySet<LocalDate>;
  gmtLabel: string;
  /** "dia": den valda dagen får vit bakgrund. "semana": bara idag får vit bakgrund. */
  vista: "semana" | "dia";
  selectedDate: LocalDate | null;
  onSelectDay: (date: LocalDate) => void;
};

export function DayPillRow({
  days,
  today,
  closedDates,
  gmtLabel,
  vista,
  selectedDate,
  onSelectDay,
}: DayPillRowProps) {
  return (
    <div className="mt-4 flex h-18 gap-2">
      <div className="flex w-14 items-center justify-center rounded-control bg-surface/35 text-11 font-bold text-ink-soft">
        {gmtLabel}
      </div>
      {days.map((date) => (
        <DayPill
          key={date}
          date={date}
          isToday={date === today}
          isClosed={closedDates.has(date)}
          isSelected={vista === "dia" && date === selectedDate}
          onSelect={() => onSelectDay(date)}
        />
      ))}
    </div>
  );
}

function DayPill({
  date,
  isToday,
  isClosed,
  isSelected,
  onSelect,
}: {
  date: LocalDate;
  isToday: boolean;
  isClosed: boolean;
  isSelected: boolean;
  onSelect: () => void;
}) {
  const dayNumber = String(Number(date.slice(8, 10)));
  return (
    <button
      type="button"
      onClick={onSelect}
      aria-pressed={isSelected}
      aria-current={isToday ? "date" : undefined}
      className={cn(
        "flex flex-1 items-center justify-center gap-2 rounded-control transition-colors duration-150 ease-out",
        "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink focus-visible:transition-none",
        isClosed
          ? "bg-surface/20"
          : isSelected || isToday
            ? "bg-surface"
            : "bg-surface/38",
      )}
    >
      <span
        className={cn(
          "text-14 font-semibold",
          isToday ? "text-violet" : "text-ink-soft",
        )}
      >
        {formatLocalDate(date, "weekdayShortLower")}
      </span>
      <span
        className={cn(
          "font-display text-30 font-bold tracking-display",
          isToday ? "text-violet" : isClosed ? "text-muted" : "text-ink",
        )}
      >
        {dayNumber}
      </span>
    </button>
  );
}
