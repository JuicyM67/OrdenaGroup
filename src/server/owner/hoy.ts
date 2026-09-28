import "server-only";

import type {
  BookingSource,
  BookingStatus,
  HoyBooking,
  HoyData,
} from "@/components/mobile/types";
import {
  isoWeekdayOf,
  localDayRange,
  SANTIAGO,
  type LocalDate,
} from "@/lib/format/dates";
import type { Queryable } from "@/server/db/pool";
import { withOwnerTx } from "@/server/db/tx";

import { isoOf, staffColorOf } from "./shared";

/** Samma statiska länkar som `/design-lab/hoy/fixtures.ts` (rutterna finns
 * inte än — Caja/väntelista/hora flash är utanför WP-21). */
const LINKS: HoyData["links"] = {
  flash: "/app/horas-flash/nueva",
  waitlist: "/app/lista-de-espera",
  cobrar: "/app/caja/cobrar",
  tabs: {
    hoy: "/app/hoy",
    agenda: "/app/agenda",
    clientes: "/app/clientes",
    caja: "/app/caja",
  },
};

type BookingRow = {
  id: string;
  client_name: string | null;
  visits_count: number;
  service_name: string;
  staff_name: string;
  staff_color: string;
  status: BookingStatus;
  confirmed_by_customer_at: string | null;
  price_clp: number;
  discount_clp: number;
  deposit_clp: number;
  source: BookingSource;
  start_ms: number;
  end_ms: number;
};

/**
 * Hoys data för dagen `today` (WP-21). Ingen väntelista/notiser (utanför
 * scope): `waitlistCount`/`unreadNotifications` är alltid 0.
 */
export async function loadOwnerHoy(
  userId: string,
  businessId: string,
  today: LocalDate,
  now: Date,
  ownerName: string,
): Promise<HoyData> {
  return withOwnerTx(userId, (q) =>
    loadOwnerHoyIn(q, businessId, today, now, ownerName),
  );
}

/** Inre steg (för tester): kör i anroparens transaktion. */
export async function loadOwnerHoyIn(
  q: Queryable,
  businessId: string,
  today: LocalDate,
  now: Date,
  ownerName: string,
): Promise<HoyData> {
  const closedRes = await q.query<{ one: number }>(
    `select 1 as one from public.business_hours
      where business_id = $1 and weekday = $2
      limit 1`,
    [businessId, isoWeekdayOf(today)],
  );
  const closedToday = closedRes.rows.length === 0;

  const { start, end } = localDayRange(today, SANTIAGO);
  const bookingsRes = await q.query<BookingRow>(
    `select bk.id, c.name as client_name, c.visits_count,
            sv.name as service_name, st.name as staff_name, st.color as staff_color,
            bk.status::text as status, bk.confirmed_by_customer_at,
            bk.price_clp, bk.discount_clp, bk.deposit_clp, bk.source::text as source,
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

  const bookings: HoyBooking[] = bookingsRes.rows.map((b) => ({
    id: b.id,
    start: isoOf(b.start_ms),
    end: isoOf(b.end_ms),
    clientName: b.client_name ?? "",
    service: b.service_name,
    staffName: b.staff_name,
    staffColor: staffColorOf(b.staff_color),
    status: b.status,
    confirmedByCustomer: b.confirmed_by_customer_at != null,
    depositPaidClp: b.deposit_clp,
    source: b.source,
    visitNumber: b.visits_count + 1,
  }));
  const dayTotalClp = bookingsRes.rows.reduce(
    (sum, b) => sum + (b.price_clp - b.discount_clp),
    0,
  );

  return {
    now: now.toISOString(),
    owner: { name: ownerName },
    closedToday,
    bookings: closedToday ? [] : bookings,
    dayCount: closedToday ? 0 : bookings.length,
    dayTotalClp: closedToday ? 0 : dayTotalClp,
    waitlistCount: 0,
    unreadNotifications: 0,
    links: LINKS,
  };
}
