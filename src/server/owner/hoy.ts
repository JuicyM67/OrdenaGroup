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
  APP_TZ,
  type LocalDate,
} from "@/lib/format/dates";
import { appHref } from "@/config/routes";
import { listBookingAnswersIn } from "@/server/booking-questions/answers";
import { hasPerm, loadMember, type Member } from "@/server/db/permissions";
import type { Queryable } from "@/server/db/pool";
import { withOwnerTx } from "@/server/db/tx";
import { listFreeGaps } from "@/server/flash";
import { listWaitlist } from "@/server/waitlist";

import { memberView, type MemberView } from "./member";
import { listPendingRequestsIn } from "./requests";
import { isoOf, listPaidBookingIds, staffColorOf } from "./shared";

/** WP-23/WP-30: "Crear hora flash"/"Lista de espera" pekar nu på de riktiga
 * sidorna (`/app/flash`, väntelistkortet i `/app/agenda`). "Cobrar" pekar på
 * Caja (WP-24) — ingen egen "snabb inkassering"-ruta finns. */
const LINKS: HoyData["links"] = {
  flash: appHref("appFlash"),
  waitlist: appHref("appAgenda"),
  cobrar: appHref("appCaja"),
  tabs: {
    hoy: appHref("appHoy"),
    agenda: appHref("appAgenda"),
    clientes: appHref("appClientes"),
    caja: appHref("appCaja"),
  },
};

type BookingRow = {
  id: string;
  client_name: string | null;
  visits_count: number;
  service_name: string;
  staff_id: string;
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
  is_member: boolean;
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
): Promise<HoyData & { member: MemberView }> {
  // WP-23: `listWaitlist` (scheduling-engineer) öppnar sin egen
  // `withOwnerTx` — samma motiv som `loadOwnerInicio`. WP-57: `listFreeGaps`
  // (src/server/flash/gaps.ts) likaså — samma körning som Blixttiders tomma läge.
  const [waitlistItems, freeGaps] = await Promise.all([
    listWaitlist(userId, businessId, today, now),
    listFreeGaps(userId, businessId, now),
  ]);
  // WP-57 (punkt 5): bara dagens luckor i "Resto del día" — imorgons hör till Blixttiders
  // egen tomma-läge-lista (`/app/flash`).
  const gaps: HoyData["gaps"] = freeGaps
    .filter((g) => g.date === today)
    .map((g) => ({
      staffId: g.staffId,
      staffName: g.staffName,
      start: g.start,
      end: g.end,
    }));
  return withOwnerTx(userId, async (q) => {
    const member = await loadMember(q, userId, businessId);
    const data = await loadOwnerHoyIn(
      q,
      businessId,
      today,
      now,
      ownerName,
      member,
    );
    return {
      ...data,
      waitlistCount: waitlistItems.length,
      gaps: data.closedToday ? [] : gaps,
      member: memberView(member),
    };
  });
}

/** Inre steg (för tester): kör i anroparens transaktion. `member`
 * utelämnad = ingen behörighetsfiltrering (tester). WP-46: dagens summa
 * (`dayTotalClp`) kräver `can_view_reports`, förfrågningarna filtreras
 * till dem medlemmen får hantera. */
export async function loadOwnerHoyIn(
  q: Queryable,
  businessId: string,
  today: LocalDate,
  now: Date,
  ownerName: string,
  member?: Member | null,
): Promise<HoyData> {
  const showMoney = member === undefined || hasPerm(member, "can_view_reports");
  const closedRes = await q.query<{ one: number }>(
    `select 1 as one from public.business_hours
      where business_id = $1 and weekday = $2
      limit 1`,
    [businessId, isoWeekdayOf(today)],
  );
  const closedToday = closedRes.rows.length === 0;

  const { start, end } = localDayRange(today, APP_TZ);
  const bookingsRes = await q.query<BookingRow>(
    `select bk.id, c.name as client_name, c.visits_count, c.is_member,
            sv.name as service_name, st.id as staff_id, st.name as staff_name, st.color as staff_color,
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

  // WP-40 (D-031): en batch-fråga för dagens bokningar (`listBookingAnswersIn`),
  // inte en per bokning — samma avvägning som veckans agenda.
  const answersByBooking = await listBookingAnswersIn(
    q,
    businessId,
    bookingsRes.rows.map((b) => b.id),
  );
  // WP-24 (F10): samma batch-avvägning för "Pagada".
  const paidIds = await listPaidBookingIds(
    q,
    businessId,
    bookingsRes.rows.map((b) => b.id),
  );

  const bookings: HoyBooking[] = bookingsRes.rows.map((b) => {
    const answers = answersByBooking[b.id];
    return {
      id: b.id,
      start: isoOf(b.start_ms),
      end: isoOf(b.end_ms),
      clientName: b.client_name ?? "",
      service: b.service_name,
      staffId: b.staff_id,
      staffName: b.staff_name,
      staffColor: staffColorOf(b.staff_color),
      status: b.status,
      confirmedByCustomer: b.confirmed_by_customer_at != null,
      priceClp: b.price_clp,
      discountClp: b.discount_clp,
      depositPaidClp: b.deposit_clp,
      paymentId: paidIds.get(b.id)?.paymentId ?? null,
      source: b.source,
      visitNumber: b.visits_count + 1,
      isMember: b.is_member,
      ...(answers && answers.length > 0 ? { answers } : {}),
    };
  });
  const dayTotalClp = bookingsRes.rows.reduce(
    (sum, b) => sum + (b.price_clp - b.discount_clp),
    0,
  );

  const pendingRequests = await listPendingRequestsIn(
    q,
    businessId,
    now,
    member,
  );

  return {
    now: now.toISOString(),
    owner: { name: ownerName },
    closedToday,
    bookings: closedToday ? [] : bookings,
    dayCount: closedToday ? 0 : bookings.length,
    dayTotalClp: closedToday || !showMoney ? 0 : dayTotalClp,
    waitlistCount: 0,
    // WP-57: `loadOwnerHoy` (ovan) fyller i de riktiga luckorna efteråt — `listFreeGaps`
    // (scheduling-engineer) öppnar sin egen transaktion och kan därför inte anropas härifrån
    // (samma mönster som `waitlistCount`/`listWaitlist`).
    gaps: [],
    pendingRequests,
    links: LINKS,
  };
}
