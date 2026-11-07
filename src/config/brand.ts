// Varumärket (D-026). Namnet finns bara här (regel 10).
import type { LegalEntity } from "@/i18n/legal/entity";

export type Brand = {
  readonly name: string;
  readonly tagline: string;
  readonly domain: string | null;
  /** Sluggen för demoföretaget (`/{demoSlug}`). */
  readonly demoSlug: string;
  readonly supportWhatsapp: string | null;
  readonly legal: LegalEntity;
};

export const brand: Brand = {
  name: "Ordena Calendar",
  tagline: "Tu agenda se llena sola.",
  domain: "ordenagroup.cl",
  // WP-63 (D-043): demoföretaget som marknadssidan länkar till. Skapas och
  // rullas av `private.seed_demo('CL')`.
  demoSlug: "estudio-brisa",
  supportWhatsapp: null,
  // TODO: fylls i före lansering (WP-26, "Ägarens svar" 2026-09-30) — samma
  // platshållarvärden som `src/i18n/legal/entity.ts` (PLACEHOLDER_ENTITY_CL),
  // tills den chilenska SpA:n finns och adressen är bestämd.
  legal: {
    legalName: "[Razón social de la SpA — pendiente]",
    taxId: "[RUT de la empresa — pendiente]",
    address: "[Domicilio comercial en Santiago — pendiente]",
    contactEmail: "privacidad@ordenagroup.cl",
  },
};

/** Alla varumärkesnamn, för testet som håller namnen i den här filen. */
export const allBrandNames: readonly string[] = [brand.name];
