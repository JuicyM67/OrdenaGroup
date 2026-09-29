/**
 * Sugerencias de preguntas para el formulario de reserva, por rubro (WP-40,
 * D-031, paso 2 del plan). Un dueño de barbería ve sugerencias distintas que
 * uno de estética: acá vive el catálogo completo en español de Chile.
 *
 * Este archivo es la fuente de las preguntas ("preset_key" en
 * `booking_questions`, ver el plan de WP-40 paso 1): el dueño puede activar
 * una tal cual, o modificarla y guardar su propia versión (en ese momento
 * deja de estar ligada a este archivo). Los textos acá son producto, no
 * traducción de otro archivo: los escribe `copywriter-es-cl` siguiendo
 * `docs/content/GUIA_DE_ESTILO.md`.
 *
 * Reglas de contenido (decisión del dueño, 2026-09-29, ver DECISIONS.md
 * D-031 y el plan de WP-40 §6):
 * - Nunca preguntas de salud: nada de lesiones, diagnósticos, medicamentos,
 *   embarazo ni similares, ni siquiera insinuado (misma regla que
 *   `servicios.campos.nombreAyuda` en `../es-CL.ts`).
 * - "Alergias a productos" es la única excepción, y solo en los cinco
 *   rubros donde de verdad aplica (tinturas, cremas, pegamentos, esmaltes,
 *   tintas): `peluquerias`, `estetica`, `unas`, `pestanas_cejas`,
 *   `tatuajes`. Siempre opcional, siempre apagada por defecto, y siempre
 *   guardada en la ficha del cliente (así no hay que volver a preguntar en
 *   la próxima visita).
 * - Ninguna pregunta es obligatoria por defecto, salvo "Largo de pelo" en
 *   `peluquerias`: es el único ejemplo dibujado en la referencia de diseño
 *   (`.visual-diff/ref/falt-A-bokningsformular.html`, la fila "Hårlängd"),
 *   con el candado "Obligatoria" ya activado ahí.
 * - `key` es un identificador estable en snake_case (no es el texto que ve
 *   el cliente): si dos rubros comparten la misma pregunta ("Alergias a
 *   productos", "¿Traes una foto de referencia?"), comparten el mismo
 *   `key`, aunque cada rubro tiene su propia copia del objeto completo (el
 *   dueño de un rubro puede editar/apagar la suya sin afectar al otro).
 *
 * `src/i18n/presets/booking-questions.sv-SE.ts` es el espejo en sueco:
 * mismas claves de rubro, mismos `key` de pregunta, mismo `type`,
 * `required`, `saveToCustomer` y `enabledByDefault` (impuesto por el tipo
 * `Record<BookingQuestionIndustry, readonly BookingQuestionPreset[]>` que
 * ese archivo usa contra los tipos de acá, mismo patrón que `Widen<typeof
 * Es.…>` en `sv-SE.app.ts`) — solo cambian `label`, `help` y `options`.
 */

/** Los siete tipos de pregunta (F-WP-40, paso 1 del plan): mismo nombre que
 * el enum `question_kind` de la base de datos (db-engineer, WP-40 paso 1),
 * así el código no traduce nombres en el límite cliente/servidor. */
export type BookingQuestionKind =
  | "short_text"
  | "long_text"
  | "single_choice"
  | "multi_choice"
  | "number"
  | "yes_no"
  | "date";

/** Los ocho rubros con sugerencias propias, decisión del dueño del
 * 2026-09-29 (ver DECISIONS.md D-031 y el plan de WP-40 §6). No son
 * exactamente los mismos códigos que `negocio.rubros` en `../es-CL.ts`
 * (ese enum es el rubro del negocio completo, `businesses.category`; este
 * es solo para elegir qué sugerencias de preguntas mostrar, y agrega
 * `tatuajes`, que no tiene fila propia en `negocio.rubros`). */
