import "server-only";

// Carteles (WP-95, D-079): företagets namn och logga till skyltarna. Loggan visas bara om
// den ligger i företagets egen mapp i vår bucket (samma filter som den publika sidan och
// `loadProfileSettings`), annars initialer.
import type { CartelBusiness } from "@/lib/share/carteles";
import { mediaPathFromUrl } from "@/server/bookings/media";
import { withOwnerTx } from "@/server/db/tx";

export function loadCartelBusiness(
  userId: string,
  businessId: string,
): Promise<CartelBusiness> {
  return withOwnerTx(userId, async (q) => {
    const r = await q.query<{ name: string; logo_url: string | null }>(
      `select name, logo_url from public.businesses where id = $1`,
      [businessId],
    );
    const row = r.rows[0];
    if (!row) throw new Error("loadCartelBusiness: företaget hittades inte");
    const logoUrl =
      row.logo_url && mediaPathFromUrl(row.logo_url, businessId) !== null
        ? row.logo_url
        : null;
    return { name: row.name, logoUrl };
  });
}
