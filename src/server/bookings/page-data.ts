import "server-only";

import type {
  BookingAvailability,
  BookingBusiness,
  BookingPageData,
  BookingService,
  BookingServiceCategory,
  BookingStaffMember,
  DayAvailability,
  ServiceTint,
} from "@/components/booking/types";
import {
  addLocalDays,
  eachLocalDate,
  parseLocalTime,
  APP_TZ,
  toLocalDate,
} from "@/lib/format/dates";
import type { BookingQuestionDef } from "@/lib/validation/booking-questions";
import { getQuestionsForServiceIn } from "@/server/booking-questions/catalog";
import type { Queryable } from "@/server/db/pool";
import {
  CUSTOMER_SLOT_LIMIT,
  staffOffersService,
} from "@/server/scheduling/availability";
import { dayStatus, slotsForDay } from "@/server/scheduling/core/slots";
import { loadSnapshot } from "@/server/scheduling/load";
import { ANY_STAFF, type DayInput } from "@/server/scheduling/types";

/**
 * Sidans data för `/{slug}` (WP-20). Läser `businessId` (redan slug→id-
 * upplöst av `src/server/bookings/business.ts`) och bygger samma vy-typer som
 * `BookingScreen` redan tar emot från fixturerna.
 *
 * Kunden ser tillgänglighet för de kommande `RANGE_DAYS` dagarna, inte hela
 * `max_days_ahead` — en avvägning mot sidstorleken/prestandabudgeten (170 kB
 * JS, 3,5 s på 4G, se `e2e/reserva.spec.ts`), eftersom hela fönstret skickas
 * med i första sidladdningen (steg 2 i planen, docs/tasks/plans/WP-20.md).
 * `loadSnapshot` gör ändå bara 6 frågor per tjänst oavsett antal dagar
 * (SCHEDULING.md R10) — `dayStatus`/`slotsForDay` är rena beräkningar på den
 * redan laddade ögonblicksbilden, så fönstrets längd kostar inga extra
 * frågor, bara mer JSON i svaret.
 *
 * En "full" dag utelämnas helt (precis som en stängd dag): väntelistan är
 * utanför WP-20 (dölj knappen/flödet i riktig data, behåll i design lab).
 */
const RANGE_DAYS = 21;

/** `services` har ingen tint-kolumn (bara ett designval, inte data): cyklas
 * per tjänstens sorteringsordning. */
const TINTS: readonly ServiceTint[] = ["lilac", "peach", "lime"];

type BusinessRow = {
  name: string;
  comuna: string;
  status: string;
  cancel_window_hours: number;
};

type HoursRow = { weekday: number; start_time: string; end_time: string };
type ServiceRow = {
  id: string;
  name: string;
  duration_min: number;
  price_clp: number;
  category_id: string | null;
};
type StaffRow = { id: string; name: string };
type CategoryRow = { id: string; name: string };

async function loadHours(
  q: Queryable,
  businessId: string,
): Promise<Pick<BookingBusiness, "weekdaysOpen" | "open" | "close">> {
  const r = await q.query<HoursRow>(
    `select weekday, start_time::text as start_time, end_time::text as end_time
       from public.business_hours where business_id = $1`,
    [businessId],
  );
  if (r.rows.length === 0) {
    // Ett felkonfigurerat företag (inga öppettider alls) — BusinessHeader
    // behöver ändå ett värde. Motorn visar redan "closed" varje dag.
    return {
      weekdaysOpen: [1] as BookingBusiness["weekdaysOpen"],
      open: "00:00" as BookingBusiness["open"],
      close: "00:00" as BookingBusiness["close"],
    };
  }
  const weekdaysOpen = [...new Set(r.rows.map((h) => h.weekday))].sort(
    (a, b) => a - b,
  ) as BookingBusiness["weekdaysOpen"];
  const starts = r.rows.map((h) => {
    const p = parseLocalTime(h.start_time);
    if (!p.ok) throw new RangeError("page-data: öppettid ogiltig (start)");
    return p.value;
  });
  const ends = r.rows.map((h) => {
    const p = parseLocalTime(h.end_time, { allowEndOfDay: true });
    if (!p.ok) throw new RangeError("page-data: öppettid ogiltig (slut)");
    return p.value;
  });
  return {
    weekdaysOpen,
    open: [...starts].sort()[0]!,
    close: [...ends].sort().at(-1)!,
  };
}

