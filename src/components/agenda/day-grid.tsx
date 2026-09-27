// Se DESIGN.md §7 "Byggt i WP-12" — härledd, ingen referens (WP-12 steg 7/FRÅGA 2).
// `time-grid.tsx` med en kolumn per synlig profesional i stället för en kolumn per dag.
import type { ReactNode } from "react";

import { cn } from "@/components/ui/cn";
import {
  formatLocalDate,
  formatTime,
  isoWeekdayOf,
  toLocalDate,
  type LocalDate,
  type TimeZone,
} from "@/lib/format/dates";
import { agenda } from "@/i18n";

import { staffBgClass, toInstant } from "./agenda-view";
import { BlockItem } from "./block-item";
import { EventBlock } from "./event-block";
import {
  eventBox,
  nowTop,
  showTime as isTimeVisible,
  type HourRange,
} from "./geometry";
import { layoutLanes } from "./layout-events";
import { NowLine } from "./now-line";
import { TimeGrid, type TimeGridColumn } from "./time-grid";
import type { AgendaBooking, AgendaData, AgendaStaff, StaffId } from "./types";

export type DayGridProps = {
  data: AgendaData;
  date: LocalDate;
  tz: TimeZone;
  today: LocalDate;
  now: Date;
  gridRange: HourRange;
  visibleStaff: readonly AgendaStaff[];
  /** Ringmarkerad profesional (FRÅGA 5): visas i första kolumnen. */
  highlightedStaffId: StaffId | null;
  selectedBookingId: string | null;
  renderTrigger: (booking: AgendaBooking, trigger: ReactNode) => ReactNode;
  onSelectBooking: (id: string) => void;
  initialScrollHour: number;
};

export function DayGrid({
  data,
  date,
  tz,
  today,
  now,
  gridRange,
  visibleStaff,
  highlightedStaffId,
  selectedBookingId,
  renderTrigger,
  onSelectBooking,
  initialScrollHour,
}: DayGridProps) {
  const isClosed = !(data.business.hours[isoWeekdayOf(date)] ?? []).length;
  const orderedStaff = highlightedStaffId
    ? [
        ...visibleStaff.filter((s) => s.id === highlightedStaffId),
        ...visibleStaff.filter((s) => s.id !== highlightedStaffId),
      ]
    : visibleStaff;

  const columns: TimeGridColumn[] = orderedStaff.map((staff) => {
    const staffBookings = data.bookings.filter(
      (b) =>
        b.staffId === staff.id && toLocalDate(toInstant(b.start), tz) === date,
    );
    const laneOf = new Map(
      layoutLanes(
        staffBookings.map((b) => ({
          id: b.id,
          start: toInstant(b.start),
          end: toInstant(b.end),
        })),
      ).map((r) => [r.id, r]),
    );
    const staffBlocks = data.blocks.filter(
      (b) => b.staffId === staff.id && b.start.startsWith(date),
    );

    const items: ReactNode[] = [];
    for (const booking of staffBookings) {
      const start = toInstant(booking.start);
      const end = toInstant(booking.end);
      const box = eventBox(start, end, gridRange.startHour, tz);
      const lane = laneOf.get(booking.id);
      const variant =
        booking.source === "flash"
          ? "flash"
          : booking.source === "waitlist"
            ? "waitlist"
            : "staff";
      const meta = isTimeVisible(box.height)
        ? agenda.bloque.meta({
            hora: formatTime(start, tz),
            servicio: booking.service,
          })
        : null;
      const ariaLabel = agenda.bloque.aria({
        cliente: booking.clientName,
        servicio: booking.service,
        hora: formatTime(start, tz),
        profesional: staff.name,
      });
      const trigger = (
        <EventBlock
          key={booking.id}
          variant={variant}
          staffColor={staff.color}
          selected={booking.id === selectedBookingId}
          title={booking.clientName}
          meta={meta}
          showAvatar={false}
          top={box.top}
          height={box.height}
          flashPct={booking.flashPct}
          lane={
            lane && lane.lanes > 1
              ? { index: lane.lane, lanes: lane.lanes }
              : undefined
          }
          ariaLabel={ariaLabel}
          onClick={() => onSelectBooking(booking.id)}
        />
      );
      items.push(renderTrigger(booking, trigger));
    }
    for (const block of staffBlocks) {
      const box = eventBox(
        toInstant(block.start),
        toInstant(block.end),
        gridRange.startHour,
        tz,
      );
      items.push(
        <BlockItem
          key={`${staff.id}-${block.start}`}
          kind={block.kind}
          top={box.top}
          height={box.height}
        />,
      );
    }
    if (date === today) {
      const top = nowTop(now, gridRange.startHour, gridRange.endHour, tz);
      if (top != null) items.push(<NowLine key="now" top={top} />);
    }

    const dayCount = data.dayCounts?.[date]?.[staff.id] ?? staffBookings.length;

    return {
      key: staff.id,
      closed: isClosed,
      header: (
        <div className="flex h-full items-center gap-2 px-2.25">
          <span
            aria-hidden="true"
            className={cn("size-2.5 rounded-full", staffBgClass(staff.color))}
          />
          <span className="truncate text-13 font-bold">{staff.name}</span>
          <span className="truncate text-12 text-muted">
            {agenda.panel.reservasCount({ n: dayCount })}
          </span>
        </div>
      ),
      items: <>{items}</>,
    };
  });

  return (
    <TimeGrid
      ariaLabel={formatLocalDate(date, "weekdayDayMonthLong")}
      startHour={gridRange.startHour}
      endHour={gridRange.endHour}
      headerHeight={44}
      columns={columns}
      initialScrollHour={initialScrollHour}
    />
  );
}
