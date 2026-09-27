/**
 * Utilidades compartidas entre `es-CL.test.ts` y `es-CL.v2.test.ts`
 * (WP-03b, paso 1): recorrer un árbol de traducciones, las reglas de tono,
 * el patrón de marca y los nombres de fixture que no deben aparecer sueltos
 * en `es-CL.ts`. Es una extracción sin cambios de comportamiento de lo que
 * antes vivía solo en `es-CL.test.ts` (WP-03).
 */
import { brand } from "@/config/brand";

/** Una hoja de texto: una cadena fija o una función con un solo parámetro
 * con nombre (mismo tipo que `Lov` en `./index`, repetido acá para no
 * importar del código de producto en un archivo de test). */
export type Hoja = string | ((p: never) => string);
export type Rama = { readonly [k: string]: Hoja | Rama };

/** Recorre un área completa y visita cada hoja (string o función). */
export function paraCadaHoja(
  raiz: Rama,
  prefijo: string,
  visitar: (ruta: string, hoja: Hoja) => void,
): void {
  for (const [clave, valor] of Object.entries(raiz)) {
    const ruta = prefijo ? `${prefijo}.${clave}` : clave;
    if (typeof valor === "string" || typeof valor === "function") {
      visitar(ruta, valor);
    } else {
      paraCadaHoja(valor, ruta, visitar);
    }
  }
}

export function escaparRegExp(texto: string): string {
  return texto.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

/** Restos rotos que puede dejar una función mal invocada: un parámetro que
 * faltó (`undefined`), un número no válido, un objeto sin `toString`, o una
 * llave de plantilla que no se reemplazó. */
export const PATRON_RESTO_ROTO =
  /undefined|NaN|\bnull\b|\[object|\{\{|\{[a-zA-Z]/;

/** Lista negra de tono (GUIA_DE_ESTILO §1): nunca "usted", voseo
 * rioplatense, jerga que suene poco seria, ni anglicismos evitables. */
export const REGLAS_DE_TONO: Record<string, RegExp> = {
  usted: /\busted(es)?\b/i,
  voseo: /\b(podés|tenés|querés|sabés|reservá|elegí)\b/i,
  slangPo: /\bpo\b/i,
  slangWena: /\bwena\b/i,
  booking: /\bbooking\b/i,
  checkin: /\bcheck-?in\b/i,
  emoji: /\p{Extended_Pictographic}/u,
};

/** El nombre del producto solo puede entrar vía `brand.name` (regla dura
 * 10): este patrón se arma desde `brand.name` para no volver a escribirlo
 * acá tampoco. */
export const PATRON_MARCA = new RegExp(
  `\\b${escaparRegExp(brand.name)}\\b`,
  "i",
);

/** Nombres de las fixtures de diseño (`docs/design/reference/*.dc.html`,
 * `NOMBRES_FIXTURE` original de WP-03): no deben aparecer sueltos en
 * `es-CL.ts` fuera de un campo `ejemplo` de las plantillas de WhatsApp
 * (tenant-isolation, R9 del plan de WP-03). */
export const NOMBRES_FIXTURE = [
  "Barbería Norte",
  "Joaquín",
  "Camila",
  "Martina Lagos",
  "Valentina Soto",
  "Ignacio Pérez",
  "Corte clásico",
  "Perfilado de barba",
];
