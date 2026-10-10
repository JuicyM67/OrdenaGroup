import "server-only";

import { z } from "zod";

import { toLocalDate } from "@/lib/format/dates";
import { instantSchema } from "@/lib/format/schemas";
import { actorMember, canManageStaffBookings } from "@/server/bookings/authz";
import { pgErrorCode } from "@/server/db/errors";
import type { Queryable } from "@/server/db/pool";
import { savepoint, withOwnerTx } from "@/server/db/tx";
import { loadPlanIn, planCan } from "@/server/plans/entitlements";
import { systemClock } from "@/server/scheduling/clock";
import { eligibleStaff, needMs } from "@/server/scheduling/core/slots";
import { freeWindows } from "@/server/scheduling/core/windows";
import { loadSnapshot } from "@/server/scheduling/load";

/**
 * WP-30 (F13): horas flash — ägaren lägger ut en ledig tid med rabatt.
 *
 * Skapas bara om tiden är ledig i schemamotorn: hela [start, end) ligger i
 * profesionalens fria fönster (arbetstid − frånvaro − bokningar inkl.
 * buffert) och minst en tillåten tjänst (som profesionalen utför) ryms.
 * Två aktiva flash-tider för samma profesional får inte överlappa
 * (`flash_slots_no_overlap`, → `overlap`). Bokningen av tiden sker i
 * `createIn` (rabatt, `booked` i samma transaktion).
 *
 * Ägarvägarna körs som `authenticated` + RLS (`withOwnerTx`); TS-
 * kontrollen speglar policyn "write flash_slots" (all/egna bokningar).
 */

const uuid = z.guid();

const createFlashSchema = z
  .strictObject({
    staffId: uuid,
    start: instantSchema,
    end: instantSchema,
    serviceIds: z.array(uuid).min(1).max(50).nullable(),
    discountPct: z.number().int().min(1).max(90),
  })
  .refine((v) => v.end.getTime() > v.start.getTime());

export type CreateFlashSlotInput = z.input<typeof createFlashSchema>;

export type CreateFlashSlotResult =
  | { ok: true; id: string }
  | {
      ok: false;
      code:
        "forbidden" | "not_free" | "overlap" | "invalid_input" | "plan_locked";
    };

const MIN = 60_000;
/** En flash-tid får vara högst ett dygn lång. */
const MAX_LENGTH_MS = 24 * 60 * MIN;

/** Rollback-bärare: skrivningar i transaktionen ångras vid ett fel. */
class Fail extends Error {
  constructor(
    readonly code: Exclude<CreateFlashSlotResult, { ok: true }>["code"],
  ) {
    super(code);
  }
}

/**
 * Är [start, end) ledig hos profesionalen, och ryms minst en av tjänsterna?
 * `serviceIds` null = alla aktiva tjänster. Ren kontroll på motorns
 * ögonblicksbild (samma data som tillgängligheten).
 */
async function isFreeIn(
  q: Queryable,
  input: {
    businessId: string;
    staffId: string;
    start: number;
    end: number;
    serviceIds: string[] | null;
  },
): Promise<boolean | "invalid_input"> {
  const svc = await q.query<{ id: string }>(
    `select id from public.services
      where business_id = $1 and active
        and ($2::uuid[] is null or id = any($2::uuid[]))
      order by sort, name`,
    [input.businessId, input.serviceIds],
  );
  if (
    input.serviceIds !== null &&
    svc.rows.length !== new Set(input.serviceIds).size
  ) {
    return "invalid_input";
  }
  let any = false;
  for (const { id } of svc.rows) {
    const loaded = await loadSnapshot(q, {
      businessId: input.businessId,
      serviceId: id,
      range: { around: new Date(input.start) },
    });
    if (!loaded.ok) continue;
    const { snapshot } = loaded.value;
    const st = eligibleStaff(snapshot, input.staffId)[0];
    if (!st) continue;
    any = true;
    const date = toLocalDate(new Date(input.start), snapshot.tz);
    const inside = freeWindows(snapshot, st, date).some(
      (w) => w.start <= input.start && input.end <= w.end,
    );
    // Fönstret beror inte på tjänsten; bara behovet gör det.
    if (!inside) return false;
    if (input.start + needMs(snapshot) <= input.end) return true;
  }
  return any ? false : "invalid_input";
}

