/**
 * Textos compartidos entre `es-CL.ts` (página de reservas) y `es-CL.panel.ts`
 * (app del negocio): una sola definición sin que un módulo importe al otro
 * (D-039: el panel no debe entrar en el chunk de `/[slug]`).
 */

/** "Reservar": `reserva.bookingBar.ctaReservar` y `perfil.publico.reservar`. */
export const CTA_RESERVAR = "Reservar";

/** `validacion.numeroEntero` (dueño en Ajustes) y
 * `errores.respuesta.out_of_range` (cliente): "número entero entre X y Y". */
export const numeroEntero = (p: { min: number; max: number }): string =>
  `Escribe un número entero entre ${p.min} y ${p.max}.`;
