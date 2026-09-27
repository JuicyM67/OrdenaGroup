// DayButton — Reserva.dc.html rad 66–72 / DESIGN.md §7 "DayPicker (mobil)".
import { cn } from "@/components/ui/cn";
import { reserva } from "@/i18n";
import { formatLocalDate, type LocalDate } from "@/lib/format/dates";

export function DayButton({
  date,
  selected,
  full,
  flash,
  onSelect,
}: {
  date: LocalDate;
  selected: boolean;
  full: boolean;
  flash: boolean;
  onSelect: () => void;
}) {
  const hiddenId = `day-${date}-estado`;
  const dotSelectedInk = selected && flash;

  return (
    <button
      type="button"
      aria-pressed={selected}
      aria-label={formatLocalDate(date, "weekdayDayMonthLong")}
      aria-describedby={full || flash ? hiddenId : undefined}
      onClick={onSelect}
      className={cn(
        "flex h-20 flex-1 flex-col items-center justify-center gap-0.5 rounded-panel transition-colors duration-150 ease-out focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink focus-visible:transition-none",
        selected ? "bg-lime text-ink" : "bg-surface text-ink",
      )}
    >
      <span className="text-12 font-semibold">
        {formatLocalDate(date, "weekdayShort")}
      </span>
      <span className="font-display text-22 font-bold">
        {Number(date.slice(8, 10))}
      </span>
      <span
        aria-hidden="true"
        className={cn(
          "size-1.5 rounded-full",
          dotSelectedInk
            ? "bg-ink"
            : flash
              ? "bg-flash-dot"
              : full
                ? "bg-full-dot"
                : "bg-transparent",
        )}
      />
      {full || flash ? (
        <span id={hiddenId} className="sr-only">
          {full ? reserva.dia.llenoOculto : reserva.dia.flashOculto}
        </span>
      ) : null}
    </button>
  );
}
