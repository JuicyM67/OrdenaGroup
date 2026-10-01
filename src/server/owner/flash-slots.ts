import "server-only";

/**
 * WP-30-UI (ui-engineer): tunn brygga mellan `FlashSlotDialog`
 * (`src/components/flash/`, `date`+`time`+`lengthMinutes`/`serviceIds`) och
 * den riktiga `createFlashSlot` (scheduling-engineer, `src/server/flash/`,
 * som vill ha färdiga `start`/`end`-instanter). Räknar bara om "längd eller
 * tjänster" → ett tidsfönster — motorn (`createFlashSlot`) är den enda
 * källan till om fönstret faktiskt är ledigt.
 *
 * `requireBookingPerm` (WP-46-mönstret, `src/server/bookings/authz.ts`)
 * körs HÄR också, inte bara i motorn: försvar i djupet (D-014), och det är
 * det som gör den här bryggan till en "vaktad mutation" för
 * `boundaries.test.ts` (samma mönster som övriga `src/server/owner/*`).
 */
import type {
  CreateFlashResult,
  CreateFlashSlotInput as ClientCreateFlashSlotInput,
} from "@/components/flash/types";
import { fromLocal, APP_TZ } from "@/lib/format/dates";
import { requireBookingPerm } from "@/server/bookings/authz";
import { loadMember, PermissionDeniedError } from "@/server/db/permissions";
import { withOwnerTx } from "@/server/db/tx";
import { createFlashSlot as createFlashSlotEngine } from "@/server/flash";

async function longestDurationMin(
  userId: string,
  businessId: string,
  serviceIds: readonly string[],
): Promise<number | null> {
  return withOwnerTx(userId, async (q) => {
    const r = await q.query<{ duration_min: number }>(
      `select duration_min from public.services
        where business_id = $1 and id = any($2::uuid[])`,
      [businessId, serviceIds],
    );
    if (r.rows.length === 0) return null;
    return Math.max(...r.rows.map((row) => row.duration_min));
  });
}

export async function createFlashSlotFromDialog(
  userId: string,
  businessId: string,
  input: ClientCreateFlashSlotInput,
): Promise<CreateFlashResult> {
  try {
    await withOwnerTx(userId, async (q) => {
      const member = await loadMember(q, userId, businessId);
      requireBookingPerm(member, { kind: "manage", staffId: input.staffId });
    });
  } catch (e) {
    if (e instanceof PermissionDeniedError) {
      return { ok: false, code: "forbidden" };
    }
    throw e;
  }

  let lengthMin = input.lengthMinutes;
  let serviceIds: string[] | null = null;
  if (input.serviceIds) {
    serviceIds = input.serviceIds;
    lengthMin =
      (await longestDurationMin(userId, businessId, serviceIds)) ?? undefined;
  }
  if (!lengthMin || lengthMin <= 0) {
    return { ok: false, code: "invalid_input" };
  }
  const start = fromLocal(input.date, input.time, APP_TZ);
  const end = new Date(start.getTime() + lengthMin * 60_000);
  return createFlashSlotEngine(userId, businessId, {
    staffId: input.staffId,
    start: start.toISOString(),
    end: end.toISOString(),
    serviceIds,
    discountPct: input.discountPct,
  });
}