export type BookingQuestionIndustry =
  | "barberias"
  | "peluquerias"
  | "estetica"
  | "kinesiologia"
  | "unas"
  | "pestanas_cejas"
  | "masajes"
  | "tatuajes";

/** Una sugerencia de pregunta lista para copiar a `booking_questions`
 * (WP-40 paso 1 del plan) si el dueño la activa. */
export interface BookingQuestionPreset {
  /** Identificador estable (snake_case), no el texto visible. Ver la nota
   * de la cabecera sobre `key` compartido entre rubros. */
  readonly key: string;
  readonly type: BookingQuestionKind;
  /** El texto que ve el cliente en el formulario de reserva. */
  readonly label: string;
  /** Texto de ayuda opcional, bajo la pregunta. */
  readonly help?: string;
  /** Solo para `single_choice`/`multi_choice` (ver el check de la base de
   * datos en el plan de WP-40 paso 1: obligatorio para esos dos tipos,
   * vacío para el resto). */
  readonly options?: readonly string[];
  readonly required: boolean;
  /** Si la respuesta se guarda en `customer_answers` (WP-40 paso 1) para no
   * volver a preguntarla la próxima visita. */
  readonly saveToCustomer: boolean;
  /** Si aparece pre-activada cuando el dueño abre el panel de sugerencias
   * (`formulario.sugerencias` en `../es-CL.ts`), o si tiene que marcarla a
   * mano. Las preguntas sobre alergias siempre empiezan apagadas. */
  readonly enabledByDefault: boolean;
}

/** Mismo texto que aparece en `formulario.sugerencias.titulo({ bransch })`
 * (`../es-CL.ts`): "Sugerencias para {bransch}". En minúscula porque va a
 * mitad de frase (mismo criterio que los meses en `src/lib/format/`, GUIA
 * §3). */
export const BOOKING_QUESTION_INDUSTRY_LABELS: Readonly<
  Record<BookingQuestionIndustry, string>
> = {
  barberias: "barberías",
  peluquerias: "peluquerías",
  estetica: "estética",
  kinesiologia: "kinesiología",
  unas: "uñas",
  pestanas_cejas: "cejas y pestañas",
  masajes: "masajes",
  tatuajes: "tatuajes",
};

/** Texto reutilizado en las cinco listas donde aplica (ver la nota de la
 * cabecera): una sola definición para que las cinco copias no se
 * desalineen si se corrige la redacción. */
