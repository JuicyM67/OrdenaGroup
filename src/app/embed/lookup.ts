// WP-82 (D-067): uppslag för reseñas- och knapp-widgetarna. Resultatet cachas i fem minuter
// (kundsajter kan ge mycket trafik). Sidorna läser `searchParams` och renderas därför per
// förfrågan; det är databasfrågorna som cachas, inte HTML:en.
import { unstable_cache } from "next/cache";

import { WIDGET_SLUG_PATTERN } from "@/lib/validation/widgets";
import { resolveBusinessBySlug } from "@/server/bookings/business";
import { withServiceTx } from "@/server/db/tx";
import { loadPublicReviewsIn } from "@/server/reviews/public";

export const WIDGET_REVALIDATE_SECONDS = 300;

export type WidgetRating =
  | { found: false }
  | { found: true; rating: { average: number; count: number } | null };

const cachedRating = unstable_cache(
  async (slug: string): Promise<WidgetRating> => {
    const business = await resolveBusinessBySlug(slug);
    if (!business) return { found: false };
    const reviews = await withServiceTx((q) =>
      loadPublicReviewsIn(q, business.id, 1),
    );
    return {
      found: true,
      rating: reviews
        ? { average: reviews.average, count: reviews.count }
        : null,
    };
  },
  ["widget-rating"],
  { revalidate: WIDGET_REVALIDATE_SECONDS },
);

const cachedExists = unstable_cache(
  async (slug: string): Promise<boolean> =>
    (await resolveBusinessBySlug(slug)) !== null,
  ["widget-business-exists"],
  { revalidate: WIDGET_REVALIDATE_SECONDS },
);

export async function loadWidgetRating(slug: string): Promise<WidgetRating> {
  if (!WIDGET_SLUG_PATTERN.test(slug)) return { found: false };
  return cachedRating(slug);
}

export async function widgetBusinessExists(slug: string): Promise<boolean> {
  if (!WIDGET_SLUG_PATTERN.test(slug)) return false;
  return cachedExists(slug);
}
