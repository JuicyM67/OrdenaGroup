import "server-only";

import type {
  AgendaBlock,
  AgendaBooking,
  AgendaBusinessHours,
  AgendaData,
  AgendaStaff,
  BookingSource,
  BookingStatus,
  TimeOffKind,
} from "@/components/agenda/types";
import type { Clp } from "@/lib/format/clp";
import {
  addLocalDays,
  localDayRange,
  startOfLocalWeek,
  APP_TZ,
  type LocalDate,
  type LocalTime,
} from "@/lib/format/dates";
import type { E164 } from "@/lib/format/phone";
import { listBookingAnswersIn } from "@/server/booking-questions/answers";
import type { Queryable } from "@/server/db/pool";
import { withOwnerTx } from "@/server/db/tx";

import { isoOf, staffColorOf } from "./shared";

/**
 * Agendans data för en vecka (WP-21). Laddar företagets personal, öppettider,
 * bokningar och block för veckan som innehåller `focus`, och mappar dem till
 * samma `AgendaData`-modell som `/design-lab/agenda` (fixtures.ts). Ingen
 * "Mover" här (utanför scope) och ingen väntelista (F8/WP-23): `waitlist` är
 * alltid `null`.
 */
export async function loadOwnerAgendaWeek(
  userId: string,
  businessId: string,
  focus: LocalDate,
  now: Date,
): Promise<AgendaData> {
  return withOwnerTx(userId, (q) =>
    loadOwnerAgendaWeekIn(q, businessId, focus, now),
  );
}

type StaffRow = { id: string; name: string; color: string };
type HoursRow = { weekday: number; start_time: string; end_time: string };
type BookingRow = {
  id: string;
  staff_id: string;
  client_name: string | null;
  phone_e164: string | null;
  visits_count: number;
  service_name: string;
  price_clp: number;
  discount_clp: number;
  deposit_clp: number;
  source: BookingSource;
  status: BookingStatus;
  confirmed_by_customer_at: string | null;
  start_ms: number;
  end_ms: number;
};
type BlockRow = {
  staff_id: string | null;
  kind: TimeOffKind;
  start_ms: number;
  end_ms: number;
};

/** Inre steg (för tester): kör i anroparens transaktion. */
export async function loadOwnerAgendaWeekIn(
  q: Queryable,
  businessId: string,
  focus: LocalDate,
  now: Date,
): Promise<AgendaData> {
  const weekStart = startOfLocalWeek(focus);
  const weekEnd = addLocalDays(weekStart, 6);
  const rangeStart = localDayRange(weekStart, APP_TZ).start;
  const rangeEnd = localDayRange(weekEnd, APP_TZ).end;

  const staffRes = await q.query<StaffRow>(
    `select id, name, color from public.staff
      where business_id = $1 and active
      order by sort, name`,
    [businessId],
  );
  const staff: AgendaStaff[] = staffRes.rows.map((s) => ({
    id: s.id,
    name: s.name,
    color: staffColorOf(s.color),
  }));

  const hoursRes = await q.query<HoursRow>(
    `select weekday, start_time::text as start_time, end_time::text as end_time
       from public.business_hours where business_id = $1`,
    [businessId],
  );
  const hours: AgendaBusinessHours = {};
  for (const h of hoursRes.rows) {
    const weekday = h.weekday as 1 | 2 | 3 | 4 | 5 | 6 | 7;
    const list = hours[weekday] ?? [];
    hours[weekday] = [
      ...list,
      {
        open: h.start_time.slice(0, 5) as LocalTime,
        close: h.end_time.slice(0, 5) as LocalTime,
      },
    ];
  }

  const bookingsRes = await q.query<BookingRow>(
    `select bk.id, bk.staff_id,
            c.name as client_name, c.phone_e164, c.visits_count,
            sv.name as service_name,
            bk.price_clp, bk.discount_clp, bk.deposit_clp,
            bk.source::text as source, bk.status::text as status,
            bk.confirmed_by_customer_at,
            extract(epoch from lower(bk.period)) * 1000 as start_ms,
            extract(epoch from upper(bk.period)) * 1000 as end_ms
       from public.bookings bk
       join public.customers c
         on c.business_id = bk.business_id and c.id = bk.customer_id
       join public.services sv
         on sv.business_id = bk.business_id and sv.id = bk.service_id
      where bk.business_id = $1
        and bk.status <> 'cancelled'
        and bk.period && tstzrange($2, $3, '[)')
      order by lower(bk.period)`,
    [businessId, rangeStart, rangeEnd],
  );

  // WP-40 (D-031): en enda batch-fråga för veckans bokningar i stället för
  // en fråga per bokning (samma avvägning som `loadOwnerHoyIn`).
  const answersByBooking = await listBookingAnswersIn(
    q,
    businessId,
    bookingsRes.rows.map((b) => b.id),
  );

  const bookings: AgendaBooking[] = bookingsRes.rows.map((b) => {
    const priceClp = b.price_clp as Clp;
    // flashPct: procenttal räknat ur discount_clp/price_clp — ingen egen
    // kolumn (samma avvägning som TINTS i page-data.ts).
    const flashPct =
      b.source === "flash" && priceClp > 0
        ? Math.round((b.discount_clp / priceClp) * 100)
        : undefined;
    const answers = answersByBooking[b.id];
    return {
      id: b.id,
      staffId: b.staff_id,
      start: isoOf(b.start_ms),
      end: isoOf(b.end_ms),
      clientName: b.client_name ?? "",
      // Anonymiserade kunder (WP-26) förlorar telefonen — bör inte förekomma
      // på en aktiv bokning, men skärmen ska inte krascha om det ändå sker.
      phone: (b.phone_e164 ?? "") as E164,
      visitNumber: b.visits_count + 1,
      service: b.service_name,
      priceClp,
      depositPaidClp: b.deposit_clp > 0 ? (b.deposit_clp as Clp) : null,
      source: b.source,
      status: b.status,
      confirmedByCustomer: b.confirmed_by_customer_at != null,
      ...(flashPct !== undefined ? { flashPct } : {}),
      ...(answers && answers.length > 0 ? { answers } : {}),
    };
  });

  const blocksRes = await q.query<BlockRow>(
    `select staff_id, kind::text as kind,
            extract(epoch from lower(period)) * 1000 as start_ms,
            extract(epoch from upper(period)) * 1000 as end_ms
       from public.time_off
      where business_id = $1
        and period && tstzrange($2, $3, '[)')
      order by lower(period)`,
    [businessId, rangeStart, rangeEnd],
  );
  const blocks: AgendaBlock[] = blocksRes.rows.flatMap((b) => {
    const targets = b.staff_id ? [b.staff_id] : staffRes.rows.map((s) => s.id);
    return targets.map((staffId) => ({
      staffId,
      start: isoOf(b.start_ms),
      end: isoOf(b.end_ms),
      kind: b.kind,
    }));
  });

  const weekCounts: Record<string, number> = {};
  for (const s of staff) weekCounts[s.id] = 0;
  for (const b of bookings)
    weekCounts[b.staffId] = (weekCounts[b.staffId] ?? 0) + 1;

  return {
    now: now.toISOString(),
    timezone: APP_TZ,
    business: { hours },
    staff,
    bookings,
    blocks,
    // F8/väntelista (WP-23): utanför scope, ingen tomläges-uppgift att räkna.
    waitlist: null,
    weekCounts,
  };
}
