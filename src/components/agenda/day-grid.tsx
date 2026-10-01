// Se DESIGN.md §7 "Byggt i WP-12" — härledd, ingen referens (WP-12 steg 7/FRÅGA 2).
// `time-grid.tsx` med en kolumn per synlig profesional i stället för en kolumn per dag.
import type { ReactNode } from "react";

import { cn } from "@/components/ui/cn";
import {
  formatLocalDate,
  formatTime,
  isoWeekdayOf,
  type LocalDate,
  type LocalTime,
  type TimeZone,
} from "@/lib/format/dates";
import { agenda } from "@/i18n";

import { localDateOf, staffBgClass, toInstant } from "./agenda-view";
import { BlockItem } from "./block-item";
import { EventBlock } from "./event-block";
import {
  DAY_HEADER_PX,
  eventBox,
  HOUR_PX,
  nowTop,
  showTime as isTimeVisible,
  TOP_PX,
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
  /** WP-30: klick på en aktiv (ännu inte bokad) blixttid — går till /app/flash.
   * `undefined` döljer inget (blocket visas ändå), det blir bara ett no-op. */
  onSelectFlashSlot?: (id: string) => void;
  /** WP-30: klick på ett tomt fält i rutnätet — öppnar tomrutsmenyn ("Nueva
   * reserva"/"Hora flash") i `agenda-screen.tsx`. `undefined` (design lab) gör
   * ingenting vid klick. */
  onEmptyClick?: (input: {
    staffId: StaffId;
    time: LocalTime;
    clientX: number;
    clientY: number;
  }) => void;
};

/** `eventBox()` baklänges: en klickad `offsetY` (samma TOP_PX-baserade
 * koordinatsystem) → klockslag, avrundat till närmaste kvart. */
function timeFromOffsetY(offsetY: number, gridStartHour: number): LocalTime {
  const hourDecimal = gridStartHour + (offsetY - TOP_PX) / HOUR_PX;
  const totalMinutes = Math.max(0, Math.round((hourDecimal * 60) / 15) * 15);
  const hh = Math.floor(totalMinutes / 60) % 24;
  const mm = totalMinutes % 60;
  return `${String(hh).padStart(2, "0")}:${String(mm).padStart(2, "0")}` as LocalTime;
}

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
  onSelectFlashSlot,
  onEmptyClick,
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
      (b) => b.staffId === staff.id && localDateOf(b.start, tz) === date,
    );
    const staffBlocks = data.blocks.filter(
      (b) => b.staffId === staff.id && localDateOf(b.start, tz) === date,
    );
    const laneOf = new Map(
      layoutLanes([
        ...staffBookings.map((b) => ({
          id: `b:${b.id}`,
          start: toInstant(b.start),
          end: toInstant(b.end),
        })),
        ...staffBlocks.map((b) => ({
          id: `k:${b.staffId}:${b.start}`,
          start: toInstant(b.start),
          end: toInstant(b.end),
        })),
      ]).map((r) => [r.id, r]),
    );

    const items: ReactNode[] = [];
    for (const booking of staffBookings) {
      const start = toInstant(booking.start);
      const end = toInstant(booking.end);
      const box = eventBox(start, end, gridRange.startHour, tz);
      const lane = laneOf.get(`b:${booking.id}`);
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
          pending={booking.status === "requested"}
          cancelPending={booking.status === "cancel_requested"}
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
      const lane = laneOf.get(`k:${block.staffId}:${block.start}`);
      items.push(
        <BlockItem
          key={`${staff.id}-${block.start}`}
          kind={block.kind}
          top={box.top}
          height={box.height}
          lane={
            lane && lane.lanes > 1
              ? { index: lane.lane, lanes: lane.lanes }
              : undefined
          }
        />,
      );
    }
    // WP-30: aktiva blixttider (ännu inte bokade) för den här profesionalen/dagen —
    // samma `EventBlock`-variant som en bokad flash-bokning, men klickar till
    // /app/flash i stället för att öppna en popover (det finns ingen bokning att visa).
    for (const flash of data.flashSlots.filter(
      (f) => f.staffId === staff.id && localDateOf(f.start, tz) === date,
    )) {
      const start = toInstant(flash.start);
      const end = toInstant(flash.end);
      const box = eventBox(start, end, gridRange.startHour, tz);
      items.push(
        <EventBlock
          key={`flash-${flash.id}`}
          variant="flash"
          staffColor={staff.color}
          title={agenda.panel.horasFlash}
          meta={isTimeVisible(box.height) ? formatTime(start, tz) : null}
          showAvatar={false}
          top={box.top}
          height={box.height}
          flashPct={flash.discountPct}
          ariaLabel={agenda.panel.horaFlashDisponibleAria({
            hora: formatTime(start, tz),
            porcentaje: flash.discountPct,
          })}
          onClick={() => onSelectFlashSlot?.(flash.id)}
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
      closed: false,
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
      headerHeight={DAY_HEADER_PX}
      columns={columns}
      allColumnsClosed={isClosed}
      initialScrollHour={initialScrollHour}
      onBackgroundClick={
        onEmptyClick
          ? (staffId, offsetY, clientX, clientY) =>
              onEmptyClick({
                staffId,
                time: timeFromOffsetY(offsetY, gridRange.startHour),
                clientX,
                clientY,
              })
          : undefined
      }
    />
  );
}
