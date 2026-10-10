// Varumärke per marknad (D-025, D-026). Namnen finns bara här (regel 10).
// Marknaden väljs per installation med NEXT_PUBLIC_MARKET (CL som standard).
import type { LegalEntity } from "@/i18n/legal/entity";

export type Market = "CL" | "SE";

const brands = {
  CL: {
    name: "Ordena Calendar",
    tagline: "Tu agenda se llena sola.",
    domain: null,
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
  },
  SE: {
    name: "Booking Buddy",
    tagline: "Kalendern som fyller sig själv.",
    domain: "bookingbuddy.se",
    demoSlug: "salong-norrsken",
    supportWhatsapp: null,
    // TODO: fylls i före lansering — samma platshållarvärden som
    // `src/i18n/legal/entity.ts` (PLACEHOLDER_ENTITY_SE).
    legal: {
      legalName: "[Bolagets registrerade firmanamn — saknas]",
      taxId: "[Organisationsnummer — saknas]",
      address: "[Registrerad adress — saknas]",
      contactEmail: "integritet@bookingbuddy.se",
    },
  },
} as const;

export function parseMarket(raw: string | undefined): Market {
  return raw === "SE" ? "SE" : "CL";
}

export const market: Market = parseMarket(process.env.NEXT_PUBLIC_MARKET);

export const brand: Brand = brands[market];

/** Alla varumärkesnamn, för testet som håller namnen i den här filen. */
export const allBrandNames: readonly string[] = Object.values(brands).map(
  (b) => b.name,
);

export type Brand = {
  readonly name: string;
  readonly tagline: string;
  readonly domain: string | null;
  /** Sluggen för marknadens demoföretag (`/{demoSlug}`). */
  readonly demoSlug: string;
  readonly supportWhatsapp: string | null;
  readonly legal: LegalEntity;
};
