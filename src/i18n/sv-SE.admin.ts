/** WP-80 (D-061): nya texter i plattformspanelen (`/admin`), svenska. Samma
 * form som `es-CL.admin.ts`. */
import type { adminPanel as EsAdminPanel } from "./es-CL.admin";

type Widen<T> = T extends string
  ? string
  : T extends number
    ? number
    : T extends boolean
      ? boolean
      : T extends (...args: infer A) => infer R
        ? (...args: A) => Widen<R>
        : T extends readonly (infer U)[]
          ? readonly Widen<U>[]
          : T extends object
            ? { readonly [K in keyof T]: Widen<T[K]> }
            : T;

export const adminPanel: Widen<typeof EsAdminPanel> = {
  nav: {
    administradores: "Administratörer",
  },
  administradores: {
    titulo: "Administratörer",
    intro:
      "De som kan logga in i den här panelen. Var och en måste aktivera tvåstegsverifiering innan panelen kan användas.",
    correo: "E-post",
    desde: "Sedan",
    verificacion: "Tvåstegsverifiering",
    mfaActiva: "Aktiv",
    mfaPendiente: "Saknas",
    mfaDesconocida: "—",
    tu: "Du",
    quitar: "Ta bort",
    cancelar: "Avbryt",
    quitarTitulo: "Ta bort administratören?",
    quitarTexto:
      "Personen förlorar åtkomsten till panelen direkt. Kontot raderas inte.",
    agregarTitulo: "Lägg till administratör",
    agregarAyuda:
      "Finns ett konto med e-postadressen läggs det till direkt, annars skapas kontot. I båda fallen skickas en inloggningslänk.",
    agregar: "Lägg till",
    agregando: "Lägger till…",
    agregado: "Klart — administratören är tillagd och har fått länken.",
    agregadoSinCorreo:
      "Administratören är tillagd, men mejlet kunde inte skickas. Be personen logga in via inloggningssidan.",
    errores: {
      invalid_email: "Kontrollera e-postadressen.",
      already_admin: "Personen är redan administratör.",
      create_user_failed: "Kontot kunde inte skapas. Försök igen.",
      cannot_remove_self: "Du kan inte ta bort dig själv.",
      last_admin: "Minst en administratör måste finnas kvar.",
      not_found: "Administratören finns inte längre i listan.",
      desconocido: "Något gick fel. Försök igen.",
    },
  },
  facturacion: {
    manual: "Faktureras manuellt",
    manualAyuda:
      "Faktureras utanför programmet. Planen styrs härifrån och företaget ser inga val för att köpa eller byta plan.",
    nota: "Intern anteckning (valfritt)",
    notaAyuda: (p: { max: number }): string =>
      `Syns bara för plattformens team. Högst ${p.max} tecken.`,
    guardar: "Spara fakturering",
    guardando: "Sparar…",
    guardado: "Sparat.",
    filtro: "Fakturering",
    todos: "Alla",
    etiqueta: "Manuell",
    planBloqueado:
      "Faktureras manuellt: planen ändras bara från den här panelen.",
    errores: {
      note_too_long: "Anteckningen är för lång.",
      not_found: "Företaget hittades inte.",
      invalid_input: "Kontrollera uppgifterna.",
      desconocido: "Något gick fel. Försök igen.",
    },
  },
};
