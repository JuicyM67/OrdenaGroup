import { acceso, comun } from "@/i18n";

/** `code` mappar mot en nyckel i `acceso.errores`; annars generisk text. */
export function authErrorText(code: string): string {
  return (
    acceso.errores[code as keyof typeof acceso.errores] ?? comun.algoSalioMal
  );
}
