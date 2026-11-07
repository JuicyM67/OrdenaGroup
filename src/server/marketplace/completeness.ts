import "server-only";

// Kompletthetsregeln för Descubre (WP-85, D-070): ett företag listas bara när
// profilen har bild, adress (eller orter för den som kommer till kunden) och minst
// en aktiv tjänst. Ren funktion — samma regel i Inställningar (vad saknas?) och i
// den publika listningen (PR 2).

export type CompletenessInput = {
  logoUrl: string | null;
  coverUrl: string | null;
  address: string | null;
  servesAtCustomer: boolean;
  serviceAreaCount: number;
  activeServiceCount: number;
};

export type MissingPart = "imagen" | "direccion" | "zonas" | "servicio";

export function missingForMarketplace(b: CompletenessInput): MissingPart[] {
  const missing: MissingPart[] = [];
  if (!b.logoUrl?.trim() && !b.coverUrl?.trim()) missing.push("imagen");
  if (b.servesAtCustomer) {
    if (b.serviceAreaCount === 0) missing.push("zonas");
  } else if (!b.address?.trim()) {
    missing.push("direccion");
  }
  if (b.activeServiceCount === 0) missing.push("servicio");
  return missing;
}