const ALERGIAS_PRODUCTOS = {
  key: "alergias_productos",
  type: "short_text",
  label: "Alergias a productos",
  help: "Solo si tienes alguna. La usamos para tener cuidado con los productos que usamos contigo.",
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
      label: "¿Cómo quieres la barba?",
      options: ["Solo perfilar", "Recortar corto", "Dejar más larga"],
      required: false,
      saveToCustomer: false,
      enabledByDefault: true,
    },
    {
      key: "referencia_foto",
      type: "yes_no",
      label: "¿Traes una foto de referencia?",
      required: false,
      saveToCustomer: false,
      enabledByDefault: true,
    },
    {
      key: "primera_vez",
      type: "yes_no",
      label: "¿Es tu primera vez con nosotros?",
      required: false,
      saveToCustomer: false,
      enabledByDefault: true,
    },
  ],
  peluquerias: [
    {
      // Único ejemplo dibujado en la referencia de diseño (ver la nota de
      // la cabecera): "Hårlängd", obligatoria, Kort/Mellan/Lång.
      key: "largo_pelo",
      type: "single_choice",
      label: "Largo de pelo",
      options: ["Corto", "Medio", "Largo"],
      required: true,
      saveToCustomer: false,
      enabledByDefault: true,
    },
    {
      key: "coloracion_reciente",
      type: "yes_no",
      label: "¿Te has teñido el pelo en los últimos 6 meses?",
      required: false,
      saveToCustomer: false,
      enabledByDefault: true,
    },
    {
      key: "tono_deseado",
      type: "short_text",
      label: "¿Qué tono buscas?",
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
      label: "Tipo de piel",
      options: ["Seca", "Grasa", "Mixta", "No sé"],
      required: false,
      saveToCustomer: false,
      enabledByDefault: true,
    },
    {
      key: "tratamiento_previo",
      type: "yes_no",
      label: "¿Te has hecho este tratamiento antes?",
      required: false,
      saveToCustomer: false,
      enabledByDefault: true,
    },
    {
      key: "preferencias",
      type: "long_text",
      label: "Cuéntanos qué buscas",
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
      label: "¿Qué zona te gustaría trabajar?",
      options: ["Espalda", "Cuello y hombros", "Piernas", "Otra"],
      required: false,
      saveToCustomer: false,
      enabledByDefault: true,
    },
    {
      key: "primera_sesion",
      type: "yes_no",
      label: "¿Es tu primera sesión con nosotros?",
      required: false,
      saveToCustomer: false,
      enabledByDefault: true,
    },
    {
      key: "objetivo",
      type: "short_text",
      label: "¿Cuál es tu objetivo para esta sesión?",
      required: false,
      saveToCustomer: false,
      enabledByDefault: true,
    },
  ],
  unas: [
    {
      key: "tipo_manicura",
      type: "single_choice",
      label: "¿Qué tipo de manicura buscas?",
      options: ["Clásica", "Semipermanente", "Uñas esculpidas"],
      required: false,
      saveToCustomer: false,
      enabledByDefault: true,
    },
    {
      key: "largo_unas_deseado",
      type: "single_choice",
      label: "Largo deseado",
      options: ["Corto", "Medio", "Largo"],
      required: false,
      saveToCustomer: false,
      enabledByDefault: true,
    },
    {
      key: "referencia_foto",
      type: "yes_no",
      label: "¿Traes una foto de referencia?",
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
      label: "¿Qué buscas?",
      options: [
        "Diseño de cejas",
        "Laminado de cejas",
        "Extensión de pestañas",
        "Lifting de pestañas",
      ],
      required: false,
      saveToCustomer: false,
      enabledByDefault: true,
    },
    {
      key: "tiene_extensiones",
      type: "yes_no",
      label: "¿Tienes extensiones puestas ahora?",
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
      label: "¿Qué tipo de masaje prefieres?",
      options: ["Relajación", "Descontracturante", "Deportivo"],
      required: false,
      saveToCustomer: false,
      enabledByDefault: true,
    },
    {
      key: "zona_enfocar",
      type: "single_choice",
      label: "¿Alguna zona en la que quieras enfocarte?",
      options: ["Espalda", "Cuello y hombros", "Piernas", "Todo el cuerpo"],
      required: false,
      saveToCustomer: false,
      enabledByDefault: true,
    },
    {
      key: "intensidad_masaje",
      type: "single_choice",
      label: "Intensidad preferida",
      options: ["Suave", "Media", "Fuerte"],
      required: false,
      saveToCustomer: false,
      enabledByDefault: true,
    },
  ],
  tatuajes: [
    {
      key: "zona_cuerpo_tatuaje",
      type: "short_text",
      label: "¿En qué parte del cuerpo?",
      required: false,
      saveToCustomer: false,
      enabledByDefault: true,
    },
    {
      key: "tamano_aprox",
      type: "single_choice",
      label: "Tamaño aproximado",
      options: ["Pequeño", "Mediano", "Grande"],
      required: false,
      saveToCustomer: false,
      enabledByDefault: true,
    },
    {
      key: "referencia_diseno",
      type: "yes_no",
      label: "¿Traes un diseño de referencia?",
      required: false,
      saveToCustomer: false,
      enabledByDefault: true,
    },
    {
      key: "primera_vez",
      type: "yes_no",
      label: "¿Es tu primer tatuaje?",
      required: false,
      saveToCustomer: false,
      enabledByDefault: true,
    },
    ALERGIAS_PRODUCTOS,
  ],
};
