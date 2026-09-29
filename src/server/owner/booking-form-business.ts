import "server-only";

/**
 * Läser `businesses.category` (rubro, satt vid onboarding) för att välja
 * vilka branschförslag (WP-40, D-031) ägaren ska se i "Bokningsformulär"
 * (vy A) och i tjänstens "Frågor vid bokning" (vy B). Egen fil i stället för
 * att utöka `src/server/owner/ajustes.ts` (ägs av ett annat arbetspaket) —
 * samma mönster som `src/server/onboarding/owner-business.ts`.
 */
import { withOwnerTx } from "@/server/db/tx";

export async function getOwnerBusinessCategory(
  userId: string,
  businessId: string,
): Promise<string | null> {
  return withOwnerTx(userId, async (q) => {
    const r = await q.query<{ category: string | null }>(
      `select category from public.businesses where id = $1`,
      [businessId],
    );
    return r.rows[0]?.category ?? null;
  });
}
