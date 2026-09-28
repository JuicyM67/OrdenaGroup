import "server-only";

/**
 * Har ägaren redan ett företag? (WP-15: styr /app och /app/onboardings redirect-logik).
 * Går via `withOwnerTx` (D-019), inte `@supabase/ssr` — den klienten är bara för auth.
 * RLS (`private.is_member`) begränsar redan `memberships` till den inloggade
 * användarens egna rader, så ingen extra `user_id`-filtrering behövs här.
 */
import { withOwnerTx } from "@/server/db/tx";

export type OwnerBusiness = { id: string; slug: string };

export async function getOwnerBusiness(
  userId: string,
): Promise<OwnerBusiness | null> {
  return withOwnerTx(userId, async (q) => {
    const r = await q.query<{ id: string; slug: string }>(
      `select b.id, b.slug
       from public.memberships m
       join public.businesses b on b.id = m.business_id
       limit 1`,
    );
    const row = r.rows[0];
    return row ? { id: row.id, slug: row.slug } : null;
  });
}
