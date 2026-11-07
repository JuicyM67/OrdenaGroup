// WP-82 (D-067): vad ägaren valt i fliken Widgets, och koden som ska klistras in på
// hemsidan. Valen sparas inte i databasen: de ligger i sidans tillstånd och i koden.
import {
  WIDGET_ATTR_PREFIX,
  type WidgetButtonLabel,
  type WidgetKind,
  type WidgetSize,
  type WidgetTheme,
} from "@/lib/validation/widgets";

export type WidgetConfig = {
  kind: WidgetKind;
  theme: WidgetTheme;
  size: WidgetSize;
  label: WidgetButtonLabel;
};

export const DEFAULT_WIDGET_CONFIG: WidgetConfig = {
  kind: "resenas",
  theme: "light",
  size: "medium",
  label: "book",
};

/** Storlek gäller reseñas och knapp; knapptext bara knappen. Bokningen fyller sin yta. */
export function widgetUsesSize(kind: WidgetKind): boolean {
  return kind !== "reserva";
}
export function widgetUsesLabel(kind: WidgetKind): boolean {
  return kind === "boton";
}

function attrs(slug: string, config: WidgetConfig): string[] {
  const a = WIDGET_ATTR_PREFIX;
  const out = [
    `${a}widget="${config.kind}"`,
    `${a}slug="${slug}"`,
    `${a}theme="${config.theme}"`,
  ];
  if (widgetUsesSize(config.kind)) out.push(`${a}size="${config.size}"`);
  if (widgetUsesLabel(config.kind)) out.push(`${a}label="${config.label}"`);
  return out;
}

/** Färdig HTML att klistra in. `origin` är appens adress (`siteOrigin()`, från
 * `NEXT_PUBLIC_APP_URL`), aldrig hårdkodad. */
export function buildWidgetCode(
  slug: string,
  config: WidgetConfig,
  origin: string,
): string {
  return [
    "<div",
    ...attrs(slug, config).map((a) => `  ${a}`),
    "></div>",
    `<script async src="${origin}/widget/v1.js"></script>`,
  ].join("\n");
}

/** Sökvägen som förhandsvisningen (och loadern) ramar in, relativt appens egen adress. */
export function widgetEmbedPath(slug: string, config: WidgetConfig): string {
  const params = new URLSearchParams({ theme: config.theme });
  if (widgetUsesSize(config.kind)) params.set("size", config.size);
  if (widgetUsesLabel(config.kind)) params.set("label", config.label);
  return `/embed/${slug}/${config.kind}?${params.toString()}`;
}
