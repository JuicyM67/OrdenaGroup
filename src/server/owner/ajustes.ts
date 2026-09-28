import "server-only";

/**
 * Ajustes (WP-15b slim, F1/F2/F3 efter onboarding): ägaren läser och ändrar sitt eget
 * företag i /app/ajustes. Allt går via `withOwnerTx` (D-019) — RLS (`private.is_member`,
 * D-014) är den enda gränsen för tenant-isolering, samma mönster som
 * `src/server/onboarding/complete-onboarding.ts`. Varje mutation tar `businessId`
 * explicit (försvar i djupet, D-014) OCH litar på RLS: ett `UPDATE`/`DELETE` som inte
 * matchar RLS-policyn (ägaren är inte medlem i just det företaget) rör noll rader i
 * stället för att kasta — se `assertUpdated`. Ett `INSERT` som inte matchar `with check`
 * kastar 42501 — se `mapDbError`.
 */
import type { IsoWeekday } from "@/lib/format/dates";
import type { Queryable } from "@/server/db/pool";
import { pgErrorCode } from "@/server/db/errors";
import { withOwnerTx } from "@/server/db/tx";

import {
  ajustesHoursInputSchema,
  ajustesServiceInputSchema,
  ajustesStaffInputSchema,
  businessSettingsInputSchema,
} from "./ajustes-schemas";

export type AjustesBusiness = {
  name: string;
  slug: string;
  comuna: string;
  phone: string;
  address: string;
  minNoticeMinutes: number;
  maxDaysAhead: number;
  cancelWindowHours: number;
  slotIntervalMinutes: number;
};

export type AjustesService = {
  id: string;
  name: string;
  durationMin: number;
  priceClp: number;
  bufferAfterMin: number;
  active: boolean;
};

export type AjustesStaffMember = {
  id: string;
  name: string;
  active: boolean;
  serviceIds: string[];
};

export type AjustesHour = {
  weekday: IsoWeekday;
  open: boolean;
  start: string;
  end: string;
};

export type AjustesData = {
  business: AjustesBusiness;
  services: AjustesService[];
  staff: AjustesStaffMember[];
  hours: AjustesHour[];
};

export type MutationResult = { ok: true } | { ok: false; code: string };
export type CreateResult =
  { ok: true; id: string } | { ok: false; code: string };

function pgConstraint(e: unknown): string | undefined {
  if (typeof e !== "object" || e === null || !("constraint" in e)) {
    return undefined;
  }
  const v = (e as Record<string, unknown>).constraint;
  return typeof v === "string" ? v : undefined;
}

/** Samma mönster som complete-onboarding.ts: bara SQLSTATE/constraint, aldrig detail. */
function mapDbError(e: unknown): string {
  const code = pgErrorCode(e);
  const constraint = pgConstraint(e);
  if (code === "42501") return "unauthorized";
  if (code === "23505" && constraint === "businesses_slug_key") {
    return "business.slug_taken";
  }
  if (code === "23514" && constraint === "businesses_slug_not_reserved") {
    return "business.slug_reserved";
  }
  if (code === "23514" && constraint === "businesses_slug_format") {
    return "business.slug_invalid";
  }
  if (code === "23P01" && constraint === "business_hours_no_overlap") {
    return "hours.business_hours_no_overlap";
  }
  if (code === "23514" && constraint === "business_hours_start_before_end") {
    return "hours.business_hours_start_before_end";
  }
  return "unknown";
}

/** UPDATE/DELETE som inte matchade RLS (ägaren är inte medlem i det företaget) → 0 rader. */
function assertUpdated(rowCount: number | null): MutationResult | undefined {
  if (!rowCount) return { ok: false, code: "unauthorized" };
  return undefined;
}

// ---------------------------------------------------------------------------
// Läsning
// ---------------------------------------------------------------------------

type BusinessRow = {
  name: string;
  slug: string;
  comuna: string;
  phone: string | null;
  address: string | null;
  min_notice_minutes: number;
  max_days_ahead: number;
  cancel_window_hours: number;
  slot_interval_minutes: number;
};

