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
/** En av företagets egna bilder som kan bli skyltens bakgrund (WP-96b): omslaget
 * (`id` = "portada") eller en galleribild (`business_images.id`). */
export type CartelPhoto = { id: string; url: string };

export type CartelBusiness = {
  name: string;
  logoUrl: string | null;
  /** Omslaget först, sedan galleriet i ägarens ordning. Tom lista = inga bilder. */
  fotos: readonly CartelPhoto[];
};

/** Utskriftssidans query. WP-96: designen (även storleken) kommer från det som sparats;
 * `tamano`/`estilo` är frivilliga överstyrningar (länkar från WP-95). */
export type CartelPrintParams = {
  kind: CartelKind;
  size: CartelSize | null;
  style: CartelStyle | null;
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

/** `?cartel=&tamano=&estilo=` genom whitelists. Okänd skylt = reservas; okänd eller för
 * skylten ogiltig storlek/stil (t.ex. reservas + a6x4) = ingen överstyrning. */
export function parseCartelPrintParams(params: {
  cartel?: unknown;
  tamano?: unknown;
  estilo?: unknown;
}): CartelPrintParams {
  const kind = pick(CARTEL_KINDS, params.cartel) ?? "reservas";
  return {
    kind,
    size: pick(CARTEL_SIZES_FOR[kind], params.tamano) ?? null,
    style: pick(CARTEL_STYLES, params.estilo) ?? null,
  };
}

/** Utskriftssidans adress för en skylt (designen läses från det sparade). */
export function cartelPrintQuery(kind: CartelKind): string {
  return new URLSearchParams({ cartel: kind }).toString();
}
