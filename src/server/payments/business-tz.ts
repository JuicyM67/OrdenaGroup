import "server-only";

import { APP_TZ, parseTimeZone, type TimeZone } from "@/lib/format/dates";
import type { Queryable } from "@/server/db/pool";

/**
 * WP-24: företagets tidszon (`businesses.timezone`), med installationens
 * `APP_TZ` som reserv om raden saknas eller värdet är ogiltigt. Dagar,
 * veckor och månader i kassan och "samma dag" för att ångra en betalning
 * räknas alltid i den här zonen, aldrig i UTC eller serverns zon.
 */
export async function loadBusinessTz(
  q: Queryable,
  businessId: string,
): Promise<TimeZone> {
  const r = await q.query<{ timezone: string }>(
    `select timezone from public.businesses where id = $1`,
    [businessId],
  );
  const raw = r.rows[0]?.timezone;
  if (!raw) return APP_TZ;
  const tz = parseTimeZone(raw);
  return tz.ok ? tz.value : APP_TZ;
}
