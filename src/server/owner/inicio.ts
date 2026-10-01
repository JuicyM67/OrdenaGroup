import "server-only";

import type { AvatarProps } from "@/components/ui/avatar";
import type {
  BookingStatus,
  InicioData,
  TodayBooking,
} from "@/components/dashboard/types";
import { flash } from "@/i18n";
import {
  addLocalDays,
  isoWeekdayOf,
  localDayRange,
  startOfLocalWeek,
  toLocalDate,
  APP_TZ,
  type LocalDate,
} from "@/lib/format/dates";
import { countInactiveCustomersIn } from "@/server/campaigns/audience";
import { hasPerm, loadMember, type Member } from "@/server/db/permissions";
import type { Queryable } from "@/server/db/pool";
import { withOwnerTx } from "@/server/db/tx";
import { listFlashSlots } from "@/server/flash";
import { listWaitlist } from "@/server/waitlist";

import { memberView, type MemberView } from "./member";
import { listPendingRequestsIn } from "./requests";
import { isoOf } from "./shared";

type BusinessRow = {
  name: string;
  comuna: string;
  winback_days: number | null;
};
type BookingRow = {
  id: string;
  client_name: string | null;
  service_name: string;
  staff_name: string;
  staff_color: string;
  status: BookingStatus;
  confirmed_by_customer_at: string | null;
  deposit_clp: number;
  start_ms: number;
  end_ms: number;
};

const DAY_MS = 24 * 60 * 60 * 1000;

/** [måndag 00:00, nästa måndag 00:00) för veckan som innehåller `today`. */
function weekRangeOf(today: LocalDate): { start: Date; end: Date } {
  const monday = startOfLocalWeek(today);
  const nextMonday = addLocalDays(monday, 7);
  return {
    start: localDayRange(monday, APP_TZ).start,
    end: localDayRange(nextMonday, APP_TZ).start,
  };
}

/** [första i månaden, första i nästa månad) för månaden som innehåller `today`. */
function monthRangeOf(today: LocalDate): { start: Date; end: Date } {
  const y = Number(today.slice(0, 4));
  const m = Number(today.slice(5, 7));
  const first =
    `${String(y).padStart(4, "0")}-${String(m).padStart(2, "0")}-01` as LocalDate;
  const nextY = m === 12 ? y + 1 : y;
  const nextM = m === 12 ? 1 : m + 1;
  const firstNext =
    `${String(nextY).padStart(4, "0")}-${String(nextM).padStart(2, "0")}-01` as LocalDate;
  return {
    start: localDayRange(first, APP_TZ).start,
    end: localDayRange(firstNext, APP_TZ).start,
  };
}

type RevenueRow = { price_clp: number; discount_clp: number; start_ms: number };

/** Reservas som räknas som intäkt (samma regel som `upcoming`: aldrig avbokade/uteblivna). */
async function loadWeekRevenue(
  q: Queryable,
  businessId: string,
  today: LocalDate,
): Promise<{ revenueWeekClp: number; revenueSeries: number[] }> {
  const { start, end } = weekRangeOf(today);
  const res = await q.query<RevenueRow>(
    `select bk.price_clp, bk.discount_clp,
            extract(epoch from lower(bk.period)) * 1000 as start_ms
       from public.bookings bk
      where bk.business_id = $1
        and bk.status not in ('cancelled', 'no_show')
        and bk.period && tstzrange($2, $3, '[)')`,
    [businessId, start, end],
  );
  const revenueSeries = [0, 0, 0, 0, 0, 0, 0];
  let revenueWeekClp = 0;
  for (const row of res.rows) {
    const amount = row.price_clp - row.discount_clp;
    revenueWeekClp += amount;
    const date = toLocalDate(new Date(Math.round(row.start_ms)), APP_TZ);
    const dayIndex = isoWeekdayOf(date) - 1; // 0 = måndag … 6 = söndag
    revenueSeries[dayIndex] = (revenueSeries[dayIndex] ?? 0) + amount;
  }
  return { revenueWeekClp, revenueSeries };
}

