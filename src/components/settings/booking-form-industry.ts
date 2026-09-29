// Branschförslag för formuläret (WP-40 steg 6–7, D-031): väljer förslagslistan
// utifrån installationens marknad, samma sätt som `presetsFor` i
// `src/server/owner/booking-questions.ts` — det finns ingen `i18n-locale`-alias
// för presets (de är produktdata, inte UI-text), så filen väljs manuellt här
// precis som på serversidan.
import { market } from "@/config/brand";
import * as presetsEs from "@/i18n/presets/booking-questions.es-CL";
import * as presetsSv from "@/i18n/presets/booking-questions.sv-SE";

export type BookingQuestionIndustry = presetsEs.BookingQuestionIndustry;
export type BookingQuestionPreset = presetsEs.BookingQuestionPreset;

const PRESETS =
  market === "SE"
    ? presetsSv.BOOKING_QUESTION_PRESETS
    : presetsEs.BOOKING_QUESTION_PRESETS;
const LABELS =
  market === "SE"
    ? presetsSv.BOOKING_QUESTION_INDUSTRY_LABELS
    : presetsEs.BOOKING_QUESTION_INDUSTRY_LABELS;

/** `businesses.category` (rubro, `negocio.rubros`/`RUBRO_KEYS`) → rubro de
 * sugerencias de preguntas (`BookingQuestionIndustry`). No son los mismos
 * códigos (ver la nota en `booking-questions.es-CL.ts`): "otro" y los rubros
 * sin sugerencias propias dan `null`. */
const RUBRO_TO_INDUSTRY: Readonly<
  Record<string, BookingQuestionIndustry | undefined>
> = {
  barberia: "barberias",
  peluqueria: "peluquerias",
  estetica: "estetica",
  unas: "unas",
  cejas_pestanas: "pestanas_cejas",
  masajes: "masajes",
  kinesiologia: "kinesiologia",
};

export function industryForBusinessCategory(
  category: string | null,
): BookingQuestionIndustry | null {
  if (!category) return null;
  return RUBRO_TO_INDUSTRY[category] ?? null;
}

export function presetsForIndustry(
  industry: BookingQuestionIndustry,
): readonly BookingQuestionPreset[] {
  return PRESETS[industry];
}

export function industryLabel(industry: BookingQuestionIndustry): string {
  return LABELS[industry];
}
