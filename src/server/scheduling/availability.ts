import "server-only";

import { eachLocalDate, type LocalDate } from "@/lib/format/dates";
import type { Queryable } from "@/server/db/pool";

import { dayStatus, eligibleStaff, slotsForDay } from "./core/slots";
import { loadSnapshot, type LoadedSnapshot } from "./load";
import { err, ok, type Result } from "./result";
import { runAs } from "./run";
import {
  availableDaysRequestSchema,
  availableSlotsRequestSchema,
  engineContextSchema,
  parseContext,
  type AvailableDaysRequest,
  type AvailableSlotsRequest,
  type EngineContext,
} from "./schemas";
import type {
  Audience,
  AvailableDay,
  AvailableSlot,
  StaffChoice,
} from "./types";

export type AvailabilityError =
  "invalid_input" | "service_not_offered" | "business_unavailable";

/** Fast gräns för kundens tider per dag (SCHEDULING.md, R8). Ägaren ser alla. */
export const CUSTOMER_SLOT_LIMIT = 12;

/** Profesionalen måste finnas, vara aktiv och utföra tjänsten (för "any": minst en). */
export function staffOffersService(
  loaded: LoadedSnapshot,
  staff: StaffChoice,
): boolean {
  return eligibleStaff(loaded.snapshot, staff).length > 0;
}

type Common = {
  businessId: string;
  serviceId: string;
  staffId: StaffChoice;
  audience: Audience;
  now: Date;
};

/** Inre steg (för tester och createBooking): kör i anroparens transaktion. */
export async function availableDaysIn(
  q: Queryable,
  input: Common & { from: LocalDate; to: LocalDate },
): Promise<
  Result<AvailableDay[], "service_not_offered" | "business_unavailable">
> {
  const loaded = await loadSnapshot(q, {
    businessId: input.businessId,
    serviceId: input.serviceId,
    range: { from: input.from, to: input.to },
  });
  if (!loaded.ok) return loaded;
  if (input.audience === "customer" && !loaded.value.businessActive) {
    return err("business_unavailable");
  }
  if (!staffOffersService(loaded.value, input.staffId)) {
    return err("service_not_offered");
  }
  return ok(
    eachLocalDate(input.from, input.to).map((date) => ({
      date,
      status: dayStatus({
        snapshot: loaded.value.snapshot,
        date,
        staff: input.staffId,
        audience: input.audience,
        now: input.now,
      }),
      hasFlash: false as const,
    })),
  );
}

export async function availableSlotsIn(
  q: Queryable,
  input: Common & { date: LocalDate },
): Promise<
  Result<AvailableSlot[], "service_not_offered" | "business_unavailable">
> {
  const loaded = await loadSnapshot(q, {
    businessId: input.businessId,
    serviceId: input.serviceId,
    range: { from: input.date, to: input.date },
  });
  if (!loaded.ok) return loaded;
  if (input.audience === "customer" && !loaded.value.businessActive) {
    return err("business_unavailable");
  }
  if (!staffOffersService(loaded.value, input.staffId)) {
    return err("service_not_offered");
  }
  return ok(
    slotsForDay(
      {
        snapshot: loaded.value.snapshot,
        date: input.date,
        staff: input.staffId,
        audience: input.audience,
        now: input.now,
      },
      input.audience === "customer" ? CUSTOMER_SLOT_LIMIT : undefined,
    ),
  );
}

/**
 * Dagstatus för [from, to] (högst 62 dagar). `ctx` sätts bara av servern
 * (se schemas.ts). Kund: service role med explicit business_id, kundvy.
 * Ägare: RLS via withOwnerTx, ägarvy.
 */
export async function getAvailableDays(
  request: AvailableDaysRequest,
  ctx: EngineContext,
): Promise<Result<AvailableDay[], AvailabilityError>> {
  const c = parseContext(engineContextSchema, ctx);
  const p = availableDaysRequestSchema.safeParse(request);
  if (!p.success) return err("invalid_input");
  return runAs(c.actor, (q) =>
    availableDaysIn(q, {
      ...p.data,
      businessId: c.businessId,
      audience: c.actor.kind,
      now: c.now,
    }),
  );
}

/** Tider för en dag. Kund: högst 12 (gallrade). Ägare: alla. */
export async function getAvailableSlots(
  request: AvailableSlotsRequest,
  ctx: EngineContext,
): Promise<Result<AvailableSlot[], AvailabilityError>> {
  const c = parseContext(engineContextSchema, ctx);
  const p = availableSlotsRequestSchema.safeParse(request);
  if (!p.success) return err("invalid_input");
  return runAs(c.actor, (q) =>
    availableSlotsIn(q, {
      ...p.data,
      businessId: c.businessId,
      audience: c.actor.kind,
      now: c.now,
    }),
  );
}
