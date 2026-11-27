import "server-only";

// WP-98c (D-083): ägaren bekräftar företagets position på kartan i Ajustes →
// Tu negocio. Geokodningen (OSM, D-055) hittar ofta bara gatan i Chile, inte
// husnumret, så pricken kan hamna på fel del av en lång gata. En bekräftad
// position sparas med `geocode_status = 'manual'`: svepet rör den inte, och
// vägbeskrivningen på bokningssidan använder koordinaten. Ändrad adress ⇒
// `pending` igen (triggern `businesses_geo_on_address_change`).
//
// `authenticated` har ingen skrivgrant på lat/lng (D-055): behörigheten
// kontrolleras i ägarens transaktion, skrivningen görs sedan av servern.
import { z } from "zod";

import { withOwnerTx, withServiceTx } from "@/server/db/tx";

import { authzCode, requireMemberPerm } from "./member";

export type BusinessLocationStatus = "pending" | "ok" | "not_found" | "manual";

export type BusinessLocation = {
  address: string | null;
  comuna: string;
  geo: { lat: number; lng: number } | null;
  status: BusinessLocationStatus;
};

export async function loadBusinessLocation(
  userId: string,
  businessId: string,
): Promise<BusinessLocation> {
  return withOwnerTx(userId, async (q) => {
    await requireMemberPerm(q, userId, businessId, "can_edit_settings");
    const r = await q.query<{
      address: string | null;
      comuna: string;
      lat: string | null;
      lng: string | null;
      geocode_status: string;
    }>(
      `select address, comuna, lat::text as lat, lng::text as lng, geocode_status
         from public.businesses where id = $1`,
      [businessId],
    );
    const b = r.rows[0];
    if (!b) throw new Error("loadBusinessLocation: företaget hittades inte");
    const status = (["pending", "ok", "not_found", "manual"] as const).find(
      (s) => s === b.geocode_status,
    );
    return {
      address: b.address,
      comuna: b.comuna,
      geo:
        b.lat !== null && b.lng !== null
          ? { lat: Number(b.lat), lng: Number(b.lng) }
          : null,
      status: status ?? "pending",
    };
  });
}

/** Chiles fastland och öar (grovt) — ett fel klick ska inte hamna i havet. */
const locationInputSchema = z.object({
  lat: z.number().finite().min(-56).max(-17),
  lng: z.number().finite().min(-110).max(-66),
});

export type SaveLocationResult = { ok: true } | { ok: false; code: string };

export async function saveBusinessLocation(
  userId: string,
  businessId: string,
  rawInput: unknown,
): Promise<SaveLocationResult> {
  const parsed = locationInputSchema.safeParse(rawInput);
  if (!parsed.success) return { ok: false, code: "location.invalid" };
  const lat = Math.round(parsed.data.lat * 1e5) / 1e5;
  const lng = Math.round(parsed.data.lng * 1e5) / 1e5;
  try {
    await withOwnerTx(userId, (q) =>
      requireMemberPerm(q, userId, businessId, "can_edit_settings"),
    );
  } catch (e) {
    const code = authzCode(e);
    if (code) return { ok: false, code };
    throw e;
  }
  const r = await withServiceTx((q) =>
    q.query(
      `update public.businesses
          set lat = $2, lng = $3, geocode_status = 'manual', geocoded_at = now()
        where id = $1 and address is not null`,
      [businessId, lat, lng],
    ),
  );
  if (r.rowCount !== 1) return { ok: false, code: "location.no_address" };
  return { ok: true };
}