type NoShowRow = { status: "completed" | "no_show"; start_ms: number };

function noShowPercent(rows: readonly NoShowRow[]): number {
  const noShow = rows.filter((r) => r.status === "no_show").length;
  return rows.length === 0 ? 0 : (noShow / rows.length) * 100;
}

/**
 * Inasistencias (no-show) senaste 30 dagarna + trend mot de föregående 30 (WP-47). "down" =
 * färre uteblivanden än föregående period (StatTile: down = success, se stat-tile.tsx).
 * Jämförelsen görs på avrundade procenttal (samma som visas, `formatPercent`) så att
 * trendpilen aldrig pekar när den synliga siffran är oförändrad. Ungefärliga 30-dagars-
 * fönster (ren ms-aritmetik, inte dag-för-dag i `APP_TZ`): en no-show-trend tål timmens
 * skillnad kring sommartidsbyten, till skillnad från pengar/tid i övrigt.
 */
async function loadNoShowStats(
  q: Queryable,
  businessId: string,
  now: Date,
): Promise<{
  noShowPct: number;
  noShowTrend: InicioData["stats"]["noShowTrend"];
}> {
  const from60 = new Date(now.getTime() - 60 * DAY_MS);
  const res = await q.query<NoShowRow>(
    `select bk.status::text as status,
            extract(epoch from lower(bk.period)) * 1000 as start_ms
       from public.bookings bk
      where bk.business_id = $1
        and bk.status in ('completed', 'no_show')
        and lower(bk.period) >= $2
        and lower(bk.period) < $3`,
    [businessId, from60, now],
  );
  const from30Ms = now.getTime() - 30 * DAY_MS;
  const current = res.rows.filter((r) => r.start_ms >= from30Ms);
  const previous = res.rows.filter((r) => r.start_ms < from30Ms);
  const currentPct = noShowPercent(current);
  const previousPct = noShowPercent(previous);
  const currentRounded = Math.round(currentPct);
  const previousRounded = Math.round(previousPct);
  const noShowTrend: InicioData["stats"]["noShowTrend"] =
    currentRounded < previousRounded
      ? "down"
      : currentRounded > previousRounded
        ? "up"
        : "flat";
  return { noShowPct: currentPct, noShowTrend };
}

/** Dagar med minst en bokning (inte avbokad) i månaden som innehåller `today` — prickarna i
 * CalendarCard (WP-47). Grupperas i JS (samma mönster som resten av `src/server/owner/**`
 * — ingen `at time zone` i SQL, `toLocalDate` är den enda platsen som känner till `APP_TZ`). */
async function loadMarkedDates(
  q: Queryable,
  businessId: string,
  today: LocalDate,
): Promise<LocalDate[]> {
  const { start, end } = monthRangeOf(today);
  const res = await q.query<{ start_ms: number }>(
    `select extract(epoch from lower(bk.period)) * 1000 as start_ms
       from public.bookings bk
      where bk.business_id = $1
        and bk.status <> 'cancelled'
        and bk.period && tstzrange($2, $3, '[)')`,
    [businessId, start, end],
  );
  const dates = new Set<LocalDate>();
  for (const row of res.rows) {
    dates.add(toLocalDate(new Date(Math.round(row.start_ms)), APP_TZ));
  }
  return [...dates].sort();
}

/**
 * Inicios data (WP-21, statistiken i WP-47, winback i WP-31). "Agenda de
 * hoy"/"Reservas hoy" (stats.bookingsToday/toConfirm),
 * stats.revenueWeekClp/revenueSeries (veckans intäkt, exkl. avbokade/
 * uteblivna), stats.noShowPct/noShowTrend (uteblivanden senaste 30 dagarna
 * mot föregående 30), calendar.markedDates (dagar med bokningar i den
 * visade månaden) och features.winback.count (antal inaktiva kunder med
 * samtycke, `businesses.winback_days` eller 60 om avstängd — se
 * `countInactiveCustomersIn`) är riktig data. WP-23/WP-30:
 * `features.waitlist`/`features.flash`/`activeFlash` är nu också riktig
 * data (`src/server/owner/waitlist.ts`/`flash.ts`). `week.recoveredHours`
 * (F16, WP-33) är fortfarande utanför scope — alltid 0, aldrig påhittad text.
 */
