// WP-82 (D-067): reseñas-märket som iframe på företagets egen sida. Samma data som
// reseñas på /[slug] (dolda reseñas räknas inte), men bara snitt och antal.
// 0 reseñas: sidan renderar inget och säger till loadern att kollapsa platshållaren (D-045).
import { notFound } from "next/navigation";

import { RatingBadge } from "@/components/widgets/rating-badge";
import { WidgetEmpty } from "@/components/widgets/widget-empty";
import { WidgetSurface } from "@/components/widgets/widget-surface";
import { parseWidgetParams } from "@/lib/validation/widgets";

import { loadWidgetRating } from "../../lookup";

export default async function EmbedResenasPage({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const { slug } = await params;
  const { theme, size } = parseWidgetParams(await searchParams);
  const result = await loadWidgetRating(slug);
  if (!result.found) notFound();
  if (!result.rating) return <WidgetEmpty />;
  return (
    <WidgetSurface theme={theme}>
      <RatingBadge
        average={result.rating.average}
        count={result.rating.count}
        theme={theme}
        size={size}
        href={`/${slug}#resenas`}
      />
    </WidgetSurface>
  );
}
