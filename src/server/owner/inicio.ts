import "server-only";

import type { AvatarProps } from "@/components/ui/avatar";
import type {
  BookingStatus,
  InicioData,
  TodayBooking,
} from "@/components/dashboard/types";
import { localDayRange, APP_TZ, type LocalDate } from "@/lib/format/dates";
import type { Queryable } from "@/server/db/pool";
import { withOwnerTx } from "@/server/db/tx";

import { isoOf } from "./shared";

type BusinessRow = { name: string; comuna: string };
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

/**
 * Inicios data (WP-21). Bara "Agenda de hoy" och "Reservas hoy" (stats.
 * bookingsToday/toConfirm) är riktig data — resten (recoveredHours,
 * väntelista, hora flash, te echamos de menos, ingresosSemana/inasistencias,
 * kalenderns markerade dagar) kräver historik eller funktioner utanför
 * WP-21 (väntelista F8, hora flash fas 2, D-005) och visas i sina befintliga
 * tomlägen (nollor/tom lista/`activeFlash: null`), aldrig med påhittad text.
 */
export async function loadOwnerInicio(
  userId: string,
  businessId: string,
  today: LocalDate,
  now: Date,
  owner: { name: string; firstName: string },
): Promise<InicioData> {
  return withOwnerTx(userId, (q) =>
    loadOwnerInicioIn(q, businessId, today, now, owner),
  );
}

/** Inre steg (för tester): kör i anroparens transaktion. */
export async function loadOwnerInicioIn(
  q: Queryable,
  businessId: string,
  today: LocalDate,
  now: Date,
  owner: { name: string; firstName: string },
): Promise<InicioData> {
  const bizRes = await q.query<BusinessRow>(
    `select name, comuna from public.businesses where id = $1`,
    [businessId],
  );
  const biz = bizRes.rows[0] ?? { name: "", comuna: "" };

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

  return {
    now: now.toISOString(),
    business: { name: biz.name, comuna: biz.comuna },
    owner,
    notifications: { count: 0 },
    week: { recoveredHours: 0, recoveredClp: 0 },
    features: {
      waitlist: { count: 0, day: today, progress: 0 },
      flash: { active: 0, booked: 0, progress: 0 },
      winback: { count: 0 },
    },
    stats: {
      bookingsToday: today_.length,
      toConfirm,
      revenueWeekClp: 0,
      revenueSeries: [0, 0, 0, 0, 0, 0, 0],
      noShowPct: 0,
      noShowTrend: "flat",
    },
    today: today_,
    upcoming,
    calendar: {
      month: {
        year: Number(today.slice(0, 4)),
        month: Number(today.slice(5, 7)),
      },
      markedDates: [],
    },
    activeFlash: null,
  };
}
