// Varumärke per marknad (D-025, D-026). Namnen finns bara här (regel 10).
// Marknaden väljs per installation med NEXT_PUBLIC_MARKET (CL som standard).
export type Market = "CL" | "SE";

const brands = {
  CL: {
    name: "Ordena Calendar",
    tagline: "Tu agenda se llena sola.",
    domain: null,
    supportWhatsapp: null,
  },
  SE: {
    name: "Booking Buddy",
    tagline: "Kalendern som fyller sig själv.",
    domain: "bookingbuddy.se",
    supportWhatsapp: null,
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
  readonly supportWhatsapp: string | null;
};