type ServiceRow = {
  id: string;
  name: string;
  duration_min: number;
  price_clp: number;
  buffer_after_min: number;
  active: boolean;
};

type StaffRow = { id: string; name: string; active: boolean };
type StaffServiceRow = { staff_id: string; service_id: string };
type HoursRow = { weekday: number; start_time: string; end_time: string };

/** "HH:mm:ss" (Postgres `time`) → "HH:mm". */
function shortTime(t: string): string {
  return t.slice(0, 5);
}

export async function loadAjustesDataIn(
  q: Queryable,
  businessId: string,
): Promise<AjustesData> {
  const businessRes = await q.query<BusinessRow>(
    `select name, slug, comuna, phone, address, min_notice_minutes, max_days_ahead,
            cancel_window_hours, slot_interval_minutes
       from public.businesses
      where id = $1`,
    [businessId],
  );
  const b = businessRes.rows[0];
  if (!b) throw new Error("loadAjustesData: företaget hittades inte");

  const servicesRes = await q.query<ServiceRow>(
    `select id, name, duration_min, price_clp, buffer_after_min, active
       from public.services
      where business_id = $1
      order by sort, name`,
    [businessId],
  );
  const staffRes = await q.query<StaffRow>(
    `select id, name, active
       from public.staff
      where business_id = $1
      order by sort, name`,
    [businessId],
  );
  const staffServicesRes = await q.query<StaffServiceRow>(
    `select staff_id, service_id
       from public.staff_services
      where business_id = $1`,
    [businessId],
  );
  const hoursRes = await q.query<HoursRow>(
    `select weekday, start_time, end_time
       from public.business_hours
      where business_id = $1
      order by weekday`,
    [businessId],
  );

  const serviceIdsByStaff = new Map<string, string[]>();
  for (const row of staffServicesRes.rows) {
    const list = serviceIdsByStaff.get(row.staff_id) ?? [];
    list.push(row.service_id);
    serviceIdsByStaff.set(row.staff_id, list);
  }

  const hoursByWeekday = new Map<number, HoursRow>();
  for (const row of hoursRes.rows) hoursByWeekday.set(row.weekday, row);

  const hours: AjustesHour[] = [1, 2, 3, 4, 5, 6, 7].map((weekday) => {
    const row = hoursByWeekday.get(weekday);
    return row
      ? {
          weekday: weekday as IsoWeekday,
          open: true,
          start: shortTime(row.start_time),
          end: shortTime(row.end_time),
        }
      : {
          weekday: weekday as IsoWeekday,
          open: false,
          start: "09:00",
          end: "19:00",
        };
  });

  return {
    business: {
      name: b.name,
      slug: b.slug,
      comuna: b.comuna,
      phone: b.phone ?? "",
      address: b.address ?? "",
      minNoticeMinutes: b.min_notice_minutes,
      maxDaysAhead: b.max_days_ahead,
      cancelWindowHours: b.cancel_window_hours,
      slotIntervalMinutes: b.slot_interval_minutes,
    },
    services: servicesRes.rows.map((s) => ({
      id: s.id,
      name: s.name,
      durationMin: s.duration_min,
      priceClp: s.price_clp,
      bufferAfterMin: s.buffer_after_min,
      active: s.active,
    })),
    staff: staffRes.rows.map((s) => ({
      id: s.id,
      name: s.name,
      active: s.active,
      serviceIds: serviceIdsByStaff.get(s.id) ?? [],
    })),
    hours,
  };
}

export function loadAjustesData(
  userId: string,
  businessId: string,
): Promise<AjustesData> {
  return withOwnerTx(userId, (q) => loadAjustesDataIn(q, businessId));
}

// ---------------------------------------------------------------------------
// Företaget
// ---------------------------------------------------------------------------

