// WP-80 (D-061): felkoder från administradores-actions → text.
import { adminPanel } from "@/i18n";

const errores: Readonly<Record<string, string>> =
  adminPanel.administradores.errores;

export function adminErrorText(code: string): string {
  return errores[code] ?? adminPanel.administradores.errores.desconocido;
}

const billingErrores: Readonly<Record<string, string>> =
  adminPanel.facturacion.errores;

export function billingErrorText(code: string): string {
  return billingErrores[code] ?? adminPanel.facturacion.errores.desconocido;
}
