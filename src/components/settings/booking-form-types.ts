// Klientens typer för kategorier och bokningsfrågor (WP-40 steg 5–8, D-031).
// Speglar `src/server/owner/booking-questions.ts` och
// `src/lib/validation/booking-questions.ts`, duplicerade i stället för
// importerade: en "use client"-fil importerar aldrig `@/server/*` (samma
// regel som `./types.ts`).

export const QUESTION_KINDS = [
  "short_text",
  "long_text",
  "single_choice",
  "multi_choice",
  "number",
  "yes_no",
  "date",
] as const;

export type QuestionKind = (typeof QUESTION_KINDS)[number];

const CHOICE_KINDS = new Set<QuestionKind>(["single_choice", "multi_choice"]);

export function isChoiceKind(kind: QuestionKind): boolean {
  return CHOICE_KINDS.has(kind);
}

export type Targets =
  | { appliesTo: "all" }
  | { appliesTo: "targets"; serviceIds: string[]; categoryIds: string[] };

export type BookingFormCategory = {
  id: string;
  name: string;
  sort: number;
  serviceCount: number;
};

export type BookingFormService = {
  id: string;
  name: string;
  active: boolean;
  categoryId: string | null;
  /** Aktiva frågor som gäller tjänsten ("N av 5"). */
  questionCount: number;
};

export type BookingFormQuestion = {
  id: string;
  label: string;
  help: string | null;
  kind: QuestionKind;
  options: readonly string[] | null;
  required: boolean;
  saveToCustomer: boolean;
  presetKey: string | null;
  appliesTo: "all" | "targets";
  active: boolean;
  sort: number;
  /** Tomma om `appliesTo === "all"`. */
  serviceIds: string[];
  categoryIds: string[];
};

export type BookingFormSettings = {
  categories: BookingFormCategory[];
  services: BookingFormService[];
  questions: BookingFormQuestion[];
  maxPerService: number;
};

export type BookingFormBundle = {
  settings: BookingFormSettings;
  /** `businesses.category` (rubro); `null` = "Otro"/utan val. */
  businessCategory: string | null;
};

export type LoadViolations = {
  all: boolean;
  serviceIds: string[];
  categoryIds: string[];
};

export type MutationResult =
  { ok: true } | { ok: false; code: string; violations?: LoadViolations };
export type CreateResult =
  | { ok: true; id: string }
  | { ok: false; code: string; violations?: LoadViolations };

export type QuestionFieldsInput = {
  label: string;
  help?: string | null;
  kind: QuestionKind;
  options?: string[] | null;
  required?: boolean;
  saveToCustomer?: boolean;
};

/** Fråga så som bokningsformuläret (kundsidan) ser den, för förhandsvisningen. */
export type BookingQuestionPreviewDef = {
  id: string;
  label: string;
  help: string | null;
  kind: QuestionKind;
  options: readonly string[] | null;
  required: boolean;
  saveToCustomer: boolean;
};

export type BookingFormActions = {
  createCategory: (input: unknown) => Promise<CreateResult>;
  renameCategory: (id: string, input: unknown) => Promise<MutationResult>;
  deleteCategory: (id: string) => Promise<MutationResult>;
  reorderCategories: (orderedIds: string[]) => Promise<MutationResult>;
  setServiceCategory: (
    serviceId: string,
    categoryId: string | null,
  ) => Promise<MutationResult>;
  createQuestion: (input: unknown) => Promise<CreateResult>;
  activatePreset: (input: unknown) => Promise<CreateResult>;
  updateQuestion: (id: string, input: unknown) => Promise<MutationResult>;
  setQuestionActive: (id: string, active: boolean) => Promise<MutationResult>;
  setQuestionTargets: (id: string, targets: unknown) => Promise<MutationResult>;
  reorderQuestions: (orderedIds: string[]) => Promise<MutationResult>;
  deleteQuestion: (id: string) => Promise<MutationResult>;
  getQuestionsForService: (
    serviceId: string,
  ) => Promise<BookingQuestionPreviewDef[]>;
};
