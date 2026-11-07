// Rubros (`businesses.category`, WP-85/D-070: en per Descubre-kategori, se
// `categoryForRubro` i ./marketplace.ts). Ingen server-only-import här — listan
// används både i onboardingens/inställningarnas klientkomponenter och på servern
// (`src/server/onboarding/schemas.ts` exporterar den vidare).
// Samma nycklar som `negocio.rubros` (src/i18n/es-CL.panel.ts). Hålls i synk manuellt (som
// `profesionales.colores` mot `staff.color`-checken i DB) — testat i schemas.test.ts.
export const RUBRO_KEYS = [
  "barberia",
  "peluqueria",
  "estetica",
  "unas",
  "cejas_pestanas",
  "masajes",
  "kinesiologia",
  // WP-85 (D-070): fler rubros, en per Descubre-kategori (`categoryForRubro`).
  "belleza",
  "spa",
  "holistico",
  "entrenamiento",
  "tatuajes",
  "mascotas",
  "limpieza",
  "automotriz",
  "otro",
] as const;

export type RubroKey = (typeof RUBRO_KEYS)[number];
