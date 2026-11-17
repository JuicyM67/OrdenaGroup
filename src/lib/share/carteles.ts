// Carteles para imprimir (WP-95, D-079): vilka skyltar, storlekar och stilar som finns,
// länkarna i QR-koderna och tolkningen av utskriftssidans query. Ingen server-kod, så
// både fliken (klient) och utskriftssidan (server) använder samma whitelist.
import { CUENTA_INGRESAR_PATH } from "@/config/routes";

export const CARTEL_KINDS = ["reservas", "cuenta"] as const;
export type CartelKind = (typeof CARTEL_KINDS)[number];

export const CARTEL_SIZES = ["a3", "a4", "a5", "a6x4"] as const;
export type CartelSize = (typeof CARTEL_SIZES)[number];

export const CARTEL_STYLES = ["claro", "oscuro", "lima"] as const;
export type CartelStyle = (typeof CARTEL_STYLES)[number];

/** Storlekarna per skylt, standardvärdet först. Mini-skylten skrivs ut fyra per A4
 * (de flesta skrivare tar inte A6) eller en per A5. */
export const CARTEL_SIZES_FOR: Record<CartelKind, readonly CartelSize[]> = {
  reservas: ["a4", "a3", "a5"],
  cuenta: ["a6x4", "a5"],
};

/** Pappersstorleken för `@page` (A6 × 4 skrivs ut på ett A4-ark). */
export const CARTEL_PAGE_SIZE: Record<CartelSize, "A3" | "A4" | "A5"> = {
  a3: "A3",
  a4: "A4",
  a5: "A5",
  a6x4: "A4",
};

/** Källan i QR-kodernas länkar. Läses inte av sidorna (samma som D-075:s `qr`). */
export const CARTEL_SOURCE = "cartel";

function withSource(url: string): string {
  const u = new URL(url);
  u.searchParams.set("utm_source", CARTEL_SOURCE);
  return u.toString();
}

/** Länken i QR-koden: bokningssidan eller kundkontots inloggning. */
export function cartelLink(
  kind: CartelKind,
  origin: string,
  slug: string,
): string {
  return kind === "reservas"
    ? withSource(`${origin}/${slug}`)
    : withSource(`${origin}${CUENTA_INGRESAR_PATH}`);
}

/** Adressen i klartext under QR-koden, utan protokoll ("ordenagroup.cl/mi-negocio"). */
export function cartelDisplayUrl(origin: string, slug: string): string {
  return `${origin.replace(/^https?:\/\//, "")}/${slug}`;
}

/** Företaget på skylten. Loggan är redan kontrollerad (bara egen bucket), annars initialer. */
export type CartelBusiness = {
  name: string;
  logoUrl: string | null;
};

export type CartelOptions = {
  kind: CartelKind;
  size: CartelSize;
  style: CartelStyle;
};

function pick<T extends string>(
  list: readonly T[],
  value: unknown,
): T | undefined {
  return typeof value === "string" &&
    (list as readonly string[]).includes(value)
    ? (value as T)
    : undefined;
}

/** Utskriftssidans query (`?cartel=&tamano=&estilo=`). Okända värden ger standardvärdet;
 * en storlek som inte finns för skylten (t.ex. reservas + a6x4) ger skyltens standard. */
export function parseCartelOptions(params: {
  cartel?: unknown;
  tamano?: unknown;
  estilo?: unknown;
}): CartelOptions {
  const kind = pick(CARTEL_KINDS, params.cartel) ?? "reservas";
  const sizes = CARTEL_SIZES_FOR[kind];
  const size = pick(sizes, params.tamano) ?? sizes[0]!;
  const style = pick(CARTEL_STYLES, params.estilo) ?? "claro";
  return { kind, size, style };
}

/** Query-strängen för utskriftssidan. */
export function cartelQuery(o: CartelOptions): string {
  return new URLSearchParams({
    cartel: o.kind,
    tamano: o.size,
    estilo: o.style,
  }).toString();
}