export async function updateBusinessSettings(
  userId: string,
  businessId: string,
  rawInput: unknown,
): Promise<MutationResult> {
  const parsed = businessSettingsInputSchema.safeParse(rawInput);
  if (!parsed.success) {
    return {
      ok: false,
      code: parsed.error.issues[0]?.message ?? "invalid_input",
    };
  }
  const input = parsed.data;
  try {
    return await withOwnerTx(userId, async (q) => {
      const r = await q.query(
        `update public.businesses
            set name = $1, slug = $2, comuna = $3, phone = $4, address = $5,
                min_notice_minutes = $6, max_days_ahead = $7,
                cancel_window_hours = $8, slot_interval_minutes = $9
          where id = $10`,
        [
          input.name,
          input.slug,
          input.comuna,
          input.phone,
          input.address ? input.address : null,
          input.minNoticeMinutes,
          input.maxDaysAhead,
          input.cancelWindowHours,
          input.slotIntervalMinutes,
          businessId,
        ],
      );
      return assertUpdated(r.rowCount) ?? { ok: true };
    });
  } catch (e) {
    return { ok: false, code: mapDbError(e) };
  }
}

// ---------------------------------------------------------------------------
// Tjänster (ingen radering — bara inaktivera, se WP-15b-planen)
// ---------------------------------------------------------------------------

async function nextSort(
  q: Queryable,
  table: string,
  businessId: string,
): Promise<number> {
  const r = await q.query<{ next: number }>(
    `select coalesce(max(sort), 0) + 1 as next from public.${table} where business_id = $1`,
    [businessId],
  );
  return r.rows[0]?.next ?? 1;
}

export async function createService(
  userId: string,
  businessId: string,
  rawInput: unknown,
): Promise<CreateResult> {
  const parsed = ajustesServiceInputSchema.safeParse(rawInput);
  if (!parsed.success) {
    return {
      ok: false,
      code: parsed.error.issues[0]?.message ?? "invalid_input",
    };
  }
  const input = parsed.data;
  try {
    return await withOwnerTx(userId, async (q) => {
      const sort = await nextSort(q, "services", businessId);
      const r = await q.query<{ id: string }>(
        `insert into public.services (business_id, name, duration_min, price_clp, buffer_after_min, sort)
         values ($1, $2, $3, $4, $5, $6) returning id`,
        [
          businessId,
          input.name,
          input.durationMin,
          input.priceClp,
          input.bufferAfterMin,
          sort,
        ],
      );
      const id = r.rows[0]?.id;
      if (!id) return { ok: false, code: "unauthorized" };
      return { ok: true, id };
    });
  } catch (e) {
    return { ok: false, code: mapDbError(e) };
  }
}

export async function updateService(
  userId: string,
  businessId: string,
  serviceId: string,
  rawInput: unknown,
): Promise<MutationResult> {
  const parsed = ajustesServiceInputSchema.safeParse(rawInput);
  if (!parsed.success) {
    return {
      ok: false,
      code: parsed.error.issues[0]?.message ?? "invalid_input",
    };
  }
  const input = parsed.data;
  try {
    return await withOwnerTx(userId, async (q) => {
      const r = await q.query(
        `update public.services
            set name = $1, duration_min = $2, price_clp = $3, buffer_after_min = $4
          where id = $5 and business_id = $6`,
        [
          input.name,
          input.durationMin,
          input.priceClp,
          input.bufferAfterMin,
          serviceId,
          businessId,
        ],
      );
      return assertUpdated(r.rowCount) ?? { ok: true };
    });
  } catch (e) {
    return { ok: false, code: mapDbError(e) };
  }
}

export async function setServiceActive(
  userId: string,
  businessId: string,
  serviceId: string,
  active: boolean,
): Promise<MutationResult> {
  return withOwnerTx(userId, async (q) => {
    const r = await q.query(
      `update public.services set active = $1 where id = $2 and business_id = $3`,
      [active, serviceId, businessId],
    );
    return assertUpdated(r.rowCount) ?? { ok: true };
  });
}

// ---------------------------------------------------------------------------
// Personal (ingen radering, se WP-15b-planen)
// ---------------------------------------------------------------------------

async function replaceStaffServices(
  q: Queryable,
  businessId: string,
  staffId: string,
  serviceIds: readonly string[],
): Promise<void> {
  await q.query(
    `delete from public.staff_services where business_id = $1 and staff_id = $2`,
    [businessId, staffId],
  );
  for (const serviceId of new Set(serviceIds)) {
    await q.query(
      `insert into public.staff_services (business_id, staff_id, service_id)
       select $1, $2, id from public.services where id = $3 and business_id = $1`,
      [businessId, staffId, serviceId],
    );
  }
}

