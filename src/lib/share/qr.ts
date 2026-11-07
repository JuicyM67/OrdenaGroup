// QR-kod för bokningslänken (WP-89, D-075) med `qrcode-generator` (MIT, inga beroenden).
// Ger bara modulmatrisen; komponenten ritar den som SVG och som PNG (canvas) med tokens.
import qrcode from "qrcode-generator";

/** Tyst zon runt koden, i moduler (QR-standardens minimum är 4). */
export const QR_QUIET_ZONE = 4;

/** `true` = mörk modul. Felkorrigering "M" (15 %): tål en repa eller fläck på en utskrift
 * utan att koden blir onödigt tät. */
export function qrModules(text: string): boolean[][] {
  const qr = qrcode(0, "M");
  qr.addData(text, "Byte");
  qr.make();
  const n = qr.getModuleCount();
  return Array.from({ length: n }, (_, row) =>
    Array.from({ length: n }, (_, col) => qr.isDark(row, col)),
  );
}

/** SVG-sökväg (en `M x y h1 v1 h-1 z` per mörk modul), förskjuten med den tysta zonen. */
export function qrPath(modules: boolean[][]): string {
  const parts: string[] = [];
  modules.forEach((row, y) => {
    row.forEach((dark, x) => {
      if (dark) {
        parts.push(`M${x + QR_QUIET_ZONE} ${y + QR_QUIET_ZONE}h1v1h-1z`);
      }
    });
  });
  return parts.join("");
}
