// WP-82 (D-067): parametrar för widgetarna. Samma schema används av /embed-sidorna
// (läser sökparametrar), av ägarens kodgenerator och av loadern (data-agenda-*).
import { z } from "zod";

/** Sorterna är spanska ord som ägaren känner igen; de är också sökvägen `/embed/<slug>/<sort>`. */
export const WIDGET_KINDS = ["resenas", "boton", "reserva"] as const;
export type WidgetKind = (typeof WIDGET_KINDS)[number];

export const WIDGET_THEMES = ["light", "dark"] as const;
export type WidgetTheme = (typeof WIDGET_THEMES)[number];

export const WIDGET_SIZES = ["small", "medium", "large"] as const;
export type WidgetSize = (typeof WIDGET_SIZES)[number];

/** Knapptexten väljs ur en fast lista (texterna ligger i `src/i18n/es-CL.widgets.ts`). */
export const WIDGET_BUTTON_LABELS = ["book", "book_now", "book_time"] as const;
export type WidgetButtonLabel = (typeof WIDGET_BUTTON_LABELS)[number];

/** Prefixet på platshållarens attribut (`data-agenda-widget`, `data-agenda-slug` …).
 * Varumärkesneutralt (regel 10): det är kundernas kod och låses i `v1`. */
export const WIDGET_ATTR_PREFIX = "data-agenda-" as const;

/** Samma format som `businesses_slug_format` (se onboarding/schemas.ts). */
export const WIDGET_SLUG_PATTERN = /^[a-z0-9]([a-z0-9-]{1,38}[a-z0-9])$/;

export const widgetParamsSchema = z.object({
  theme: z.enum(WIDGET_THEMES).catch("light"),
  size: z.enum(WIDGET_SIZES).catch("medium"),
  label: z.enum(WIDGET_BUTTON_LABELS).catch("book"),
});
export type WidgetParams = z.infer<typeof widgetParamsSchema>;

/** Okända eller ogiltiga värden faller tillbaka på standard, aldrig på fel. */
export function parseWidgetParams(
  raw: Record<string, string | string[] | undefined>,
): WidgetParams {
  const one = (v: string | string[] | undefined) =>
    Array.isArray(v) ? v[0] : v;
  return widgetParamsSchema.parse({
    theme: one(raw.theme),
    size: one(raw.size),
    label: one(raw.label),
  });
}

export function isWidgetKind(value: string): value is WidgetKind {
  return (WIDGET_KINDS as readonly string[]).includes(value);
}
