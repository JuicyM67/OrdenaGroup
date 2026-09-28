"use client";
// Se DESIGN.md §7 "Byggt i WP-12" och docs/tasks/plans/WP-12.md steg 6. Klient: håller
// `vista`, fokusdag, synliga profesionales, vald bokning och lokala statusändringar
// (WP-12 FRÅGA 7). URL:en hålls i synk med `?vista=&fecha=` via `router.replace`
// (ingen historikpost per klick).
import { useMemo, useState, type ReactNode } from "react";
import { useRouter } from "next/navigation";

import type { YearMonth } from "@/components/ui/mini-calendar/grid";
import { SegmentedControl } from "@/components/ui/segmented-control";
import {
  addLocalDays,
  formatTime,
  isoWeekdayOf,
  type LocalDate,
  type TimeZone,
} from "@/lib/format/dates";
import { agenda, calendario } from "@/i18n";

import { AgendaRail } from "./agenda-rail";
import { AgendaShell } from "./agenda-shell";
import { AgendaToolbar } from "./agenda-toolbar";
import {
  focusDate as computeFocusDate,
  localDateOf,
  offsetLabel,
  sectionAria,
  toInstant,
  weekDates,
  weekTitle,
} from "./agenda-view";
import { BlockItem } from "./block-item";
import { DayGrid } from "./day-grid";
import { DayPillRow } from "./day-pill-row";
import { EventBlock } from "./event-block";
import { EventPopover } from "./event-popover";
import {
  eventBox,
  gridHours,
  initialScrollHour as computeInitialScrollHour,
  nowTop,
  showAvatar as isAvatarVisible,
  showTime as isTimeVisible,
} from "./geometry";
import { layoutLanes, mergeCommonBlocks } from "./layout-events";
import { LegendCard } from "./legend-card";
import { MonthCard } from "./month-card";
import { NowLine } from "./now-line";
import { StaffFilter } from "./staff-filter";
import { TimeGrid, type TimeGridColumn } from "./time-grid";
import type { AgendaBooking, AgendaData, StaffId } from "./types";
import { WaitlistSummary } from "./waitlist-summary";

type Vista = "semana" | "dia";

export type AgendaScreenProps = {
  data: AgendaData;
  initialVista?: Vista;
  initialFecha?: LocalDate;
  /** Bara design lab (`?estado=` standard): matchar referensens läge, popovern öppen. */
  initialSelectedBookingId?: string;
  /** Bara design lab: `h-225 w-360` (artboarden), ersätter `h-dvh`. */
  className?: string;
  /**
   * Standard `true` (WP-12 plan §4 steg 5): rullar till "nu − 1 h" om idag syns. Design lab
   * sätter `false` för standardläget, så artboarden matchar referensbilden exakt (ingen
   * rullning) — `npm run visual agenda`.
   */
  autoScrollToNow?: boolean;
};

function monthOf(date: LocalDate): YearMonth {
  return { year: Number(date.slice(0, 4)), month: Number(date.slice(5, 7)) };
}

function prevMonth(m: YearMonth): YearMonth {
  return m.month === 1
    ? { year: m.year - 1, month: 12 }
    : { year: m.year, month: m.month - 1 };
}

function nextMonth(m: YearMonth): YearMonth {
  return m.month === 12
    ? { year: m.year + 1, month: 1 }
    : { year: m.year, month: m.month + 1 };
}

