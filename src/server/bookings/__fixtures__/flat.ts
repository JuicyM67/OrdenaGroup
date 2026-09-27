import "server-only";

import { adminQuery } from "@/server/db/testing";
import { split } from "@/server/scheduling/__fixtures__/contract";
import type { Actor } from "@/server/scheduling/types";

import { cancelBooking as realCancel } from "../cancel";
import { createBooking as realCreate } from "../create";
import { moveBooking as realMove } from "../move";
import { createManageToken } from "../token";

/**
 * Bara för tester: platta anrop (request + kontext i ett objekt) till det
 * riktiga kontraktet. För kund översätts `bookingId` till bokningens token
 * (kundvägen tar bara token). Bokningar utan känd token (råa inserts) får
 * en ny token satt som `postgres`.
 */

type Flat = Record<string, unknown> & {
  businessId: string;
  actor: Actor;
  now: Date;
};

const tokens = new Map<string, string>();

export async function createBooking(flat: Flat) {
  const r = await realCreate(...split(flat));
  if (r.ok) tokens.set(r.value.id, r.value.manageToken);
  return r;
}

async function tokenFor(bookingId: string): Promise<string> {
  const known = tokens.get(bookingId);
  if (known) return known;
  const { token, hash } = createManageToken();
  await adminQuery(
    "update public.bookings set manage_token_hash = $2 where id = $1",
    [bookingId, hash],
  );
  tokens.set(bookingId, token);
  return token;
}

async function toRequest(flat: Flat): Promise<Flat> {
  const { by: _by, ...rest } = flat;
  void _by;
  if (flat.actor.kind !== "customer" || typeof rest.bookingId !== "string") {
    return rest as Flat;
  }
  const { bookingId, ...withoutId } = rest;
  return {
    ...withoutId,
    manageToken: await tokenFor(bookingId as string),
  } as Flat;
}

export async function moveBooking(flat: Flat) {
  return realMove(...split(await toRequest(flat)));
}

export async function cancelBooking(flat: Flat) {
  return realCancel(...split(await toRequest(flat)));
}