export async function createStaff(
  userId: string,
  businessId: string,
  rawInput: unknown,
): Promise<CreateResult> {
  const parsed = ajustesStaffInputSchema.safeParse(rawInput);
  if (!parsed.success) {
    return {
      ok: false,
      code: parsed.error.issues[0]?.message ?? "invalid_input",
    };
  }
  const input = parsed.data;
  try {
    return await withOwnerTx(userId, async (q) => {
      const sort = await nextSort(q, "staff", businessId);
      const r = await q.query<{ id: string }>(
        `insert into public.staff (business_id, name, color, sort)
         values ($1, $2, $3, $4) returning id`,
        [businessId, input.name, `staff-${((sort - 1) % 6) + 1}`, sort],
      );
      const id = r.rows[0]?.id;
      if (!id) return { ok: false, code: "unauthorized" };
      await replaceStaffServices(q, businessId, id, input.serviceIds);
      return { ok: true, id };
    });
  } catch (e) {
    return { ok: false, code: mapDbError(e) };
  }
}

export async function updateStaff(
  userId: string,
  businessId: string,
  staffId: string,
  rawInput: unknown,
): Promise<MutationResult> {
  const parsed = ajustesStaffInputSchema.safeParse(rawInput);
  if (!parsed.success) {
    return {
      ok: false,
      code: parsed.error.issues[0]?.message ?? "invalid_input",
    };
  }
  const input = parsed.data;
  try {
    return await withOwnerTx(userId, async (q) => {
      const r = await q.query(
        `update public.staff set name = $1 where id = $2 and business_id = $3`,
        [input.name, staffId, businessId],
      );
      const failed = assertUpdated(r.rowCount);
      if (failed) return failed;
      await replaceStaffServices(q, businessId, staffId, input.serviceIds);
      return { ok: true };
    });
  } catch (e) {
    return { ok: false, code: mapDbError(e) };
  }
}

export async function setStaffActive(
  userId: string,
  businessId: string,
  staffId: string,
  active: boolean,
): Promise<MutationResult> {
  return withOwnerTx(userId, async (q) => {
    const r = await q.query(
      `update public.staff set active = $1 where id = $2 and business_id = $3`,
      [active, staffId, businessId],
    );
    return assertUpdated(r.rowCount) ?? { ok: true };
  });
}

// ---------------------------------------------------------------------------
// Öppettider (samma form som onboarding: ett intervall per dag)
// ---------------------------------------------------------------------------

export async function replaceBusinessHours(
  userId: string,
  businessId: string,
  rawInput: unknown,
): Promise<MutationResult> {
  const parsed = ajustesHoursInputSchema.safeParse(rawInput);
  if (!parsed.success) {
    return {
      ok: false,
      code: parsed.error.issues[0]?.message ?? "invalid_input",
    };
  }
  const input = parsed.data;
  try {
    return await withOwnerTx(userId, async (q) => {
      const del = await q.query(
        `delete from public.business_hours where business_id = $1`,
        [businessId],
      );
      // Inga öppna dagar innan heller: kolla medlemskap separat, annars skulle en
      // ägare utan dagar aldrig märka att skrivningen tystnat (0 rader från DELETE
      // säger inget om en tom vecka).
      if (del.rowCount === 0) {
        const member = await q.query(
          `select 1 from public.businesses where id = $1`,
          [businessId],
        );
        if (member.rows.length === 0)
          return { ok: false, code: "unauthorized" };
      }
      for (const h of input) {
        if (!h.open || !h.start || !h.end) continue;
        await q.query(
          `insert into public.business_hours (business_id, weekday, start_time, end_time)
           values ($1, $2, $3, $4)`,
          [businessId, h.weekday, h.start, h.end],
        );
      }
      return { ok: true };
    });
  } catch (e) {
    return { ok: false, code: mapDbError(e) };
  }
}