export function AgendaScreen({
  data,
  initialVista,
  initialFecha,
  initialSelectedBookingId,
  className,
  autoScrollToNow = true,
}: AgendaScreenProps) {
  const router = useRouter();
  const tz = data.timezone as TimeZone;
  const now = toInstant(data.now);
  const today = computeFocusDate(now, tz);

  const [vista, setVista] = useState<Vista>(initialVista ?? "semana");
  const [focus, setFocus] = useState<LocalDate>(initialFecha ?? today);
  const [browsedMonth, setBrowsedMonth] = useState<YearMonth>(() =>
    monthOf(initialFecha ?? today),
  );
  const [visibleStaffIds, setVisibleStaffIds] = useState<ReadonlySet<StaffId>>(
    () => new Set(data.staff.map((s) => s.id)),
  );
  const [highlightedStaffId, setHighlightedStaffId] = useState<StaffId | null>(
    data.staff[0]?.id ?? null,
  );
  const [selectedBookingId, setSelectedBookingId] = useState<string | null>(
    initialSelectedBookingId ?? null,
  );
  const [popoverOpen, setPopoverOpen] = useState(
    initialSelectedBookingId != null,
  );
  const [arrivalOverrides, setArrivalOverrides] = useState<
    Record<string, "completed" | "no_show">
  >({});

  function goTo(nextVista: Vista, nextFocus: LocalDate) {
    setVista(nextVista);
    setFocus(nextFocus);
    const params = new URLSearchParams();
    params.set("vista", nextVista);
    params.set("fecha", nextFocus);
    router.replace(`?${params.toString()}`, { scroll: false });
  }

  const week = useMemo(() => weekDates(focus), [focus]);
  const closedDates = useMemo(() => {
    const set = new Set<LocalDate>();
    for (const date of week) {
      const ranges = data.business.hours[isoWeekdayOf(date)];
      if (!ranges || ranges.length === 0) set.add(date);
    }
    return set;
  }, [week, data.business.hours]);
  const gridRange = useMemo(
    () => gridHours(data.business.hours, week),
    [week, data.business.hours],
  );

  const visibleStaff = data.staff.filter((s) => visibleStaffIds.has(s.id));
  const staffById = new Map(data.staff.map((s) => [s.id, s]));

  function bookingWithOverride(booking: AgendaBooking): AgendaBooking {
    const override = arrivalOverrides[booking.id];
    return override ? { ...booking, status: override } : booking;
  }

  function selectBooking(id: string) {
    setSelectedBookingId(id);
    setPopoverOpen(true);
  }

  function renderPopoverIfSelected(
    booking: AgendaBooking,
    trigger: ReactNode,
  ): ReactNode {
    if (booking.id !== selectedBookingId) return trigger;
    const staffName = staffById.get(booking.staffId)?.name ?? "";
    return (
      <EventPopover
        key={`popover-${booking.id}`}
        booking={bookingWithOverride(booking)}
        staffName={staffName}
        tz={tz}
        open={popoverOpen}
        onOpenChange={setPopoverOpen}
        onLlego={() =>
          setArrivalOverrides((prev) => ({
            ...prev,
            [booking.id]: "completed",
          }))
        }
        onNoVino={() =>
          setArrivalOverrides((prev) => ({ ...prev, [booking.id]: "no_show" }))
        }
        onMover={() => setPopoverOpen(false)}
        trigger={trigger}
      />
    );
  }

  const todayVisible =
    autoScrollToNow &&
    (vista === "dia" ? focus === today : week.includes(today));
  const scrollHour = computeInitialScrollHour(
    now,
    gridRange.startHour,
    tz,
    todayVisible,
  );

  // ---------------------------------------------------------------------------
  // Veckovyn: en kolumn per dag, block för alla synliga profesionales i samma kolumn.
  // Bokningar OCH block (sammanslagna eller inte) delar samma lane-beräkning, så ett
  // block som bara gäller några av de synliga profesionales inte ritas i full bredd
  // ovanpå en krockande bokning för en annan profesional (granskningsfynd).
  // ---------------------------------------------------------------------------
  const weekColumns: TimeGridColumn[] = week.map((date) => {
    const dayBookings = data.bookings.filter(
      (b) =>
        localDateOf(b.start, tz) === date && visibleStaffIds.has(b.staffId),
    );
    const dayBlocksRaw = data.blocks
      .filter(
        (b) =>
          localDateOf(b.start, tz) === date && visibleStaffIds.has(b.staffId),
      )
      .map((b) => ({
        staffId: b.staffId,
        start: toInstant(b.start),
        end: toInstant(b.end),
        kind: b.kind,
      }));
    const merged = mergeCommonBlocks(dayBlocksRaw, [...visibleStaffIds]);

    const laneOf = new Map(
      layoutLanes([
        ...dayBookings.map((b) => ({
          id: `b:${b.id}`,
          start: toInstant(b.start),
          end: toInstant(b.end),
        })),
        ...merged.map((m) => ({
          id: `k:${m.key}`,
          start: m.start,
          end: m.end,
        })),
      ]).map((r) => [r.id, r]),
    );

    const items: ReactNode[] = [];
    for (const booking of dayBookings) {
      const start = toInstant(booking.start);
      const end = toInstant(booking.end);
      const box = eventBox(start, end, gridRange.startHour, tz);
      const lane = laneOf.get(`b:${booking.id}`);
      const staff = staffById.get(booking.staffId);
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
        profesional: staff?.name ?? "",
      });
      const trigger = (
        <EventBlock
          key={booking.id}
          variant={variant}
          staffColor={staff?.color ?? 1}
          selected={booking.id === selectedBookingId}
          title={booking.clientName}
          meta={meta}
          showAvatar={isAvatarVisible(box.height)}
          avatarInitials={staff?.initials}
          top={box.top}
          height={box.height}
          flashPct={booking.flashPct}
          lane={
            lane && lane.lanes > 1
              ? { index: lane.lane, lanes: lane.lanes }
              : undefined
          }
          ariaLabel={ariaLabel}
          onClick={() => selectBooking(booking.id)}
        />
      );
      items.push(renderPopoverIfSelected(booking, trigger));
    }
    for (const block of merged) {
      const box = eventBox(block.start, block.end, gridRange.startHour, tz);
      const lane = laneOf.get(`k:${block.key}`);
      items.push(
        <BlockItem
          key={block.key}
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
    if (date === today) {
      const top = nowTop(now, gridRange.startHour, gridRange.endHour, tz);
      if (top != null) items.push(<NowLine key="now" top={top} />);
    }

    return {
      key: date,
      closed: closedDates.has(date),
      items: <>{items}</>,
    };
  });

  const offsetLbl = offsetLabel(focus, tz);

  return (
    <AgendaShell
      className={className}
      rail={
        <AgendaRail
          staff={data.staff}
          highlightedStaffId={highlightedStaffId}
          onSelectStaff={(id) => {
            setHighlightedStaffId(id);
            // Klick på en profesional som just kryssats ur i filtret ska göra hen
            // synlig igen, annars visar dagvyn en tom kolumn (granskningsfynd).
            setVisibleStaffIds((prev) =>
              prev.has(id) ? prev : new Set(prev).add(id),
            );
            goTo("dia", focus);
          }}
        />
      }
      aside={
        <>
          <MonthCard
            month={browsedMonth}
            selected={focus}
            today={today}
            highlightWeekOf={week[0] as LocalDate}
            onSelect={(date) => goTo(vista, date)}
            onPrevMonth={() => setBrowsedMonth(prevMonth)}
            onNextMonth={() => setBrowsedMonth(nextMonth)}
          />
          <StaffFilter
            staff={data.staff}
            visibleStaffIds={visibleStaffIds}
            counts={data.weekCounts}
            onToggle={(id) =>
              setVisibleStaffIds((prev) => {
                if (prev.has(id)) {
                  if (prev.size <= 1) return prev;
                  const next = new Set(prev);
                  next.delete(id);
                  return next;
                }
                return new Set(prev).add(id);
              })
            }
          />
          <LegendCard />
          <WaitlistSummary waitlist={data.waitlist} />
        </>
      }
    >
      <AgendaToolbar
        title={weekTitle(focus)}
        onToday={() => goTo(vista, today)}
        onPrevWeek={() => goTo(vista, addLocalDays(focus, -7))}
        onNextWeek={() => goTo(vista, addLocalDays(focus, 7))}
        onNewBooking={() => {
          /* WP-21: crear reserva manual, sin efecto en WP-12. */
        }}
      />
      <div className="mt-3 flex justify-end">
        <SegmentedControl
          aria-label={agenda.vistaAria}
          value={vista}
          onValueChange={(v) => {
            if (v === "semana" || v === "dia") goTo(v, focus);
          }}
          options={[
            { value: "mes", label: calendario.vista.mes, disabled: true },
            { value: "semana", label: calendario.vista.semana },
            { value: "dia", label: calendario.vista.dia },
          ]}
        />
      </div>
      <DayPillRow
        days={week}
        today={today}
        closedDates={closedDates}
        gmtLabel={offsetLbl}
        vista={vista}
        selectedDate={vista === "dia" ? focus : null}
        onSelectDay={(date) => goTo("dia", date)}
      />
      {vista === "semana" ? (
        <TimeGrid
          ariaLabel={sectionAria(week[0] as LocalDate, week[6] as LocalDate)}
          startHour={gridRange.startHour}
          endHour={gridRange.endHour}
          headerHeight={0}
          columns={weekColumns}
          initialScrollHour={scrollHour}
        />
      ) : (
        <DayGrid
          data={data}
          date={focus}
          tz={tz}
          today={today}
          now={now}
          gridRange={gridRange}
          visibleStaff={visibleStaff}
          highlightedStaffId={highlightedStaffId}
          selectedBookingId={selectedBookingId}
          renderTrigger={renderPopoverIfSelected}
          onSelectBooking={selectBooking}
          initialScrollHour={scrollHour}
        />
      )}
    </AgendaShell>
  );
}
