import "server-only";

import {
  hasPerm,
  loadMember,
  PermissionDeniedError,
  requirePerm,
  type Member,
} from "@/server/db/permissions";
import type { Queryable } from "@/server/db/pool";
import type { Actor, BookingStatus } from "@/server/scheduling/types";

/**
 * WP-46 steg 3: behörighet för bokningsflödena (create/move/cancel/confirm/
 * decline) när aktören är en inloggad medlem (`actor.kind === "owner"`, som
 * numera betyder "verifierad session i företaget": ägare ELLER personal).
 * Kunden (`kind: "customer"`) auktoriseras av sin token och berörs inte.
 *
 * Samma regler som RLS och triggern (20260930150100_permissions_rls.sql),
 * så att UI:t får `forbidden` i stället för ett infrastrukturfel:
 * - Röra en bokning (flytta, bekräfta, markera ankomst, skapa):
 *   `can_manage_all_bookings`, eller `can_manage_own_bookings` och
 *   `staff_id` = den egna personalraden — för både gammal OCH ny
 *   profesional (policyns `using` och `with check`).
 * - Status → `cancelled`: från `requested` (neka) räcker regeln ovan
 *   (triggern godtar även `can_cancel_bookings`, men RLS kräver ändå
 *   skrivrätt på raden); från `confirmed`/`pending_payment` (avboka) krävs
 *   dessutom `can_cancel_bookings`.
 * - `owner` har alltid allt (`hasPerm`).
 * Databasen har sista ordet: en 42501 som ändå kommer igenom blir
 * `forbidden` via `runAs({ onForbidden })`.
 */

/** `undefined` = kunden (ingen medlemskontroll); `null` = inte medlem. */
export async function actorMember(
  q: Queryable,
  actor: Actor,
  businessId: string,
): Promise<Member | null | undefined> {
  if (actor.kind !== "owner") return undefined;
  return loadMember(q, actor.userId, businessId);
}

/** Får medlemmen röra bokningar på den här profesionalen? */
export function canManageStaffBookings(
  member: Member | null,
  staffId: string,
): boolean {
  return (
    hasPerm(member, "can_manage_all_bookings") ||
    hasPerm(member, "can_manage_own_bookings", { staffId })
  );
}

export type BookingAction =
  | { kind: "manage"; staffId: string; newStaffId?: string | undefined }
  | { kind: "cancel"; staffId: string; status: BookingStatus };

/**
 * Kastar `PermissionDeniedError` om medlemmen inte får utföra `action`.
 * `member === undefined` (kund) passerar alltid.
 */
export function requireBookingPerm(
  member: Member | null | undefined,
  action: BookingAction,
): void {
  if (member === undefined) return;
  const own = { staffId: action.staffId };
  if (!canManageStaffBookings(member, action.staffId)) {
    requirePerm(member, "can_manage_own_bookings", own);
  }
  if (
    action.kind === "manage" &&
    action.newStaffId !== undefined &&
    !canManageStaffBookings(member, action.newStaffId)
  ) {
    requirePerm(member, "can_manage_own_bookings", {
      staffId: action.newStaffId,
    });
  }
  if (action.kind === "cancel" && action.status !== "requested") {
    requirePerm(member, "can_cancel_bookings");
  }
}

/** Som `requireBookingPerm`, men returnerar `false` i stället för att kasta. */
export function bookingPermOk(
  member: Member | null | undefined,
  action: BookingAction,
): boolean {
  try {
    requireBookingPerm(member, action);
    return true;
  } catch (e) {
    if (e instanceof PermissionDeniedError) return false;
    throw e;
  }
}

/**
 * RLS (`for update` kräver skrivrätt) gör att `lockBooking` inte ser en
 * bokning som personalen bara får LÄSA. Syns den med en vanlig select
 * (hela kalendern) är svaret `forbidden`, annars `not_found`.
 */
export async function visibleButLocked(
  q: Queryable,
  businessId: string,
  bookingId: string,
): Promise<boolean> {
  const r = await q.query(
    `select 1 from public.bookings where business_id = $1 and id = $2`,
    [businessId, bookingId],
  );
  return r.rows.length > 0;
}
