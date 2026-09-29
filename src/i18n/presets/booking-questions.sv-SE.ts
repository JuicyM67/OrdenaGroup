/**
 * Svensk spegel av `./booking-questions.es-CL.ts` (WP-40, D-025/D-026,
 * marknad SE): samma bransch-nycklar, samma frågenycklar (`key`), samma
 * `type`, `required`, `saveToCustomer` och `enabledByDefault` — bara
 * `label`, `help` och `options` är översatta/anpassade. Typerna importeras
 * från den spanska filen (samma mönster som `Widen<typeof Es.…>` i
 * `../sv-SE.app.ts`): saknas en bransch eller en egenskap här slutar det
 * kompilera.
 *
 * Anpassningar för SE (inte bara översättning):
 * - `kinesiologia` heter "naprapati och fysioterapi" i
 *   `BOOKING_QUESTION_INDUSTRY_LABELS` (samma anpassning som
 *   `negocio.rubros.kinesiologia` → "Naprapat/fysioterapi" i
 *   `../sv-SE.app.ts`).
 * - Inga förbjudna ord för marknaden (samma lista som
 *   `../sv-SE.app.test.ts` kontrollerar för `sv-SE.app.ts`): inget
 *   "WhatsApp", "RUT", "$" osv. Här handlar det mest om att aldrig skriva
 *   "RUT" av misstag i en hjälptext.
 */
import type {
  BookingQuestionIndustry,
  BookingQuestionPreset,
} from "./booking-questions.es-CL";

export type {
  BookingQuestionIndustry,
  BookingQuestionKind,
  BookingQuestionPreset,
} from "./booking-questions.es-CL";

export const BOOKING_QUESTION_INDUSTRY_LABELS: Readonly<
  Record<BookingQuestionIndustry, string>
> = {
  barberias: "barberare",
  peluquerias: "frisörer",
  estetica: "hudvård",
  kinesiologia: "naprapati och fysioterapi",
  unas: "naglar",
  pestanas_cejas: "bryn och fransar",
  masajes: "massage",
  tatuajes: "tatuering",
};

const ALERGIAS_PRODUCTOS = {
  key: "alergias_productos",
  type: "short_text",
  label: "Allergier mot produkter",
  help: "Bara om du har några. Vi använder det för att vara försiktiga med produkterna vi använder på dig.",
  required: false,
  saveToCustomer: true,
  enabledByDefault: false,
} as const satisfies BookingQuestionPreset;

export const BOOKING_QUESTION_PRESETS: Readonly<
  Record<BookingQuestionIndustry, readonly BookingQuestionPreset[]>
