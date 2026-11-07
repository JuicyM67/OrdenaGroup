/**
 * WP-66 (D-046): delade former för AI-importen ("Flytta hit från ditt
 * nuvarande bokningssystem"). Ingen `server-only`: förhandsgranskningens typ
 * används av klientkomponenten (`src/components/import/`), och urvalet ägaren
 * skickar tillbaka valideras här FÖRST på formen och sedan, rad för rad, av
 * samma Zod-scheman som onboarding/Ajustes på servern (hård regel 2).
 * Felkoder, ingen text (hård regel 6).
 */
import { z } from "zod";

export type ImportHour = {
  weekday: 1 | 2 | 3 | 4 | 5 | 6 | 7;
  open: boolean;
  start: string;
  end: string;
};

export type ImportPreviewService = {
  name: string;
  description: string;
  /** Formulärtext (minuter), "" = okänd. */
  durationMin: string;
  /** Formulärtext i marknadens huvudvaluta (pesos/kronor), "" = okänt. */
  price: string;
  priceFrom: boolean;
  category: string;
  /** Ajustes: en tjänst med samma namn finns redan → hoppas över. */
  exists: boolean;
};

export type ImportPreviewStaff = {
  name: string;
  title: string;
  exists: boolean;
};

export type ImportPreview = {
  platformName: string | null;
  confidence: "high" | "medium" | "low";
  notes: string[];
  profile: {
    name: string;
    about: string;
    address: string;
    district: string;
    phone: string;
    email: string;
    website: string;
    instagram: string;
    tiktok: string;
    facebook: string;
    /** En av `RUBRO_KEYS` eller "". */
    category: string;
  };
  /** Sju dagar (måndag först) om sidan visade öppettider, annars tom. */
  hours: ImportHour[];
  categories: string[];
  services: ImportPreviewService[];
  staff: ImportPreviewStaff[];
  /** Visas bara som länkar — bilder importeras inte i v1 (upphovsrätt). */
  images: { logoUrl: string; coverUrl: string };
};

export type ImportExtractResponse =
  { ok: true; preview: ImportPreview } | { ok: false; code: string };

/** Fälten i profilen som kan importeras (tomma utelämnas av klienten). */
export const IMPORT_PROFILE_FIELDS = [
  "about",
  "address",
  "phone",
  "instagram",
  "tiktok",
  "facebook",
] as const;
export type ImportProfileField = (typeof IMPORT_PROFILE_FIELDS)[number];

const text = (max: number) => z.string().max(max);

/** Urvalet från förhandsgranskningen (Ajustes → "Importar lo seleccionado"). */
export const importSelectionSchema = z.object({
  profile: z
    .object({
      about: text(3000).optional(),
      address: text(400).optional(),
      phone: text(40).optional(),
      instagram: text(300).optional(),
      tiktok: text(300).optional(),
      facebook: text(300).optional(),
    })
    .strict(),
  hours: z
    .array(
      z.object({
        weekday: z.union([
          z.literal(1),
          z.literal(2),
          z.literal(3),
          z.literal(4),
          z.literal(5),
          z.literal(6),
          z.literal(7),
        ]),
        open: z.boolean(),
        start: text(8),
        end: text(8),
      }),
    )
    .max(7)
    .nullable(),
  services: z
    .array(
      z.object({
        name: text(300),
        description: text(1000),
        durationMin: text(10),
        price: text(20),
        // WP-84 (D-069): precio "desde" följer med (frivillig för äldre klienter).
        priceFrom: z.boolean().optional(),
        category: text(200),
      }),
    )
    .max(50),
  staff: z.array(z.object({ name: text(300), title: text(300) })).max(30),
});
export type ImportSelection = z.infer<typeof importSelectionSchema>;

export type ImportApplyResult =
  | {
      ok: true;
      created: { services: number; staff: number; categories: number };
      skipped: { services: string[]; staff: string[] };
    }
  | { ok: false; code: string; item?: string };
