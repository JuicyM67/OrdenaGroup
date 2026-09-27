import "server-only";

import type { Actor } from "../types";

/**
 * Bara för tester: delar ett platt testobjekt i formulärdata (request) och
 * serverns betrodda kontext (`businessId`, `actor`, `now`, ev. `source:
 * "waitlist"`). "web"/"manual" sätts av motorn och tas bort här.
 */
export function split(
  x: Record<string, unknown> & {
    businessId: string;
    actor: Actor;
    now: Date;
    source?: string;
  },
): [never, never] {
  const { businessId, actor, now, source, ...request } = x;
  const ctx = {
    businessId,
    actor,
    now,
    ...(source === "waitlist" ? { source } : {}),
  };
  return [request as never, ctx as never];
}
