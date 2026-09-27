import "server-only";

import { eachLocalDate, type LocalDate } from "@/lib/format/dates";
import type { Queryable } from "@/server/db/pool";

import { dayStatus, eligibleStaff, slotsForDay } from "./core/slots";
import { loadSnapshot, type LoadedSnapshot } from "./load";
import { err, ok, type Result } from "./result";
import { runAs } from "./run";
import {
  availableDaysInputSchema,
  availableSlotsInputSchema,
  type AvailableDaysInput,
  type AvailableSlotsInput,
} from "./schemas";
import type {
  Audience,
  AvailableDay,
  AvailableSlot,
  StaffChoice,
} from "./types";

export type AvailabilityError = "invalid_input" | "service_not_offered";

/** Standardgräns för kundens tider per dag (SCHEDULING.md, R8). */
export const CUSTOMER_SLOT_LIMIT = 12;

/** Profesionalen måste finnas, vara aktiv och utföra tjänsten (för "any": minst en). */
export function staffOffersService(
  loaded: LoadedSnapshot,
  staff: StaffChoice,
): boolean {
  return eligibleStaff(loaded.snapshot, staff).length > 0;
}

export async function availableDaysIn(
  q: Queryable,
  input: {
    businessId: string;
    serviceId: string;
    staffId: StaffChoice;
    from: LocalDate;
    to: LocalDate;
    audience: Audience;
    now: Date;
  },
): Promise<Result<AvailableDay[], "service_not_offered">> {
  const loaded = await loadSnapshot(q, {
    businessId: input.businessId,
    serviceId: input.serviceId,
    range: { from: input.from, to: input.to },
  });
  if (!loaded.ok) return loaded;
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
  input: {
    businessId: string;
    serviceId: string;
    staffId: StaffChoice;
    date: LocalDate;
    audience: Audience;
    now: Date;
    limit?: number | undefined;
  },
): Promise<Result<AvailableSlot[], "service_not_offered">> {
  const loaded = await loadSnapshot(q, {
    businessId: input.businessId,
    serviceId: input.serviceId,
    range: { from: input.date, to: input.date },
  });
  if (!loaded.ok) return loaded;
  if (!staffOffersService(loaded.value, input.staffId)) {
    return err("service_not_offered");
  }
  const limit =
    input.limit ??
    (input.audience === "customer" ? CUSTOMER_SLOT_LIMIT : undefined);
  return ok(
    slotsForDay(
      {
        snapshot: loaded.value.snapshot,
        date: input.date,
        staff: input.staffId,
        audience: input.audience,
        now: input.now,
      },
      limit,
    ),
  );
}

/**
 * Dagstatus för [from, to] (högst 62 dagar). Kund: service role med explicit
 * business_id. Ägare: RLS via withOwnerTx.
 */
export async function getAvailableDays(
  raw: AvailableDaysInput,
): Promise<Result<AvailableDay[], AvailabilityError>> {
  const p = availableDaysInputSchema.safeParse(raw);
  if (!p.success) return err("invalid_input");
  const input = p.data;
  return runAs(input.actor, (q) => availableDaysIn(q, input));
}

/** Tider för en dag. Kund: högst 12 (gallrade). Ägare: alla. */
export async function getAvailableSlots(
  raw: AvailableSlotsInput,
): Promise<Result<AvailableSlot[], AvailabilityError>> {
  const p = availableSlotsInputSchema.safeParse(raw);
  if (!p.success) return err("invalid_input");
  const input = p.data;
  return runAs(input.actor, (q) => availableSlotsIn(q, input));
}
