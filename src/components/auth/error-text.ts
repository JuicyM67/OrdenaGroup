import { acceso, algoSalioMal } from "@/i18n/auth";

/** `code` mappar mot en nyckel i `acceso.errores`; annars generisk text. */
export function authErrorText(code: string): string {
  return acceso.errores[code as keyof typeof acceso.errores] ?? algoSalioMal;
}
