/**
 * Punto de entrada de las traducciones. Ver `docs/content/README.md` y
 * `docs/content/GUIA_DE_ESTILO.md` para las reglas de estilo y de tipado.
 *
 * No importar nada de `src/lib/format/` ni de módulos de servidor: este
 * archivo debe poder usarse desde componentes cliente, Server Components,
 * route handlers y cron.
 */

import {
  comun as es_comun,
  nav as es_nav,
  estados as es_estados,
  calendario as es_calendario,
  errores as es_errores,
  reserva as es_reserva,
  gestion as es_gestion,
  inicio as es_inicio,
  agenda as es_agenda,
  hoy as es_hoy,
  plantillasWhatsapp as es_plantillasWhatsapp,
  whatsappSesion as es_whatsappSesion,
  email as es_email,
  validacion as es_validacion,
  acceso as es_acceso,
  negocio as es_negocio,
  onboarding as es_onboarding,
  servicios as es_servicios,
  profesionales as es_profesionales,
  horarios as es_horarios,
  ajustes as es_ajustes,
  clientes as es_clientes,
  CAJA_METODOS_MANUALES as es_CAJA_METODOS_MANUALES,
  caja as es_caja,
  abono as es_abono,
} from "./es-CL";
import {
  comun as sv_comun,
  nav as sv_nav,
  estados as sv_estados,
  calendario as sv_calendario,
  errores as sv_errores,
  reserva as sv_reserva,
  gestion as sv_gestion,
  inicio as sv_inicio,
  agenda as sv_agenda,
  hoy as sv_hoy,
  plantillasWhatsapp as sv_plantillasWhatsapp,
  whatsappSesion as sv_whatsappSesion,
  email as sv_email,
  validacion as sv_validacion,
  acceso as sv_acceso,
  negocio as sv_negocio,
  onboarding as sv_onboarding,
  servicios as sv_servicios,
  profesionales as sv_profesionales,
  horarios as sv_horarios,
  ajustes as sv_ajustes,
  clientes as sv_clientes,
  CAJA_METODOS_MANUALES as sv_CAJA_METODOS_MANUALES,
  caja as sv_caja,
  abono as sv_abono,
} from "./sv-SE.app";

/** Una hoja de texto: una cadena fija o una función con un solo parámetro
 * con nombre. `never` como tipo del parámetro permite que cualquier función
 * `(p: T) => string` (con T concreto) encaje aquí: nadie puede construir un
 * valor `never`, así que la asignación siempre es segura. */
export type Lov = string | ((p: never) => string);

/** Un árbol de traducciones: cada hoja es un `Lov`, cada rama es otro `Trad`. */
export type Trad = { readonly [k: string]: Lov | Trad };

export * from "./es-CL";

// Språk per marknad (M2, D-025/D-026). `NEXT_PUBLIC_MARKET` bakas in vid bygget
// (next.config.ts sätter CL som standard), så jämförelsen blir en konstant och
// bundlern tar bara med ett språk. Lokala exporter går före `export *` ovan.
const SV = process.env.NEXT_PUBLIC_MARKET === "SE";
export const comun = (SV ? sv_comun : es_comun) as typeof es_comun;
export const nav = (SV ? sv_nav : es_nav) as typeof es_nav;
export const estados = (SV ? sv_estados : es_estados) as typeof es_estados;
export const calendario = (
  SV ? sv_calendario : es_calendario
) as typeof es_calendario;
export const errores = (SV ? sv_errores : es_errores) as typeof es_errores;
export const reserva = (SV ? sv_reserva : es_reserva) as typeof es_reserva;
export const gestion = (SV ? sv_gestion : es_gestion) as typeof es_gestion;
export const inicio = (SV ? sv_inicio : es_inicio) as typeof es_inicio;
export const agenda = (SV ? sv_agenda : es_agenda) as typeof es_agenda;
export const hoy = (SV ? sv_hoy : es_hoy) as typeof es_hoy;
export const plantillasWhatsapp = (
  SV ? sv_plantillasWhatsapp : es_plantillasWhatsapp
) as typeof es_plantillasWhatsapp;
export const whatsappSesion = (
  SV ? sv_whatsappSesion : es_whatsappSesion
) as typeof es_whatsappSesion;
export const email = (SV ? sv_email : es_email) as typeof es_email;
export const validacion = (
  SV ? sv_validacion : es_validacion
) as typeof es_validacion;
export const acceso = (SV ? sv_acceso : es_acceso) as typeof es_acceso;
export const negocio = (SV ? sv_negocio : es_negocio) as typeof es_negocio;
export const onboarding = (
  SV ? sv_onboarding : es_onboarding
) as typeof es_onboarding;
export const servicios = (
  SV ? sv_servicios : es_servicios
) as typeof es_servicios;
export const profesionales = (
  SV ? sv_profesionales : es_profesionales
) as typeof es_profesionales;
export const horarios = (SV ? sv_horarios : es_horarios) as typeof es_horarios;
export const ajustes = (SV ? sv_ajustes : es_ajustes) as typeof es_ajustes;
export const clientes = (SV ? sv_clientes : es_clientes) as typeof es_clientes;
export const CAJA_METODOS_MANUALES = (
  SV ? sv_CAJA_METODOS_MANUALES : es_CAJA_METODOS_MANUALES
) as typeof es_CAJA_METODOS_MANUALES;
export const caja = (SV ? sv_caja : es_caja) as typeof es_caja;
export const abono = (SV ? sv_abono : es_abono) as typeof es_abono;

export type Mensajes = typeof import("./es-CL");
