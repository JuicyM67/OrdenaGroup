/**
 * Datos de la entidad legal que ofrece la plataforma, por mercado
 * (WP-26, pregunta "juridisk enhet" y su respuesta en "Ägarens svar",
 * 2026-09-30). Cada documento de `src/i18n/legal/` recibe estos datos
 * como parámetro de función (`LegalEntity`), nunca escritos a mano en el
 * texto: así, cuando exista la razón social real, alcanza con pasar un
 * objeto distinto, sin tocar ningún documento.
 *
 * `legalName` es la razón social (no el nombre de marca: `brand.name` no
 * se usa ni se importa acá, regla dura 10). `taxId` es el RUT de la
 * empresa en Chile o el número de organización (org.nr) en Suecia.
 *
 * Hoy no existen estos datos en `src/config/brand.ts`, así que este
 * archivo exporta un valor de relleno (placeholder) por mercado, muy
 * marcado como pendiente, para que las pantallas de WP-26 puedan
 * renderizar los documentos completos desde ya. Cuando `brand.ts`
 * incorpore un campo `legal: { legalName, taxId, address, contactEmail }`
 * por mercado, quien construya la página (`ui-engineer`) debe pasar ese
 * objeto en vez de `PLACEHOLDER_ENTITY_CL`/`PLACEHOLDER_ENTITY_SE`.
 */

export interface LegalEntity {
  /** Razón social de la empresa (no el nombre de marca). */
  readonly legalName: string;
  /** RUT (Chile) u organisationsnummer (Suecia). */
  readonly taxId: string;
  /** Domicilio comercial completo. */
  readonly address: string;
  /** Correo de contacto para temas de datos personales/privacidad. */
  readonly contactEmail: string;
}

/**
 * Placeholder para el mercado CL. Los tres primeros campos están
 * pendientes de que exista la sociedad y se decida su domicilio (ver
 * `docs/legal/JURIST_FRAGOR.md` y `docs/legal/COMPLIANCE.md` §"Bolag y
 * skatt"); `contactEmail` es el que decidió el dueño del producto.
 */
export const PLACEHOLDER_ENTITY_CL: LegalEntity = {
  legalName: "[Razón social de la SpA — pendiente]",
  taxId: "[RUT de la empresa — pendiente]",
  address: "[Domicilio comercial en Santiago — pendiente]",
  contactEmail: "privacidad@ordenagroup.cl",
};

/** Placeholder para el mercado SE, mismo criterio que `PLACEHOLDER_ENTITY_CL`. */
export const PLACEHOLDER_ENTITY_SE: LegalEntity = {
  legalName: "[Bolagets registrerade firmanamn — saknas]",
  taxId: "[Organisationsnummer — saknas]",
  address: "[Registrerad adress — saknas]",
  contactEmail: "integritet@bookingbuddy.se",
};
