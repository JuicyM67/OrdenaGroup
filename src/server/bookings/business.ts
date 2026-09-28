/**
 * Sluggen → företagets id (WP-20). Den enda `businesses`-frågan som filtrerar
 * på `slug` i stället för `id`/`business_id`: `server/boundaries.test.ts` har
 * ett uttryckligt, namngivet undantag för just den här filen (den kan inte
 * filtrera på sin egen primärnyckel — den är precis det uppslagningen letar
 * upp). Efter uppslagningen är `id` den betrodda `businessId` som all vidare
 * kod (`src/server/scheduling`, `src/server/bookings`) filtrerar på.
 *
 * `cache()` (React, per request) gör att `generateMetadata` och sidan
 * (`page.tsx`) delar samma anrop i stället för att slå upp sluggen två
 * gånger, och att en server-action-closure kan anropa den igen utan en
 * extra medveten fråga.
 */
import "server-only";

import { cache } from "react";

import { withServiceTx } from "@/server/db/tx";

export type SlugBusiness = {
  readonly id: string;
  readonly slug: string;
  readonly name: string;
};

export const resolveBusinessBySlug = cache(
  async (slug: string): Promise<SlugBusiness | null> => {
    return withServiceTx(async (q) => {
      const r = await q.query<{ id: string; name: string }>(
        `select id, name from public.businesses where slug = $1`,
        [slug],
      );
      const row = r.rows[0];
      return row ? { id: row.id, slug, name: row.name } : null;
    });
  },
);