export async function loadReservaPageData(
  q: Queryable,
  params: { businessId: string; slug: string; now: Date },
): Promise<BookingPageData | null> {
  const { businessId, slug, now } = params;

  const bizRes = await q.query<BusinessRow>(
    `select name, comuna, status::text as status, cancel_window_hours
       from public.businesses where id = $1`,
    [businessId],
  );
  const biz = bizRes.rows[0];
  if (!biz) return null;

  const hours = await loadHours(q, businessId);

  const business: BookingBusiness = {
    slug,
    name: biz.name,
    comuna: biz.comuna,
    // D-011: bara Santiago-marknaden i v1, ingen egen kolumn för staden.
    city: "Santiago",
    ...hours,
    cancelWindowHours: biz.cancel_window_hours,
    status: biz.status as BookingBusiness["status"],
  };

  if (business.status !== "active") {
    return {
      now: now.toISOString(),
      business,
      services: [],
      staff: [],
      availability: {},
    };
  }

  const serviceRows = await q.query<ServiceRow>(
    `select id, name, duration_min, price_clp, category_id
       from public.services
      where business_id = $1 and active
      order by sort, name`,
    [businessId],
  );
  const staffRows = await q.query<StaffRow>(
    `select id, name from public.staff
      where business_id = $1 and active
      order by sort, name`,
    [businessId],
  );
  // WP-40 (D-031): bara kategorier som har minst en aktiv tjänst — en tom
  // kategori vore en flik utan innehåll. `formulario.categorias.pestanaTodas`/
  // `sinAsignar` (om det behövs) läggs till av UI:t, inte här (ren data).
  const usedCategoryIds = new Set(
    serviceRows.rows
      .map((s) => s.category_id)
      .filter((id): id is string => id !== null),
  );
  const categories: BookingServiceCategory[] = [];
  if (usedCategoryIds.size > 0) {
    const categoryRows = await q.query<CategoryRow>(
      `select id, name from public.service_categories
        where business_id = $1
        order by sort, name`,
      [businessId],
    );
    for (const c of categoryRows.rows) {
      if (usedCategoryIds.has(c.id)) categories.push({ id: c.id, name: c.name });
    }
  }

  const services: BookingService[] = serviceRows.rows.map((s, i) => ({
    id: s.id,
    name: s.name,
    durationMin: s.duration_min,
    priceClp: s.price_clp,
    tint: TINTS[i % TINTS.length]!,
    categoryId: s.category_id,
  }));
  const staff: BookingStaffMember[] = staffRows.rows.map((s) => ({
    id: s.id,
    name: s.name,
  }));

  const availability: Record<string, Record<string, DayAvailability[]>> = {};
  // WP-40: kundens frågor per tjänst, redan upplösta (tjänst + kategori,
  // klippta till max 5 — se `getQuestionsForServiceIn`). En fråga per
  // extra fråga i stället för att läsa hela katalogen här (litet antal
  // tjänster per företag, samma avvägning som `loadSnapshot` nedan).
  const questionsByService: Record<string, readonly BookingQuestionDef[]> = {};

  if (services.length > 0) {
    const from = toLocalDate(now, APP_TZ);
    const to = addLocalDays(from, RANGE_DAYS - 1);
    const dates = eachLocalDate(from, to);
    const staffChoices = [ANY_STAFF, ...staffRows.rows.map((s) => s.id)];

    for (const service of serviceRows.rows) {
      questionsByService[service.id] = await getQuestionsForServiceIn(
        q,
        businessId,
        service.id,
      );
      const loaded = await loadSnapshot(q, {
        businessId,
        serviceId: service.id,
        range: { from, to },
      });
      // service_not_offered: kan i praktiken inte hända (samma businessId,
      // just hämtad som aktiv tjänst i samma transaktion) — skyddar ändå mot
      // en race (tjänsten inaktiverad mellan frågorna) i stället för att kasta.
      if (!loaded.ok) continue;

      const byStaff: Record<string, DayAvailability[]> = {};
      for (const staffChoice of staffChoices) {
        if (!staffOffersService(loaded.value, staffChoice)) continue;

        const days: DayAvailability[] = [];
        for (const date of dates) {
          const dayInput: DayInput = {
            snapshot: loaded.value.snapshot,
            date,
            staff: staffChoice,
            audience: "customer",
            now,
          };
          const status = dayStatus(dayInput);
          // "closed" och "full" utelämnas båda (väntelistan är utanför WP-20).
          if (status !== "available") continue;

          const slots = slotsForDay(dayInput, CUSTOMER_SLOT_LIMIT).map((s) => ({
            // Instanten är själva id:t (unikt inom den här dagens lista):
            // samma sträng skickas rakt igenom som `createBooking`s `start`.
            id: s.start,
            start: s.start,
            priceClp: loaded.value.priceClp,
          }));
          days.push({ date, state: "open", hasFlash: false, slots });
        }
        byStaff[staffChoice] = days;
      }
      availability[service.id] = byStaff;
    }
  }

  return {
    now: now.toISOString(),
    business,
    services,
    staff,
    availability: availability as BookingAvailability,
    categories,
    questionsByService,
  };
}