export async function createFlashSlot(
  userId: string,
  businessId: string,
  input: CreateFlashSlotInput,
  now: Date = systemClock(),
): Promise<CreateFlashSlotResult> {
  if (!uuid.safeParse(businessId).success) {
    return { ok: false, code: "invalid_input" };
  }
  const p = createFlashSchema.safeParse(input);
  if (!p.success) return { ok: false, code: "invalid_input" };
  const start = p.data.start.getTime();
  const end = p.data.end.getTime();
  if (start % MIN !== 0 || end % MIN !== 0) {
    return { ok: false, code: "invalid_input" };
  }
  if (end - start > MAX_LENGTH_MS || start < now.getTime()) {
    return { ok: false, code: "invalid_input" };
  }
  try {
    return await withOwnerTx(userId, async (q) => {
      const member = await actorMember(
        q,
        { kind: "owner", userId },
        businessId,
      );
      if (!member || !canManageStaffBookings(member, p.data.staffId)) {
        throw new Fail("forbidden");
      }
      // WP-73 (D-048): nya blixttider kräver Team+. Befintliga aktiva
      // blixttider ligger kvar efter en nedgradering (de går ut av sig själva).
      if (!planCan(await loadPlanIn(q, businessId), "flash")) {
        throw new Fail("plan_locked");
      }
      const free = await isFreeIn(q, {
        businessId,
        staffId: p.data.staffId,
        start,
        end,
        serviceIds: p.data.serviceIds,
      });
      if (free === "invalid_input") throw new Fail("invalid_input");
      if (!free) throw new Fail("not_free");
      try {
        const id = await savepoint(q, async () => {
          const r = await q.query<{ id: string }>(
            `insert into public.flash_slots
               (business_id, staff_id, service_ids, starts_at, ends_at,
                discount_pct, created_by)
             values ($1, $2, $3, $4, $5, $6, $7)
             returning id`,
            [
              businessId,
              p.data.staffId,
              p.data.serviceIds ? [...new Set(p.data.serviceIds)] : null,
              new Date(start).toISOString(),
              new Date(end).toISOString(),
              p.data.discountPct,
              userId,
            ],
          );
          return r.rows[0]!.id;
        });
        return { ok: true as const, id };
      } catch (e) {
        if (pgErrorCode(e) === "23P01") throw new Fail("overlap");
        throw e;
      }
    });
  } catch (e) {
    if (e instanceof Fail) return { ok: false, code: e.code };
    if (pgErrorCode(e) === "42501") return { ok: false, code: "forbidden" };
    throw e;
  }
}

export type CancelFlashSlotResult =
  | { ok: true }
  | { ok: false; code: "forbidden" | "not_found" | "invalid_input" };

/** `active → cancelled`. Idempotent (redan avbruten → ok). En bokad
 * flash-tid avbryts inte här (avboka bokningen i stället) → `not_found`. */
export async function cancelFlashSlot(
  userId: string,
  businessId: string,
  flashSlotId: string,
): Promise<CancelFlashSlotResult> {
  if (
    !uuid.safeParse(businessId).success ||
    !uuid.safeParse(flashSlotId).success
  ) {
    return { ok: false, code: "invalid_input" };
  }
  try {
    return await withOwnerTx(userId, async (q) => {
      const member = await actorMember(
        q,
        { kind: "owner", userId },
        businessId,
      );
      if (!member) return { ok: false as const, code: "not_found" as const };
      const r = await q.query<{ staff_id: string; status: string }>(
        `select staff_id, status::text as status from public.flash_slots
          where business_id = $1 and id = $2
          for update`,
        [businessId, flashSlotId],
      );
      const row = r.rows[0];
      if (!row) return { ok: false as const, code: "not_found" as const };
      if (!canManageStaffBookings(member, row.staff_id)) {
        return { ok: false as const, code: "forbidden" as const };
      }
      if (row.status === "cancelled") return { ok: true as const };
      if (row.status !== "active") {
        return { ok: false as const, code: "not_found" as const };
      }
      await q.query(
        `update public.flash_slots set status = 'cancelled'
          where business_id = $1 and id = $2 and status = 'active'`,
        [businessId, flashSlotId],
      );
      return { ok: true as const };
    });
  } catch (e) {
    if (pgErrorCode(e) === "42501") return { ok: false, code: "forbidden" };
    throw e;
  }
}

export type FlashSlotItem = {
  id: string;
  staffId: string;
  staffName: string;
  /** ISO UTC. */
  start: string;
  end: string;
  /** `null` = alla tjänster. */
  serviceIds: string[] | null;
  discountPct: number;
  status: "active" | "booked";
  bookingId: string | null;
};

/**
 * Ägarens lista (/app/flash, Agenda, Hoy): aktiva och bokade flash-tider
 * som inte är slut än (`ends_at > now`), i tidsordning.
 */
export async function listFlashSlots(
  userId: string,
  businessId: string,
  now: Date = systemClock(),
): Promise<FlashSlotItem[]> {
  if (!uuid.safeParse(businessId).success) return [];
  return withOwnerTx(userId, async (q) => {
    const r = await q.query<{
      id: string;
      staff_id: string;
      staff_name: string;
      s: number;
      e: number;
      service_ids: string[] | null;
      discount_pct: number;
      status: "active" | "booked";
      booking_id: string | null;
    }>(
      `select f.id, f.staff_id, st.name as staff_name,
              extract(epoch from f.starts_at)::float8 * 1000 as s,
              extract(epoch from f.ends_at)::float8 * 1000 as e,
              f.service_ids, f.discount_pct::int as discount_pct,
              f.status::text as status, f.booking_id
         from public.flash_slots f
         join public.staff st
           on st.business_id = f.business_id and st.id = f.staff_id
        where f.business_id = $1
          and f.status in ('active', 'booked')
          and f.ends_at > $2
        order by f.starts_at, f.id`,
      [businessId, now],
    );
    return r.rows.map((x) => ({
      id: x.id,
      staffId: x.staff_id,
      staffName: x.staff_name,
      start: new Date(Math.round(x.s)).toISOString(),
      end: new Date(Math.round(x.e)).toISOString(),
      serviceIds: x.service_ids,
      discountPct: x.discount_pct,
      status: x.status,
      bookingId: x.booking_id,
    }));
  });
}
