// WP-82 (D-067): knappen "Reservar" som iframe på företagets egen sida. Klicket öppnar
// bokningen i en dialog (loadern); öppnad direkt går knappen till bokningssidan.
import { notFound } from "next/navigation";

import { BookWidgetButton } from "@/components/widgets/book-widget-button";
import { WidgetSurface } from "@/components/widgets/widget-surface";
import { parseWidgetParams } from "@/lib/validation/widgets";

import { widgetBusinessExists } from "../../lookup";

export default async function EmbedBotonPage({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const { slug } = await params;
  const { theme, size, label } = parseWidgetParams(await searchParams);
  if (!(await widgetBusinessExists(slug))) notFound();
  return (
    <WidgetSurface theme={theme}>
      <BookWidgetButton slug={slug} label={label} theme={theme} size={size} />
    </WidgetSurface>
  );
}
