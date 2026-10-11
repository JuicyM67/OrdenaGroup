/**
 * Texter som delas mellan `sv-SE.app.ts` (bokningssidan) och
 * `sv-SE.panel.ts` (företagets app): en definition utan att den ena modulen
 * importerar den andra (D-039: panelen ska inte hamna i `/[slug]`-bunten).
 * Samma upplägg som `es-CL.compartido.ts`.
 */

/** "Boka": `reserva.bookingBar.ctaReservar` och `perfil.publico.reservar`. */
export const CTA_BOKA = "Boka";

/** `validacion.numeroEntero` (ägaren i Inställningar) och
 * `formulario.errores.respuesta.out_of_range` (kunden). */
export const numeroEntero = (p: { min: number; max: number }): string =>
  `Skriv ett heltal mellan ${p.min} och ${p.max}.`;

/** Samma form som es-CL men med vanliga string/number/boolean i stället för
 * literaler, och med stöd för readonly-listor (CAJA_METODOS_MANUALES,
 * plantillasWhatsapp.*.variables/botones). */
export type Widen<T> = T extends string
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
