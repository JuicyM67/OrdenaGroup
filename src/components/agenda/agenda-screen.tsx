"use client";
// Se DESIGN.md §7 "Byggt i WP-12" och docs/tasks/plans/WP-12.md steg 6. Klient: håller
// `vista`, fokusdag, synliga profesionales, vald bokning och lokala statusändringar
// (WP-12 FRÅGA 7). URL:en hålls i synk med `?vista=&fecha=` via `router.replace`
// (ingen historikpost per klick).
import { CalendarDays } from "lucide-react";
import {
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
  type TouchEvent as ReactTouchEvent,
} from "react";
import { useRouter } from "next/navigation";

import { OwnerMobileTabBar } from "@/components/mobile/owner-tab-bar";
import type {
  NotificationBellResult,
  PendingRequestItem,
} from "@/components/shared/notification-bell";
import { IconButton } from "@/components/ui/icon-button";
import type { YearMonth } from "@/components/ui/mini-calendar/grid";
import { SegmentedControl } from "@/components/ui/segmented-control";
import {
  addLocalDays,
  formatLocalDate,
  formatTime,
  isoWeekdayOf,
  toWallClock,
  type LocalDate,
  type LocalTime,
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
import type {
  CustomerExportResult,
  CustomerMutationResult,
} from "./customer-privacy-actions";
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
import type {
  ManualBookingCatalogService,
  ManualBookingSubmit,
} from "./manual-booking-dialog";
import { ManualBookingDialog } from "./manual-booking-dialog";
import { MobileDayNav } from "./mobile-day-nav";
import { MonthCard } from "./month-card";
import { MonthGrid } from "./month-grid";
import {
  monthCountsFromBookings,
  monthTitle,
  summarizeMonthCounts,
  type MonthDaySummary,
} from "./month-view";
import { MoveDialog } from "./move-dialog";
import { NowLine } from "./now-line";
import { StaffFilter } from "./staff-filter";
import { StaffSwitcher } from "./staff-switcher";
import { TimeGrid, type TimeGridColumn } from "./time-grid";
import type {
  AgendaBooking,
  AgendaData,
  MonthDayCounts,
  StaffColor,
  StaffId,
} from "./types";
import { useIsDesktopLayout } from "./use-desktop-layout";
import { WaitlistSummary } from "./waitlist-summary";

/** WP-42: tröskel (px) för att en horisontell svep-gest på mobilens dagvy ska räknas som
 * "byt dag" i stället för vertikal skrollning genom TimeGrid. */
const SWIPE_THRESHOLD_PX = 48;

export type AgendaActionResult = { ok: true } | { ok: false; error: string };

type Vista = "semana" | "dia" | "mes";

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
  /** Standard `true` (design lab). WP-21: `/app/agenda` sätter `false` — flytt finns inte
   * än, se `event-popover.tsx`. */
  showMover?: boolean;
  /** WP-21: sparar Llegó/No vino mot servern (server action, bunden till ägaren och
   * företaget i `page.tsx`). `undefined` i design lab — bara den lokala statusen ändras. */
  onArrival?: (
    bookingId: string,
    status: "completed" | "no_show",
  ) => void | Promise<void>;
  /** WP-21b: tjänster + vilka profesionales som utför dem, för "Nueva reserva"-dialogen.
   * `[]` i design lab (props saknas). */
  catalog?: readonly ManualBookingCatalogService[];
  /** WP-21b: företagets namn, till samtyckesrutans hjälptext. */
  businessName?: string;
  /** WP-21b: sparar en manuell bokning (server action). `undefined` i design lab — knappen
   * "Nueva reserva" är då kvar som no-op (WP-21). */
  onCreateManualBooking?: (
    input: ManualBookingSubmit,
  ) => Promise<AgendaActionResult>;
  /** WP-21b: flyttar en bokning (server action). `undefined` i design lab — "Mover" stänger
   * bara popovern (WP-21, oförändrat beteende). */
  onMoveBooking?: (input: {
    bookingId: string;
    date: LocalDate;
    time: LocalTime;
  }) => Promise<AgendaActionResult>;
  /** WP-26 steg 7 (F12): "Exportar datos"/"Anonimizar cliente" i popovern.
   * `undefined` i design lab — hela raden döljs då (`event-popover.tsx`). */
  onExportCustomer?: (customerId: string) => Promise<CustomerExportResult>;
  onAnonymizeCustomer?: (customerId: string) => Promise<CustomerMutationResult>;
  /** WP-47: `logout` (server action). `undefined` i design lab. */
  onLogout?: () => void | Promise<void>;
  /** WP-50: hämtar antal bokningar per profesional och dag för en hel månad (server
   * action, samma closure-mönster som `onArrival`). `undefined` i design lab — månadsvyn
   * räknar då bara ur `data.bookings` i stället (`monthCountsFromBookings`), vilket bara
   * täcker den vecka som redan är laddad. */
  onLoadMonthCounts?: (month: YearMonth) => Promise<MonthDayCounts>;
  /** WP-45: klockan i den mobila topprraden (`OwnerMobileTopBar`) och
   * Confirmar/Rechazar i agendans popover (väntande bokningar, `requested`).
   * `undefined` i design lab. */
  pendingRequests?: readonly PendingRequestItem[];
  onConfirmRequest?: (bookingId: string) => Promise<NotificationBellResult>;
  onDeclineRequest?: (
    bookingId: string,
    reason?: string,
  ) => Promise<NotificationBellResult>;
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
  showMover = true,
  onArrival,
  catalog = [],
  businessName = "",
  onCreateManualBooking,
  onMoveBooking,
  onExportCustomer,
  onAnonymizeCustomer,
  onLogout,
  onLoadMonthCounts,
  pendingRequests,
  onConfirmRequest,
  onDeclineRequest,
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
  const [manualDialogOpen, setManualDialogOpen] = useState(false);
  const [movingBooking, setMovingBooking] = useState<AgendaBooking | null>(
    null,
  );
  // Sr-only-annonsering (samma mönster som HoyScreen): "Toast" för Mover
  // (agenda.toast.movida) är en aria-live-region, inte en synlig snackbar —
  // det finns ingen synlig toast-komponent i kodbasen än (WP-21b).
  const [announcement, setAnnouncement] = useState<{
    id: number;
    text: string;
  } | null>(null);
  function announce(text: string) {
    setAnnouncement((prev) => ({ id: (prev?.id ?? 0) + 1, text }));
  }

  // WP-42: skrivbordets och mobilens dagnavigering/rubriker är CSS-dolda med varandra
  // (`hidden lg:flex`/`lg:hidden`, billigt och utan hydreringsrisk) — men rutnätet med
  // BOKNINGAR får bara monteras en gång, annars matchar `getByText`/`getByTestId` (Playwright
  // filtrerar inte på synlighet för lokatorupplösning, bara för `.toBeVisible()`) samma
  // bokning två gånger och strict mode-fel, se e2e/owner-live.spec.ts (WP-42-granskning).
  // `useSyncExternalStore` (inte `useEffect`+`setState`, som React varnar för — cascading
  // render) är Reacts egna rekommenderade mönster för att prenumerera på `matchMedia`:
  // `getServerSnapshot` styr både SSR och den allra första klientrendern (ingen
  // hydreringskrock), och synkas mot det riktiga värdet innan webbläsaren målar om.
  const isDesktopLayout = useIsDesktopLayout();

  // WP-42: svep vänster/höger byter dag i mobilens dagvy (touch-koordinater i en ref, inga
  // re-renderingar under själva geste). Ignorerar geste som är mer vertikal än horisontell
  // (TimeGrid behöver sin egen vertikala skroll) och kortare än tröskeln.
  const touchStart = useRef<{ x: number; y: number } | null>(null);
  function handleDayTouchStart(e: ReactTouchEvent) {
    const t = e.touches[0];
    touchStart.current = t ? { x: t.clientX, y: t.clientY } : null;
  }
  function handleDayTouchEnd(e: ReactTouchEvent) {
    const start = touchStart.current;
    touchStart.current = null;
    const t = e.changedTouches[0];
    // WP-50: svepet byter bara dag i dagvyn — i månadsvyn ligger MonthGrid i samma
    // wrapper (touch-lyssnarna sitter kvar där), men en horisontell svep där ska inte
    // hoppa en dag åt gången.
    if (vista !== "dia" || !start || !t) return;
    const dx = t.clientX - start.x;
    const dy = t.clientY - start.y;
    if (Math.abs(dx) < SWIPE_THRESHOLD_PX || Math.abs(dx) < Math.abs(dy) * 2)
      return;
    goTo("dia", addLocalDays(focus, dx < 0 ? 1 : -1));
  }

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

  // WP-50: månadsvyns antal per dag. `onLoadMonthCounts` (server action) hämtar en hel
  // månad; utan den (design lab) räknas bara ur den redan laddade veckans bokningar
  // (`monthCountsFromBookings`), se AgendaScreenProps. Beror bara på props (`data.staff`/
  // `data.bookings`, referensstabila mellan klientinteraktioner) och `browsedMonth`, aldrig
  // på det ominnehållna `staffById` (skulle annars köra om varje rendering).
  // Utan `onLoadMonthCounts` (design lab) finns inget att hämta asynkront — räkna bara ur
  // den redan laddade veckans bokningar direkt (ren härledning, inget `useEffect`/state).
  const [fetchedMonthCounts, setFetchedMonthCounts] =
    useState<MonthDayCounts | null>(null);
  const [monthCountsLoading, setMonthCountsLoading] = useState(false);
  useEffect(() => {
    if (vista !== "mes" || !onLoadMonthCounts) return undefined;
    let cancelled = false;
    // Nästlad async-funktion (inte `await` direkt i effektkroppen): `setMonthCountsLoading`
    // ska bara köras som svar på anropet vi själva startar, inte synkront i varje
    // effekt-körning (react-hooks/set-state-in-effect — kaskaderande omrendering).
    async function run(onLoad: (m: YearMonth) => Promise<MonthDayCounts>) {
      setMonthCountsLoading(true);
      try {
        const counts = await onLoad(browsedMonth);
        if (!cancelled) setFetchedMonthCounts(counts);
      } finally {
        if (!cancelled) setMonthCountsLoading(false);
      }
    }
    void run(onLoadMonthCounts);
    return () => {
      cancelled = true;
    };
  }, [vista, browsedMonth, onLoadMonthCounts]);
  const staffColorById = new Map<StaffId, StaffColor>(
    data.staff.map((s) => [s.id, s.color]),
  );
  const monthCounts = onLoadMonthCounts
    ? fetchedMonthCounts
    : monthCountsFromBookings(data.bookings, browsedMonth, tz);
  const monthSummary: ReadonlyMap<LocalDate, MonthDaySummary> = monthCounts
    ? summarizeMonthCounts(monthCounts, staffColorById)
    : new Map();

  function bookingWithOverride(booking: AgendaBooking): AgendaBooking {
    const override = arrivalOverrides[booking.id];
    return override ? { ...booking, status: override } : booking;
  }

  // WP-42: skrivbordets (vecko-/dagvyn) och mobilens dagvy är BÅDA alltid kvar i DOM:en
  // (bara CSS-dolda med `hidden`/`lg:hidden`, se render nedan — inget useEffect-gate, det
  // skulle riskera ett synligt hopp i `npm run visual agenda` innan hydreringen hunnit
  // klart). Samma bokning kan därför finnas i båda träden samtidigt. `EventPopover` portalar
  // sitt innehåll till `document.body` (Radix) och skulle annars monteras dubbelt — en
  // spökpopover top-left där triggerns `display:none`-förälder ger en 0×0-rect. `surface`
  // låser popovern till den yta som faktiskt gjorde valet.
  type Surface = "desktop" | "mobile";
  const [selectionSurface, setSelectionSurface] = useState<Surface>("desktop");

  function selectBooking(id: string, surface: Surface = "desktop") {
    setSelectedBookingId(id);
    setSelectionSurface(surface);
    setPopoverOpen(true);
  }

  function renderPopoverIfSelected(
    booking: AgendaBooking,
    trigger: ReactNode,
    surface: Surface = "desktop",
  ): ReactNode {
    if (booking.id !== selectedBookingId || surface !== selectionSurface)
      return trigger;
    const staffName = staffById.get(booking.staffId)?.name ?? "";
    return (
      <EventPopover
        key={`popover-${booking.id}`}
        booking={bookingWithOverride(booking)}
        staffName={staffName}
        tz={tz}
        open={popoverOpen}
        onOpenChange={setPopoverOpen}
        onLlego={() => {
          setArrivalOverrides((prev) => ({
            ...prev,
            [booking.id]: "completed",
          }));
          void Promise.resolve(onArrival?.(booking.id, "completed")).catch(
            () => undefined,
          );
        }}
        onNoVino={() => {
          setArrivalOverrides((prev) => ({ ...prev, [booking.id]: "no_show" }));
          void Promise.resolve(onArrival?.(booking.id, "no_show")).catch(
            () => undefined,
          );
        }}
        onMover={
          showMover
            ? () => {
                setPopoverOpen(false);
                if (onMoveBooking) setMovingBooking(booking);
              }
            : undefined
        }
        onExportCustomer={onExportCustomer}
        onAnonymizeCustomer={
          onAnonymizeCustomer
            ? async (customerId) => {
                const result = await onAnonymizeCustomer(customerId);
                if (result.ok) router.refresh();
                return result;
              }
            : undefined
        }
        onConfirmRequest={
          onConfirmRequest
            ? async (bookingId) => {
                const result = await onConfirmRequest(bookingId);
                if (result.ok) router.refresh();
                return result;
              }
            : undefined
        }
        onDeclineRequest={
          onDeclineRequest
            ? async (bookingId, reason) => {
                const result = await onDeclineRequest(bookingId, reason);
                if (result.ok) router.refresh();
                return result;
              }
            : undefined
        }
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
          pending={booking.status === "requested"}
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
    <>
      <AgendaShell
        className={className}
        mobileTabBar={
          <OwnerMobileTabBar active="agenda" className="lg:hidden" />
        }
        onLogout={onLogout}
        pendingRequests={pendingRequests}
        onConfirmRequest={onConfirmRequest}
        onDeclineRequest={onDeclineRequest}
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
            onNewBooking={
              onCreateManualBooking
                ? () => setManualDialogOpen(true)
                : undefined
            }
            onLogout={onLogout}
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
        {/* Skrivbordet (≥ lg): vecko-/dagvyn, oförändrad (npm run visual agenda/agenda-dia).
            WP-50: månadsvyn (härledd, ingen ritad referens) delar samma ram. */}
        <div className="hidden lg:flex lg:min-h-0 lg:flex-1 lg:flex-col">
          <AgendaToolbar
            title={
              vista === "mes" ? monthTitle(browsedMonth) : weekTitle(focus)
            }
            prevLabel={vista === "mes" ? calendario.mesAnterior : undefined}
            nextLabel={vista === "mes" ? calendario.mesSiguiente : undefined}
            onToday={() => {
              if (vista === "mes") setBrowsedMonth(monthOf(today));
              else goTo(vista, today);
            }}
            onPrevWeek={() => {
              if (vista === "mes") setBrowsedMonth(prevMonth);
              else goTo(vista, addLocalDays(focus, -7));
            }}
            onNextWeek={() => {
              if (vista === "mes") setBrowsedMonth(nextMonth);
              else goTo(vista, addLocalDays(focus, 7));
            }}
            onNewBooking={() => {
              if (onCreateManualBooking) setManualDialogOpen(true);
            }}
          />
          <div className="mt-3 flex justify-end">
            <SegmentedControl
              aria-label={agenda.vistaAria}
              value={vista}
              onValueChange={(v) => {
                if (v === "semana" || v === "dia" || v === "mes")
                  goTo(v, focus);
              }}
              options={[
                { value: "mes", label: calendario.vista.mes },
                { value: "semana", label: calendario.vista.semana },
                { value: "dia", label: calendario.vista.dia },
              ]}
            />
          </div>
          {vista !== "mes" ? (
            <DayPillRow
              days={week}
              today={today}
              closedDates={closedDates}
              gmtLabel={offsetLbl}
              vista={vista}
              selectedDate={vista === "dia" ? focus : null}
              onSelectDay={(date) => goTo("dia", date)}
            />
          ) : null}
          {isDesktopLayout ? (
            vista === "mes" ? (
              <MonthGrid
                month={browsedMonth}
                today={today}
                hours={data.business.hours}
                counts={monthSummary}
                loading={monthCountsLoading}
                onSelectDay={(date) => goTo("dia", date)}
              />
            ) : vista === "semana" ? (
              <TimeGrid
                ariaLabel={sectionAria(
                  week[0] as LocalDate,
                  week[6] as LocalDate,
                )}
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
                renderTrigger={(b, t) =>
                  renderPopoverIfSelected(b, t, "desktop")
                }
                onSelectBooking={(id) => selectBooking(id, "desktop")}
                initialScrollHour={scrollHour}
              />
            )
          ) : null}
        </div>

        {/* Mobil (< lg): dagvy som standard, en profesional åt gången (WP-42 — härledd,
            ingen ritad referens). Ingen veckovy på mobil, men WP-50 lägger till en
            Día/Mes-växlare (egen rad — mobilen har ingen SegmentedControl, och en sjätte
            knapp i MobileDayNav trängde undan månadstiteln, granskningsfynd). */}
        <div className="flex min-h-0 flex-1 flex-col gap-3 lg:hidden">
          <div className="flex justify-end">
            <IconButton
              label={
                vista === "mes" ? agenda.mes.verDiaAria : agenda.mes.verMesAria
              }
              aria-pressed={vista === "mes"}
              tone={vista === "mes" ? "ink" : "ghost"}
              size={44}
              onClick={() => goTo(vista === "mes" ? "dia" : "mes", focus)}
            >
              <CalendarDays
                aria-hidden="true"
                className="size-5"
                strokeWidth={2}
              />
            </IconButton>
          </div>
          <MobileDayNav
            title={
              vista === "mes"
                ? monthTitle(browsedMonth)
                : formatLocalDate(focus, "weekdayDayMonthShort")
            }
            prevLabel={vista === "mes" ? calendario.mesAnterior : undefined}
            nextLabel={vista === "mes" ? calendario.mesSiguiente : undefined}
            onToday={() => {
              if (vista === "mes") setBrowsedMonth(monthOf(today));
              else goTo("dia", today);
            }}
            onPrevDay={() => {
              if (vista === "mes") setBrowsedMonth(prevMonth);
              else goTo("dia", addLocalDays(focus, -1));
            }}
            onNextDay={() => {
              if (vista === "mes") setBrowsedMonth(nextMonth);
              else goTo("dia", addLocalDays(focus, 1));
            }}
            onNewBooking={() => {
              if (onCreateManualBooking) setManualDialogOpen(true);
            }}
          />
          {data.staff.length > 1 && vista !== "mes" ? (
            <StaffSwitcher
              staff={data.staff}
              selectedId={highlightedStaffId}
              onSelect={setHighlightedStaffId}
            />
          ) : null}
          <div
            className="flex min-h-0 flex-1 flex-col"
            onTouchStart={handleDayTouchStart}
            onTouchEnd={handleDayTouchEnd}
          >
            {!isDesktopLayout ? (
              vista === "mes" ? (
                <MonthGrid
                  month={browsedMonth}
                  today={today}
                  hours={data.business.hours}
                  counts={monthSummary}
                  loading={monthCountsLoading}
                  onSelectDay={(date) => goTo("dia", date)}
                  className="mt-0"
                />
              ) : (
                <DayGrid
                  data={data}
                  date={focus}
                  tz={tz}
                  today={today}
                  now={now}
                  gridRange={gridRange}
                  visibleStaff={data.staff.filter(
                    (s) => s.id === highlightedStaffId,
                  )}
                  highlightedStaffId={highlightedStaffId}
                  selectedBookingId={selectedBookingId}
                  renderTrigger={(b, t) =>
                    renderPopoverIfSelected(b, t, "mobile")
                  }
                  onSelectBooking={(id) => selectBooking(id, "mobile")}
                  initialScrollHour={scrollHour}
                />
              )
            ) : null}
          </div>
        </div>
      </AgendaShell>

      {onCreateManualBooking ? (
        <ManualBookingDialog
          open={manualDialogOpen}
          onOpenChange={setManualDialogOpen}
          services={catalog}
          staff={data.staff}
          businessName={businessName}
          defaultDate={focus}
          onSubmit={async (input) => {
            const result = await onCreateManualBooking(input);
            if (result.ok) router.refresh();
            return result;
          }}
        />
      ) : null}

      {onMoveBooking && movingBooking ? (
        <MoveDialog
          key={movingBooking.id}
          open={movingBooking != null}
          onOpenChange={(open) => {
            if (!open) setMovingBooking(null);
          }}
          bookingId={movingBooking.id}
          defaultDate={toWallClock(toInstant(movingBooking.start), tz).date}
          defaultTime={toWallClock(toInstant(movingBooking.start), tz).time}
          onSubmit={async (input) => {
            const result = await onMoveBooking(input);
            if (result.ok) {
              announce(agenda.toast.movida);
              setMovingBooking(null);
              router.refresh();
            }
            return result;
          }}
        />
      ) : null}

      <div role="status" className="sr-only">
        {announcement ? (
          <span key={announcement.id}>{announcement.text}</span>
        ) : null}
      </div>
    </>
  );
}