> = {
  barberias: [
    {
      key: "estilo_barba",
      type: "single_choice",
      label: "Hur vill du ha skägget?",
      options: ["Bara putsa till", "Klippa kort", "Låta det växa lite till"],
      required: false,
      saveToCustomer: false,
      enabledByDefault: true,
    },
    {
      key: "referencia_foto",
      type: "yes_no",
      label: "Har du en referensbild?",
      required: false,
      saveToCustomer: false,
      enabledByDefault: true,
    },
    {
      key: "primera_vez",
      type: "yes_no",
      label: "Är det första gången hos oss?",
      required: false,
      saveToCustomer: false,
      enabledByDefault: true,
    },
  ],
  peluquerias: [
    {
      key: "largo_pelo",
      type: "single_choice",
      label: "Hårlängd",
      options: ["Kort", "Mellan", "Lång"],
      required: true,
      saveToCustomer: false,
      enabledByDefault: true,
    },
    {
      key: "coloracion_reciente",
      type: "yes_no",
      label: "Har du färgat håret de senaste 6 månaderna?",
      required: false,
      saveToCustomer: false,
      enabledByDefault: true,
    },
    {
      key: "tono_deseado",
      type: "short_text",
      label: "Vilken nyans vill du ha?",
      required: false,
      saveToCustomer: false,
      enabledByDefault: true,
    },
    ALERGIAS_PRODUCTOS,
  ],
  estetica: [
    {
      key: "tipo_piel",
      type: "single_choice",
      label: "Hudtyp",
      options: ["Torr", "Fet", "Blandad", "Vet inte"],
      required: false,
      saveToCustomer: false,
      enabledByDefault: true,
    },
    {
      key: "tratamiento_previo",
      type: "yes_no",
      label: "Har du gjort den här behandlingen förut?",
      required: false,
      saveToCustomer: false,
      enabledByDefault: true,
    },
    {
      key: "preferencias",
      type: "long_text",
      label: "Berätta vad du är ute efter",
      required: false,
      saveToCustomer: false,
      enabledByDefault: true,
    },
    ALERGIAS_PRODUCTOS,
  ],
  kinesiologia: [
    {
      key: "zona_molestia",
      type: "single_choice",
      label: "Vilket område vill du att vi jobbar med?",
      options: ["Rygg", "Nacke och axlar", "Ben", "Annat"],
      required: false,
      saveToCustomer: false,
      enabledByDefault: true,
    },
    {
      key: "primera_sesion",
      type: "yes_no",
      label: "Är det ditt första besök hos oss?",
      required: false,
      saveToCustomer: false,
      enabledByDefault: true,
    },
    {
      key: "objetivo",
      type: "short_text",
      label: "Vad är målet med det här besöket?",
      required: false,
      saveToCustomer: false,
      enabledByDefault: true,
    },
  ],
  unas: [
    {
      key: "tipo_manicura",
      type: "single_choice",
      label: "Vilken typ av manikyr vill du ha?",
      options: ["Klassisk", "Gellack", "Skulpterade naglar"],
      required: false,
      saveToCustomer: false,
      enabledByDefault: true,
    },
    {
      key: "largo_unas_deseado",
      type: "single_choice",
      label: "Önskad längd",
      options: ["Kort", "Mellan", "Lång"],
      required: false,
      saveToCustomer: false,
      enabledByDefault: true,
    },
    {
      key: "referencia_foto",
      type: "yes_no",
      label: "Har du en referensbild?",
      required: false,
      saveToCustomer: false,
      enabledByDefault: true,
    },
    ALERGIAS_PRODUCTOS,
  ],
  pestanas_cejas: [
    {
      key: "servicio_deseado_pestanas_cejas",
      type: "single_choice",
      label: "Vad är du ute efter?",
      options: [
        "Brynformning",
        "Brynlaminering",
        "Fransförlängning",
        "Franslyft",
      ],
      required: false,
      saveToCustomer: false,
      enabledByDefault: true,
    },
    {
      key: "tiene_extensiones",
      type: "yes_no",
      label: "Har du lösfransar på just nu?",
      required: false,
      saveToCustomer: false,
      enabledByDefault: true,
    },
    ALERGIAS_PRODUCTOS,
  ],
  masajes: [
    {
      key: "tipo_masaje",
      type: "single_choice",
      label: "Vilken typ av massage vill du ha?",
      options: ["Avslappning", "Djupmassage", "Sportmassage"],
      required: false,
      saveToCustomer: false,
      enabledByDefault: true,
    },
    {
      key: "zona_enfocar",
      type: "single_choice",
      label: "Något område du vill fokusera på?",
      options: ["Rygg", "Nacke och axlar", "Ben", "Hela kroppen"],
      required: false,
      saveToCustomer: false,
      enabledByDefault: true,
    },
    {
      key: "intensidad_masaje",
      type: "single_choice",
      label: "Vilket tryck föredrar du?",
      options: ["Lätt", "Medel", "Kraftigt"],
      required: false,
      saveToCustomer: false,
      enabledByDefault: true,
    },
  ],
  tatuajes: [
    {
      key: "zona_cuerpo_tatuaje",
      type: "short_text",
      label: "Var på kroppen?",
      required: false,
      saveToCustomer: false,
      enabledByDefault: true,
    },
    {
      key: "tamano_aprox",
      type: "single_choice",
      label: "Ungefärlig storlek",
      options: ["Liten", "Mellan", "Stor"],
      required: false,
      saveToCustomer: false,
      enabledByDefault: true,
    },
    {
      key: "referencia_diseno",
      type: "yes_no",
      label: "Har du ett referensmotiv?",
      required: false,
      saveToCustomer: false,
      enabledByDefault: true,
    },
    {
      key: "primera_vez",
      type: "yes_no",
      label: "Är det din första tatuering?",
      required: false,
      saveToCustomer: false,
      enabledByDefault: true,
    },
    ALERGIAS_PRODUCTOS,
  ],
};
