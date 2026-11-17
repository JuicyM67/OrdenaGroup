import "server-only";

// Skylteditorn (WP-96, D-080): strikt validering när en design sparas. Bara kända värden
// (whitelists), inga extra fält, texter med längdgräns. Texterna rensas från styrtecken
// och radbrytningar med samma funktion som läsningen (`cleanSignText`).
import { z } from "zod";

import {
  CARTEL_KINDS,
  CARTEL_SIZES_FOR,
  type CartelKind,
} from "@/lib/share/carteles";
import {
  SIGN_FONTS,
  SIGN_LAYOUTS,
  SIGN_PALETTES,
  SIGN_SUBTITLE_MAX,
  SIGN_TITLE_MAX,
  SIGN_WEIGHTS,
  cleanSignText,
  type SignDesign,
} from "@/lib/share/carteles-design";

function signText(max: number) {
  return z
    .string()
    .max(max * 4)
    .nullable()
    .transform((v, ctx) => {
      if (v === null) return null;
      const clean = cleanSignText(v, Number.MAX_SAFE_INTEGER);
      if (clean !== null && Array.from(clean).length > max) {
        ctx.addIssue({ code: "custom", message: "too_long" });
        return z.NEVER;
      }
      return clean;
    });
}

function designSchema(kind: CartelKind) {
  return z
    .object({
      layout: z.enum(SIGN_LAYOUTS),
      fuente: z.enum(SIGN_FONTS),
      grosor: z.enum(SIGN_WEIGHTS),
      paleta: z.enum(SIGN_PALETTES),
      fondo: z.object({ tipo: z.literal("liso") }).strict(),
      titulo: signText(SIGN_TITLE_MAX),
      subtitulo: signText(SIGN_SUBTITLE_MAX),
      mostrarLogo: z.boolean(),
      tamano: z.enum(CARTEL_SIZES_FOR[kind] as [string, ...string[]]),
    })
    .strict();
}

export const cartelKindSchema = z.enum(CARTEL_KINDS);

export type SignDesignResult =
  { ok: true; design: SignDesign } | { ok: false; code: "invalid" };

export function validateSignDesign(
  kind: CartelKind,
  input: unknown,
): SignDesignResult {
  const r = designSchema(kind).safeParse(input);
  if (!r.success) return { ok: false, code: "invalid" };
  return { ok: true, design: r.data as SignDesign };
}