export async function loadOwnerInicio(
  userId: string,
  businessId: string,
  today: LocalDate,
  now: Date,
  owner: { name: string; firstName: string },
): Promise<InicioData & { member: MemberView }> {
  // WP-23/WP-30: `listWaitlist`/`listFlashSlots` (scheduling-engineer,
  // `src/server/waitlist`/`src/server/flash`) öppnar var sin egen
  // `withOwnerTx` — körs därför INTE inne i blocket nedan (en nästlad
  // transaktion i samma anrop vore onödig komplexitet för en ren läsning).
  const [waitlistItems, flashItems] = await Promise.all([
    listWaitlist(userId, businessId, today, now),
    listFlashSlots(userId, businessId, now),
  ]);
  const activeFlashSlots = flashItems.filter((f) => f.status === "active");
  const bookedFlashSlots = flashItems.filter((f) => f.status === "booked");
  // Flash-tiderna är redan sorterade på starts_at (listFlashSlots) — den
  // första aktiva är den som visas i Inicios FlashCard.
  const soonest = activeFlashSlots[0];

  return withOwnerTx(userId, async (q) => {
    const member = await loadMember(q, userId, businessId);
    const data = await loadOwnerInicioIn(
      q,
      businessId,
      today,
      now,
      owner,
      member,
    );
    const activeFlashCard = soonest
      ? {
          start: soonest.start,
          discountPct: soonest.discountPct,
          service: await flashServiceLabel(q, businessId, soonest.serviceIds),
          staff: soonest.staffName,
        }
      : null;
    return {
      ...data,
      features: {
        ...data.features,
        waitlist: { ...data.features.waitlist, count: waitlistItems.length },
        flash: {
          active: activeFlashSlots.length,
          booked: bookedFlashSlots.length,
          progress: data.features.flash.progress,
        },
      },
      activeFlash: activeFlashCard,
      member: memberView(member),
      // WP-57: `flash` kräver listorna ovan (öppnar sin egen transaktion, se
      // kommentaren i funktionshuvudet) — kan inte räknas i `loadOwnerInicioIn`.
      gettingStarted: data.gettingStarted
        ? {
            ...data.gettingStarted,
            flash: activeFlashSlots.length > 0 || bookedFlashSlots.length > 0,
          }
        : undefined,
    };
  });
}

type CountRow = { n: string };

/** `select count(*)` som ett tal — Postgres `count()` kommer tillbaka som `text` via `pg`. */
async function countIn(
  q: Queryable,
  sql: string,
  params: readonly unknown[],
): Promise<number> {
  const res = await q.query<CountRow>(sql, params);
  return Number(res.rows[0]?.n ?? "0");
}

/**
 * WP-57 (punkt 4): fem steg härledda ur befintlig data för "Kom igång"-kortet —
 * tjänster/öppettider/profil/första Blixttid/bjud in teamet. `flash` sätts separat i
 * `loadOwnerInicio` (ovan): den här funktionen körs i `loadOwnerInicioIn`s transaktion, som
 * inte har tillgång till `listFlashSlots` (egen transaktion, scheduling-engineer).
 */
async function loadGettingStarted(
  q: Queryable,
  businessId: string,
): Promise<InicioData["gettingStarted"]> {
  const [services, hours, team, profileRes] = await Promise.all([
    countIn(
      q,
      `select count(*)::text as n from public.services where business_id = $1`,
      [businessId],
    ),
    countIn(
      q,
      `select count(*)::text as n from public.business_hours where business_id = $1`,
      [businessId],
    ),
    countIn(
      q,
      `select count(*)::text as n from public.memberships where business_id = $1 and role = 'staff'`,
      [businessId],
    ),
    q.query<{ logo_url: string | null }>(
      `select logo_url from public.businesses where id = $1`,
      [businessId],
    ),
  ]);
  return {
    services: services > 0,
    hours: hours > 0,
    profile: (profileRes.rows[0]?.logo_url ?? null) != null,
    // Patchas i `loadOwnerInicio` (egen transaktion för flash-listan) — `false` här är bara
    // startläget.
    flash: false,
    team: team > 0,
  };
}

