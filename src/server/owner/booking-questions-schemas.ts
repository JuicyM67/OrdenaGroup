import "server-only";

/**
 * Indata för ägarens CRUD av kategorier och bokningsfrågor (WP-40 steg 3,
 * D-031). Felkoder är data (samma alfabet som `ajustes-schemas.ts`); UI
 * mappar dem via i18n.
 */
import { z } from "zod";

import { QUESTION_KINDS } from "@/lib/validation/booking-questions";

// z.guid(), inte z.uuid(): seedens "vanity"-id:n (se scheduling/schemas.ts).
const id = z.guid({ error: "invalid_input" });

export const LIMITS = {
  categoryName: 60,
  label: 200,
  help: 300,
  option: 80,
  options: 20,
  targets: 200,
} as const;

export const categoryNameInputSchema = z.strictObject({
  name: z
    .string({ error: "category.name_empty" })
    .trim()
    .min(1, { error: "category.name_empty" })
    .max(LIMITS.categoryName, { error: "category.name_too_long" }),
});

const uniqueIds = (max: number) =>
  z
    .array(id, { error: "invalid_input" })
    .max(max, { error: "invalid_input" })
    .refine((v) => new Set(v).size === v.length, { error: "invalid_input" });

export const reorderInputSchema = uniqueIds(LIMITS.targets);

/** "Gäller för": alla tjänster, eller en lista tjänster och/eller kategorier. */
export const targetsInputSchema = z.discriminatedUnion(
  "appliesTo",
  [
    z.strictObject({ appliesTo: z.literal("all") }),
    z.strictObject({
      appliesTo: z.literal("targets"),
      serviceIds: uniqueIds(LIMITS.targets).default([]),
      categoryIds: uniqueIds(LIMITS.targets).default([]),
    }),
  ],
  { error: "invalid_input" },
);

export type TargetsInput = z.input<typeof targetsInputSchema>;
export type Targets = z.output<typeof targetsInputSchema>;

const CHOICE = new Set(["single_choice", "multi_choice"]);

export const questionFieldsSchema = z
  .strictObject({
    label: z
      .string({ error: "question.label_empty" })
      .trim()
      .min(1, { error: "question.label_empty" })
      .max(LIMITS.label, { error: "question.label_too_long" }),
    help: z
      .string({ error: "question.help_too_long" })
      .trim()
      .max(LIMITS.help, { error: "question.help_too_long" })
      .nullish()
      .transform((v) => (v ? v : null)),
    kind: z.enum(QUESTION_KINDS, { error: "question.kind_invalid" }),
    options: z
      .array(
        z
          .string({ error: "question.options_invalid" })
          .trim()
          .min(1, { error: "question.options_invalid" })
          .max(LIMITS.option, { error: "question.options_invalid" }),
        { error: "question.options_invalid" },
      )
      .max(LIMITS.options, { error: "question.options_invalid" })
      .nullish(),
    required: z.boolean({ error: "invalid_input" }).default(false),
    saveToCustomer: z.boolean({ error: "invalid_input" }).default(false),
  })
  .transform((v, ctx) => {
    const isChoice = CHOICE.has(v.kind);
    const options = isChoice ? (v.options ?? []) : [];
    if (isChoice && options.length === 0) {
      ctx.issues.push({
        code: "custom",
        message: "question.options_required",
        input: v,
      });
      return z.NEVER;
    }
    if (new Set(options).size !== options.length) {
      ctx.issues.push({
        code: "custom",
        message: "question.options_duplicate",
        input: v,
      });
      return z.NEVER;
    }
    return { ...v, options: isChoice ? options : null };
  });

export type QuestionFieldsInput = z.input<typeof questionFieldsSchema>;
export type QuestionFields = z.output<typeof questionFieldsSchema>;

export const createQuestionInputSchema = z.strictObject({
  question: questionFieldsSchema,
  targets: targetsInputSchema,
  active: z.boolean({ error: "invalid_input" }).default(true),
});

export type CreateQuestionInput = z.input<typeof createQuestionInputSchema>;

export const activatePresetInputSchema = z.strictObject({
  industry: z.string({ error: "preset_not_found" }).max(40),
  presetKey: z.string({ error: "preset_not_found" }).max(80),
  targets: targetsInputSchema.optional(),
});

export type ActivatePresetInput = z.input<typeof activatePresetInputSchema>;

/** Första issue-meddelandet (en felkod) eller `invalid_input`. */
export function firstCode(e: z.ZodError): string {
  return e.issues[0]?.message ?? "invalid_input";
}
