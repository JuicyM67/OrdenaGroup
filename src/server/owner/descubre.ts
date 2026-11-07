import "server-only";

// Ajustes → Tu negocio → "Descubre" (WP-85, D-070): synlighet, bransch (=
// huvudkategori) och bekräftade extra kategorier. Förslagen räknas fram ur
// tjänsternas och tjänstegruppernas namn (`suggestCategories`) och gäller först när
// ägaren sparat. Allt via `withOwnerTx` (RLS + kolumngrants) och
// `can_edit_settings`, som övriga företagsinställningar.
import { z } from "zod";

import {
  ALL_MARKETPLACE_CATEGORY_IDS,
  categoryForRubro,
  isMarketplaceCategoryId,
  MARKETPLACE_CATEGORY_IDS,
  MARKETPLACE_EXTRA_CATEGORIES_MAX,
  type MarketplaceCategoryId,
} from "@/config/marketplace";
import { RUBRO_KEYS, type RubroKey } from "@/config/rubros";
import { suggestCategories } from "@/config/treatments";
import type { Queryable } from "@/server/db/pool";
import { withOwnerTx } from "@/server/db/tx";
import {
  missingForMarketplace,
  type MissingPart,
} from "@/server/marketplace/completeness";

import { mapDbError, type MutationResult } from "./ajustes";
import { requireMemberPerm } from "./member";

export type DescubreSettings = {
  rubro: RubroKey;
  mainCategory: MarketplaceCategoryId;
  listed: boolean;
  /** Plattformen har dolt företaget (testkonto). Ägaren kan inte ändra det. */
  hidden: boolean;
  /** Det som är förbockat när sidan öppnas: sparade extra kategorier, eller
   * förslagen om ägaren aldrig har sparat (`reviewed = false`). */
  extraCategories: MarketplaceCategoryId[];
  /** Kategorierna som tjänsterna pekar på (märks "Förslag" i UI:t). */
  suggested: MarketplaceCategoryId[];
  reviewed: boolean;
  missing: MissingPart[];
};

type Row = {
  category: string;
  marketplace_listed: boolean;
  marketplace_hidden: boolean;
  marketplace_extra_categories: string[];
  marketplace_categories_reviewed_at: Date | null;
  serves_at_customer: boolean;
  logo_url: string | null;
  cover_url: string | null;
  address: string | null;
  service_area_count: number;
  active_service_count: number;
};

function toRubro(category: string): RubroKey {
  return (RUBRO_KEYS as readonly string[]).includes(category)
    ? (category as RubroKey)
    : "otro";
}

async function loadIn(
  q: Queryable,
  businessId: string,
): Promise<DescubreSettings> {
  const r = await q.query<Row>(
    `select b.category, b.marketplace_listed, b.marketplace_hidden,
            b.marketplace_extra_categories, b.marketplace_categories_reviewed_at,
            b.serves_at_customer, b.logo_url, b.cover_url, b.address,
            (select count(*)::int from public.business_service_areas a
              where a.business_id = b.id) as service_area_count,
            (select count(*)::int from public.services s
              where s.business_id = b.id and s.active) as active_service_count
       from public.businesses b
      where b.id = $1`,
    [businessId],
  );
  const b = r.rows[0];
  if (!b) throw new Error("loadDescubreSettings: företaget hittades inte");

  const texts = await q.query<{ name: string }>(
    `select name from public.services where business_id = $1 and active
      union all
     select name from public.service_categories where business_id = $1`,
    [businessId],
  );

  const rubro = toRubro(b.category);
  const mainCategory = categoryForRubro(rubro);
  const suggested = suggestCategories(
    texts.rows.map((t) => t.name),
    mainCategory,
    MARKETPLACE_CATEGORY_IDS,
  ).slice(0, MARKETPLACE_EXTRA_CATEGORIES_MAX);
  const reviewed = b.marketplace_categories_reviewed_at !== null;
  const saved = b.marketplace_extra_categories.filter(isMarketplaceCategoryId);

  return {
    rubro,
    mainCategory,
    listed: b.marketplace_listed,
    hidden: b.marketplace_hidden,
    extraCategories: reviewed ? saved : suggested,
    suggested,
    reviewed,
    missing: missingForMarketplace({
      logoUrl: b.logo_url,
      coverUrl: b.cover_url,
      address: b.address,
      servesAtCustomer: b.serves_at_customer,
      serviceAreaCount: b.service_area_count,
      activeServiceCount: b.active_service_count,
    }),
  };
}

export function loadDescubreSettings(
  userId: string,
  businessId: string,
): Promise<DescubreSettings> {
  return withOwnerTx(userId, (q) => loadIn(q, businessId));
}

export const descubreSettingsInputSchema = z.object({
  listed: z.boolean(),
  rubro: z.enum(RUBRO_KEYS, { error: "business.category_invalid" }),
  extraCategories: z
    .array(z.enum(ALL_MARKETPLACE_CATEGORY_IDS as [MarketplaceCategoryId]))
    .max(MARKETPLACE_EXTRA_CATEGORIES_MAX + 1, {
      error: "descubre.too_many_categories",
    }),
});

/** Sparar synlighet, bransch och extra kategorier. Huvudkategorin och `ovrigt`
 * filtreras bort ur de extra (de gäller ändå / betyder inget som extra), och
 * granskningstiden sätts så att förslagen inte förbockas igen. */
export async function updateDescubreSettings(
  userId: string,
  businessId: string,
  rawInput: unknown,
): Promise<MutationResult> {
  const parsed = descubreSettingsInputSchema.safeParse(rawInput);
  if (!parsed.success) {
    return {
      ok: false,
      code: parsed.error.issues[0]?.message ?? "invalid_input",
    };
  }
  const { listed, rubro, extraCategories } = parsed.data;
  const main = categoryForRubro(rubro);
  const extras = [...new Set(extraCategories)].filter(
    (id) => id !== main && id !== "ovrigt",
  );
  if (extras.length > MARKETPLACE_EXTRA_CATEGORIES_MAX) {
    return { ok: false, code: "descubre.too_many_categories" };
  }
  try {
    return await withOwnerTx(userId, async (q) => {
      await requireMemberPerm(q, userId, businessId, "can_edit_settings");
      const r = await q.query(
        `update public.businesses
            set marketplace_listed = $2,
                category = $3,
                marketplace_extra_categories = $4,
                marketplace_categories_reviewed_at = now()
          where id = $1`,
        [businessId, listed, rubro, extras],
      );
      return r.rowCount ? { ok: true } : { ok: false, code: "unauthorized" };
    });
  } catch (e) {
    return { ok: false, code: mapDbError(e) };
  }
}