/** "Corte de pelo" (en tjänst) eller `flash.todosLosServicios` (`null` =
 * alla) — FlashCard visar bara EN rad, ingen uppräkning av flera tjänster. */
async function flashServiceLabel(
  q: Queryable,
  businessId: string,
  serviceIds: readonly string[] | null,
): Promise<string> {
  if (serviceIds === null || serviceIds.length === 0) {
    return flash.todosLosServicios;
  }
  const res = await q.query<{ name: string }>(
    `select name from public.services where business_id = $1 and id = $2`,
    [businessId, serviceIds[0]],
  );
  return res.rows[0]?.name ?? "";
}

/** Inre steg (för tester): kör i anroparens transaktion. `member`
 * utelämnad = ingen behörighetsfiltrering (tester). WP-46: statistiken
 * (intäkter och inasistencias) kräver `can_view_reports` — annars nollor,
 * aldrig en fråga mot siffrorna; förfrågningarna filtreras till dem
 * medlemmen får hantera. */
export async function loadOwnerInicioIn(
  q: Queryable,
  businessId: string,
  today: LocalDate,
  now: Date,
  owner: { name: string; firstName: string },
  member?: Member | null,
): Promise<InicioData> {
  const showReports =
    member === undefined || hasPerm(member, "can_view_reports");
  const bizRes = await q.query<BusinessRow>(
    `select name, comuna, winback_days from public.businesses where id = $1`,
    [businessId],
  );
  const biz = bizRes.rows[0] ?? { name: "", comuna: "", winback_days: null };

  const { start, end } = localDayRange(today, APP_TZ);
  const bookingsRes = await q.query<BookingRow>(
    `select bk.id, c.name as client_name,
            sv.name as service_name, st.name as staff_name, st.color as staff_color,
            bk.status::text as status, bk.confirmed_by_customer_at, bk.deposit_clp,
            extract(epoch from lower(bk.period)) * 1000 as start_ms,
            extract(epoch from upper(bk.period)) * 1000 as end_ms
       from public.bookings bk
       join public.customers c
         on c.business_id = bk.business_id and c.id = bk.customer_id
       join public.services sv
         on sv.business_id = bk.business_id and sv.id = bk.service_id
       join public.staff st
         on st.business_id = bk.business_id and st.id = bk.staff_id
      where bk.business_id = $1
        and bk.status <> 'cancelled'
        and bk.period && tstzrange($2, $3, '[)')
      order by lower(bk.period)`,
    [businessId, start, end],
  );

  // WP-fixar-sv: "Kommande bokningar" på Inicio — inte begränsat till innevarande vecka
  // (Agendan visar bara en vecka i taget, så en bokning nästa vecka annars inte syns
  // förrän ägaren själv bläddrar dit). Från och med `now` (inkl. resten av idag),
  // max 10 rader.
  const upcomingRes = await q.query<BookingRow>(
    `select bk.id, c.name as client_name,
            sv.name as service_name, st.name as staff_name, st.color as staff_color,
            bk.status::text as status, bk.confirmed_by_customer_at, bk.deposit_clp,
            extract(epoch from lower(bk.period)) * 1000 as start_ms,
            extract(epoch from upper(bk.period)) * 1000 as end_ms
       from public.bookings bk
       join public.customers c
         on c.business_id = bk.business_id and c.id = bk.customer_id
       join public.services sv
         on sv.business_id = bk.business_id and sv.id = bk.service_id
       join public.staff st
         on st.business_id = bk.business_id and st.id = bk.staff_id
      where bk.business_id = $1
        and bk.status not in ('cancelled', 'no_show')
        and lower(bk.period) >= $2
      order by lower(bk.period)
      limit 10`,
    [businessId, now.toISOString()],
  );

  const toRow = (b: BookingRow): TodayBooking => ({
    id: b.id,
    start: isoOf(b.start_ms),
    end: isoOf(b.end_ms),
    clientName: b.client_name ?? "",
    service: b.service_name,
    staff: b.staff_name,
    // `staff.color` (t.ex. 'staff-2') är redan en giltig Avatar-ton (ui/avatar.tsx).
    tint: b.staff_color as NonNullable<AvatarProps["tone"]>,
    status: b.status,
    depositPaid: b.deposit_clp > 0,
    confirmedByCustomer: b.confirmed_by_customer_at != null,
  });

  const today_: TodayBooking[] = bookingsRes.rows.map(toRow);
  const upcoming: TodayBooking[] = upcomingRes.rows.map(toRow);
  const toConfirm = today_.filter(
    (b) =>
      !b.confirmedByCustomer &&
      (b.status === "confirmed" || b.status === "pending_payment"),
  ).length;

  // WP-47: ingresosSemana/inasistencias (F# stats) och kalenderns markerade dagar — tidigare
  // alltid nollor/tom lista (se filkommentaren ovan, nu bara giltigt för de funktioner som
  // faktiskt saknar backend: väntelista/hora flash/te echamos de menos). Sekventiellt (inte
  // `Promise.all`): samma `q` (en transaktion) som resten av filen, samma mönster som
  // `bookingsRes`/`upcomingRes` ovan.
  const { revenueWeekClp, revenueSeries } = showReports
    ? await loadWeekRevenue(q, businessId, today)
    : { revenueWeekClp: 0, revenueSeries: [0, 0, 0, 0, 0, 0, 0] };
  const { noShowPct, noShowTrend } = showReports
    ? await loadNoShowStats(q, businessId, now)
    : { noShowPct: 0, noShowTrend: "flat" as const };
  const markedDates = await loadMarkedDates(q, businessId, today);
  const pendingRequests = await listPendingRequestsIn(
    q,
    businessId,
    now,
    member,
  );

  // WP-31: samma behörighet som "Nuevo envío" (`can_manage_all_bookings`,
  // owner kortsluter redan till true via `hasPerm`) — annars 0, ingen fråga
  // mot kundtabellen för den som inte får skicka utskick ändå.
  const canManageCampaigns =
    member === undefined || hasPerm(member, "can_manage_all_bookings");
  const winbackCount = canManageCampaigns
    ? await countInactiveCustomersIn(q, businessId, biz.winback_days ?? 60)
    : 0;

  // WP-57 (punkt 4): "Kom igång"-kortet är en konfigurationsgenväg — bara meningsfull för
  // den som får ändra inställningar (`can_edit_settings`, ägaren kortsluter redan till true).
  const canEditSettings =
    member === undefined || hasPerm(member, "can_edit_settings");
  const gettingStarted = canEditSettings
    ? await loadGettingStarted(q, businessId)
    : undefined;

  return {
    now: now.toISOString(),
    business: { name: biz.name, comuna: biz.comuna },
    owner,
    notifications: { items: pendingRequests },
    week: { recoveredHours: 0, recoveredClp: 0 },
    // WP-23/WP-30: `loadOwnerInicio` (ovan) fyller i riktiga tal för
    // waitlist/flash efteråt — `listWaitlist`/`listFlashSlots`
    // (scheduling-engineer) öppnar var sin egen transaktion och kan därför
    // inte anropas härifrån (`loadOwnerInicioIn` körs i anroparens, se
    // filkommentaren). Nollor här är bara startläget innan den patchningen.
    features: {
      waitlist: { count: 0, day: today, progress: 0 },
      flash: { active: 0, booked: 0, progress: 0 },
      winback: { count: winbackCount },
    },
    stats: {
      bookingsToday: today_.length,
      toConfirm,
      revenueWeekClp,
      revenueSeries,
      noShowPct,
      noShowTrend,
    },
    today: today_,
    upcoming,
    calendar: {
      month: {
        year: Number(today.slice(0, 4)),
        month: Number(today.slice(5, 7)),
      },
      markedDates,
    },
    activeFlash: null,
    gettingStarted,
  };
}
