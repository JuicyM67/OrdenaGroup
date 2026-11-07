// WP-82 (D-067): kontraktet mellan widget-iframen (våra /embed-sidor) och loadern
// (`/widget/v1.js`) som körs på företagets egen sida. Delas av båda sidor.
//
// Iframen skickar `postMessage(msg, "*")` uppåt (den vet inte kundens ursprung);
// loadern tar bara emot meddelanden från vårt eget ursprung och bara från de
// iframes den själv skapat. Meddelandena innehåller aldrig personuppgifter eller
// adresser.
import { z } from "zod";

/** Namnet på avsändaren i varje meddelande. */
export const WIDGET_MESSAGE_SOURCE = "agenda-widget" as const;

/** Version av protokollet, ökas vid brytande ändring (loadern ligger på /widget/v1.js). */
export const WIDGET_PROTOCOL_VERSION = 1 as const;

export const widgetMessageSchema = z.discriminatedUnion("type", [
  /** Iframen har ny innehållshöjd (px). */
  z.object({
    source: z.literal(WIDGET_MESSAGE_SOURCE),
    type: z.literal("resize"),
    height: z.number().int().min(0).max(10_000),
  }),
  /** Reseñas-widgeten har inget att visa (0 reseñas): platshållaren kollapsar. */
  z.object({
    source: z.literal(WIDGET_MESSAGE_SOURCE),
    type: z.literal("empty"),
  }),
  /** Knappen klickades: loadern öppnar dialogen med bokningen. */
  z.object({
    source: z.literal(WIDGET_MESSAGE_SOURCE),
    type: z.literal("open-booking"),
  }),
  /** Bokningen i dialogen vill stängas. */
  z.object({
    source: z.literal(WIDGET_MESSAGE_SOURCE),
    type: z.literal("close"),
  }),
]);

export type WidgetMessage = z.infer<typeof widgetMessageSchema>;

/** Skickar ett meddelande från en widget-iframe till sidan som bäddar in den. */
export function postWidgetMessage(message: WidgetMessage): void {
  if (typeof window === "undefined" || window.parent === window) return;
  window.parent.postMessage(message, "*");
}
