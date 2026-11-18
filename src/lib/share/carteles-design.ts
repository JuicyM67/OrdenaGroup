// Skylteditorn (WP-96, D-080): designen av en skylt i Ajustes → QR. Sparas på företaget
// (`businesses.sign_designs`). Läsningen här är TOLERANT: okända eller ogiltiga värden ger
// standardvärdet fält för fält, så sparad data aldrig kan krascha sidan. Skrivningen
// valideras strikt på servern (src/lib/validation/carteles.ts). Ingen server-kod: används
// av editorn (klient), utskriftssidan och servern.
import {
  CARTEL_KINDS,
  CARTEL_SIZES_FOR,
  type CartelKind,
  type CartelPhoto,
  type CartelSize,
  type CartelStyle,
} from "./carteles";

export const SIGN_LAYOUTS = ["clasico", "centrado", "marco", "foto"] as const;
export type SignLayout = (typeof SIGN_LAYOUTS)[number];

export const SIGN_FONTS = [
  "moderna",
  "fina",
  "elegante",
  "clasica",
  "manuscrita",
  "redonda",
] as const;
export type SignFont = (typeof SIGN_FONTS)[number];

export const SIGN_WEIGHTS = ["fino", "normal", "marcado"] as const;
export type SignWeight = (typeof SIGN_WEIGHTS)[number];

/** Typsnitt med en enda vikt: grosor visas inte och ignoreras. */
export const SIGN_FONTS_SINGLE_WEIGHT: ReadonlySet<SignFont> = new Set([
  "manuscrita",
]);

export const SIGN_PALETTES = [
  "claro",
  "oscuro",
  "lima",
  "nude",
  "rosa",
  "salvia",
  "marfil",
  "negro-oro",
  "lavanda",
  "cielo",
] as const;
export type SignPalette = (typeof SIGN_PALETTES)[number];

/** Längsta egna rubrik och undertext (tecken, efter trimning). */
export const SIGN_TITLE_MAX = 40;
export const SIGN_SUBTITLE_MAX = 90;

/** Mönster (WP-96b): ritas i CSS med palettens färger, så de följer vald palett. */
export const SIGN_PATTERNS = [
  "degradado",
  "puntos",
  "rayas",
  "arcos",
  "ondas",
  "hojas",
] as const;
export type SignPattern = (typeof SIGN_PATTERNS)[number];

/** Omslagsbilden som bakgrund. Galleribilder anges med sitt `business_images.id`. */
export const SIGN_COVER_PHOTO = "portada";

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;

/** "portada" eller ett uuid (gemener, som Postgres skriver dem). */
export function isSignPhotoId(value: unknown): value is string {
  return (
    typeof value === "string" &&
    (value === SIGN_COVER_PHOTO || UUID_RE.test(value))
  );
}

/** Fotot sparas som id, aldrig som URL; adressen slås upp bland företagets egna bilder. */
export type SignBackground =
  | { tipo: "liso" }
  | { tipo: "patron"; patron: SignPattern }
  | { tipo: "foto"; foto: string };

export type SignDesign = {
  layout: SignLayout;
  fuente: SignFont;
  grosor: SignWeight;
  paleta: SignPalette;
  fondo: SignBackground;
  /** `null` = standardtexten (i18n). */
  titulo: string | null;
  subtitulo: string | null;
  mostrarLogo: boolean;
  tamano: CartelSize;
};

export type SignDesigns = Record<CartelKind, SignDesign>;

/** Standard = exakt WP-95:s skylt i stilen Claro. */
export function defaultSignDesign(kind: CartelKind): SignDesign {
  return {
    layout: "clasico",
    fuente: "moderna",
    grosor: "normal",
    paleta: "claro",
    fondo: { tipo: "liso" },
    titulo: null,
    subtitulo: null,
    mostrarLogo: true,
    tamano: CARTEL_SIZES_FOR[kind][0]!,
  };
}

/** WP-95:s `?estilo=` motsvarar en palett med samma namn. */
export function paletteForLegacyStyle(style: CartelStyle): SignPalette {
  return style;
}

function isRecord(v: unknown): v is Record<string, unknown> {
  return typeof v === "object" && v !== null && !Array.isArray(v);
}

function pick<T extends string>(
  list: readonly T[],
  value: unknown,
  fallback: T,
): T {
  return typeof value === "string" &&
    (list as readonly string[]).includes(value)
    ? (value as T)
    : fallback;
}

/** Tar bort styrtecken och radbrytningar, slår ihop blanksteg och trimmar. Tom text = `null`. */
export function cleanSignText(value: unknown, max: number): string | null {
  if (typeof value !== "string") return null;
  const text = value
    .replace(/[\u0000-\u001f\u007f-\u009f]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
  if (text.length === 0) return null;
  return Array.from(text).slice(0, max).join("");
}

/** Bakgrunden ur sparad data; allt okänt blir slät bakgrund. */
function parseBackground(value: unknown): SignBackground {
  if (!isRecord(value)) return { tipo: "liso" };
  if (
    value.tipo === "patron" &&
    typeof value.patron === "string" &&
    (SIGN_PATTERNS as readonly string[]).includes(value.patron)
  ) {
    return { tipo: "patron", patron: value.patron as SignPattern };
  }
  if (value.tipo === "foto" && isSignPhotoId(value.foto)) {
    return { tipo: "foto", foto: value.foto };
  }
  return { tipo: "liso" };
}

/** Bakgrundsfotots adress, eller `null` om bakgrunden inte är ett foto eller om bilden
 * inte längre finns bland företagets bilder (då ritas skylten med slät bakgrund). */
export function signPhotoUrl(
  fondo: SignBackground,
  fotos: readonly CartelPhoto[],
): string | null {
  if (fondo.tipo !== "foto") return null;
  return fotos.find((f) => f.id === fondo.foto)?.url ?? null;
}

/** En skylts design ur sparad data, fält för fält med standardvärden. */
export function parseSignDesign(kind: CartelKind, value: unknown): SignDesign {
  const d = defaultSignDesign(kind);
  if (!isRecord(value)) return d;
  return {
    layout: pick(SIGN_LAYOUTS, value.layout, d.layout),
    fuente: pick(SIGN_FONTS, value.fuente, d.fuente),
    grosor: pick(SIGN_WEIGHTS, value.grosor, d.grosor),
    paleta: pick(SIGN_PALETTES, value.paleta, d.paleta),
    fondo: parseBackground(value.fondo),
    titulo: cleanSignText(value.titulo, SIGN_TITLE_MAX),
    subtitulo: cleanSignText(value.subtitulo, SIGN_SUBTITLE_MAX),
    mostrarLogo:
      typeof value.mostrarLogo === "boolean"
        ? value.mostrarLogo
        : d.mostrarLogo,
    tamano: pick(CARTEL_SIZES_FOR[kind], value.tamano, d.tamano),
  };
}

/** Hela `businesses.sign_designs` (`{ v: 1, reservas?, cuenta? }`). */
export function parseSignDesigns(value: unknown): SignDesigns {
  const root = isRecord(value) ? value : {};
  return Object.fromEntries(
    CARTEL_KINDS.map((kind) => [kind, parseSignDesign(kind, root[kind])]),
  ) as SignDesigns;
}

/** Två designer är lika (för "Cambios sin guardar"). */
export function sameSignDesign(a: SignDesign, b: SignDesign): boolean {
  return JSON.stringify(a) === JSON.stringify(b);
}
