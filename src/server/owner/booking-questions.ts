import "server-only";

/**
 * Ägarens kategorier och bokningsfrågor (WP-40 steg 3, D-031): Inställningar
 * → Bokningsformulär (A), tjänstens flik "Frågor vid bokning" (B) och
 * kategorierna. Allt går via `withOwnerTx` (RLS, D-019) och filtrerar
 * dessutom på `business_id` (D-014). `userId` och `businessId` kommer från
 * den verifierade sessionen i server action-lagret, aldrig från klienten.
 *
 * Spärr: en ändring som skulle ge någon tjänst (eller en ny tjänst i en
 * kategori, eller alla tjänster) fler än 5 aktiva frågor rullas tillbaka med
 * `too_many_questions` och `violations` (vilka tjänster/kategorier).
 *
 * Felkoder är data; UI mappar dem via i18n.
 */
import { market as installationMarket, type Market } from "@/config/brand";
import * as presetsEs from "@/i18n/presets/booking-questions.es-CL";
import * as presetsSv from "@/i18n/presets/booking-questions.sv-SE";
import { pgErrorCode } from "@/server/db/errors";
import type { Queryable } from "@/server/db/pool";
import { withOwnerTx } from "@/server/db/tx";
import {
  loadQuestionCatalogIn,
  QUESTION_COLUMNS,
  toCatalogQuestion,
  type QuestionRow,
} from "@/server/booking-questions/catalog";
import {
  hasViolations,
  MAX_QUESTIONS_PER_SERVICE,
  questionLoadViolations,
  questionsForService,
  type CatalogQuestion,
  type LoadViolations,
} from "@/server/booking-questions/resolve";

import {
  activatePresetInputSchema,
  categoryNameInputSchema,
  createQuestionInputSchema,
  firstCode,
  questionFieldsSchema,
  reorderInputSchema,
  targetsInputSchema,
  type ActivatePresetInput,
  type CreateQuestionInput,
  type QuestionFields,
  type QuestionFieldsInput,
  type Targets,
  type TargetsInput,
} from "./booking-questions-schemas";

export { MAX_QUESTIONS_PER_SERVICE };
export type {
  ActivatePresetInput,
  CreateQuestionInput,
  LoadViolations,
  QuestionFieldsInput,
  TargetsInput,
};

export type BookingFormErrorCode =
  | "invalid_input"
  | "not_found"
  | "unauthorized"
  | "too_many_questions"
  | "invalid_target"
  | "preset_not_found"
  | "category.name_empty"
  | "category.name_too_long"
  | "category.name_taken"
  | "question.label_empty"
  | "question.label_too_long"
  | "question.help_too_long"
  | "question.kind_invalid"
  | "question.options_required"
  | "question.options_invalid"
  | "question.options_duplicate"
  | "unknown";

export type BookingFormFailure = {
  ok: false;
  code: BookingFormErrorCode;
  /** Bara vid `too_many_questions`. */
  violations?: LoadViolations;
};
export type BookingFormResult = { ok: true } | BookingFormFailure;
export type BookingFormCreateResult =
  { ok: true; id: string } | BookingFormFailure;

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function fail(code: string): BookingFormFailure {
  return { ok: false, code: code as BookingFormErrorCode };
}

function pgConstraint(e: unknown): string | undefined {
  if (typeof e !== "object" || e === null || !("constraint" in e)) {
    return undefined;
  }
  const v = (e as Record<string, unknown>).constraint;
  return typeof v === "string" ? v : undefined;
}

/** Bara SQLSTATE/constraint, aldrig `detail` (errors.ts). */
function mapDbError(e: unknown): BookingFormErrorCode {
  const code = pgErrorCode(e);
  const constraint = pgConstraint(e);
  if (code === "42501") return "unauthorized";
  if (
    code === "23505" &&
    constraint === "service_categories_business_id_name_key"
  ) {
    return "category.name_taken";
  }
  if (code === "23503") return "invalid_target";
  if (code === "22P02") return "invalid_input";
  return "unknown";
}

/** Bär ett förväntat fel ut ur transaktionen så att den rullas tillbaka. */
class Abort extends Error {
  constructor(readonly result: BookingFormFailure) {
    super("abort");
  }
}

async function ownerMutation<T extends { ok: true }>(
  userId: string,
  fn: (q: Queryable) => Promise<T | BookingFormFailure>,
): Promise<T | BookingFormFailure> {
  if (!UUID.test(userId)) return fail("unauthorized");
  try {
    return await withOwnerTx(userId, async (q) => {
      const r = await fn(q);
      if (!r.ok) throw new Abort(r);
      return r;
    });
  } catch (e) {
    if (e instanceof Abort) return e.result;
    return fail(mapDbError(e));
  }
}

/** Max 5-spärren efter en ändring (i samma transaktion). */
async function checkLoad(
  q: Queryable,
  businessId: string,
): Promise<BookingFormFailure | undefined> {
  const c = await loadQuestionCatalogIn(q, businessId);
  const v = questionLoadViolations(
    c.questions,
    c.targets,
    c.services,
    c.categoryIds,
  );
  return hasViolations(v)
    ? { ok: false, code: "too_many_questions", violations: v }
    : undefined;
}

async function nextSort(
  q: Queryable,
  table: "service_categories" | "booking_questions",
  businessId: string,
): Promise<number> {
  const r = await q.query<{ next: number }>(
    `select coalesce(max(sort), 0) + 1 as next from public.${table} where business_id = $1`,
    [businessId],
  );
  return r.rows[0]?.next ?? 1;
}

async function reorder(
  q: Queryable,
  table: "service_categories" | "booking_questions",
  businessId: string,
  ids: readonly string[],
): Promise<BookingFormResult> {
  const r = await q.query(
    `update public.${table} t
        set sort = x.ord
       from unnest($2::uuid[]) with ordinality as x(id, ord)
      where t.business_id = $1 and t.id = x.id`,
    [businessId, ids],
  );
  return (r.rowCount ?? 0) === ids.length ? { ok: true } : fail("not_found");
}

// ---------------------------------------------------------------------------
// Läsning (A/B och kategorilistan)
// ---------------------------------------------------------------------------

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

export type BookingFormQuestion = CatalogQuestion & {
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

export async function loadBookingFormSettingsIn(
  q: Queryable,
  businessId: string,
): Promise<BookingFormSettings> {
  const catalog = await loadQuestionCatalogIn(q, businessId);
  const categories = await q.query<{
    id: string;
    name: string;
    sort: number;
    service_count: number;
  }>(
    `select c.id, c.name, c.sort,
            (select count(*)::int from public.services s
              where s.business_id = c.business_id and s.category_id = c.id) as service_count
       from public.service_categories c
      where c.business_id = $1
      order by c.sort, c.name`,
    [businessId],
  );
  const services = await q.query<{
    id: string;
    name: string;
    active: boolean;
    category_id: string | null;
  }>(
    `select id, name, active, category_id
       from public.services
      where business_id = $1
      order by sort, name`,
    [businessId],
  );
  return {
    categories: categories.rows.map((c) => ({
      id: c.id,
      name: c.name,
      sort: c.sort,
      serviceCount: c.service_count,
    })),
    services: services.rows.map((s) => {
      const applying = questionsForService(catalog.questions, catalog.targets, {
        id: s.id,
        categoryId: s.category_id,
      });
      return {
        id: s.id,
        name: s.name,
        active: s.active,
        categoryId: s.category_id,
        questionCount: applying.questions.length + applying.dropped,
      };
    }),
    questions: catalog.questions.map((x) => ({
      ...x,
      serviceIds:
        x.appliesTo === "all"
          ? []
          : catalog.targets
              .filter((t) => t.questionId === x.id && t.serviceId !== null)
              .map((t) => t.serviceId!),
      categoryIds:
        x.appliesTo === "all"
          ? []
          : catalog.targets
              .filter((t) => t.questionId === x.id && t.categoryId !== null)
              .map((t) => t.categoryId!),
    })),
    maxPerService: MAX_QUESTIONS_PER_SERVICE,
  };
}

export function loadBookingFormSettings(
  userId: string,
  businessId: string,
): Promise<BookingFormSettings> {
  return withOwnerTx(userId, (q) => loadBookingFormSettingsIn(q, businessId));
}

// ---------------------------------------------------------------------------
// Kategorier
// ---------------------------------------------------------------------------

export async function createCategory(
  userId: string,
  businessId: string,
  rawInput: unknown,
): Promise<BookingFormCreateResult> {
  const p = categoryNameInputSchema.safeParse(rawInput);
  if (!p.success) return fail(firstCode(p.error));
  return ownerMutation(userId, async (q) => {
    const sort = await nextSort(q, "service_categories", businessId);
    const r = await q.query<{ id: string }>(
      `insert into public.service_categories (business_id, name, sort)
       values ($1, $2, $3) returning id`,
      [businessId, p.data.name, sort],
    );
    const id = r.rows[0]?.id;
    return id ? { ok: true as const, id } : fail("unauthorized");
  });
}

export async function renameCategory(
  userId: string,
  businessId: string,
  categoryId: string,
  rawInput: unknown,
): Promise<BookingFormResult> {
  const p = categoryNameInputSchema.safeParse(rawInput);
  if (!p.success) return fail(firstCode(p.error));
  if (!UUID.test(categoryId)) return fail("not_found");
  return ownerMutation(userId, async (q) => {
    const r = await q.query(
      `update public.service_categories set name = $3
        where business_id = $1 and id = $2`,
      [businessId, categoryId, p.data.name],
    );
    return r.rowCount ? { ok: true as const } : fail("not_found");
  });
}

/** Tjänsterna i kategorin blir utan kategori; kategorimålen försvinner. */
export async function deleteCategory(
  userId: string,
  businessId: string,
  categoryId: string,
): Promise<BookingFormResult> {
  if (!UUID.test(categoryId)) return fail("not_found");
  return ownerMutation(userId, async (q) => {
    const r = await q.query(
      `delete from public.service_categories where business_id = $1 and id = $2`,
      [businessId, categoryId],
    );
    return r.rowCount ? { ok: true as const } : fail("not_found");
  });
}

/** `orderedIds` = kategorierna i ny ordning (sort = 1, 2, …). */
export async function reorderCategories(
  userId: string,
  businessId: string,
  orderedIds: unknown,
): Promise<BookingFormResult> {
  const p = reorderInputSchema.safeParse(orderedIds);
  if (!p.success) return fail(firstCode(p.error));
  return ownerMutation(userId, (q) =>
    reorder(q, "service_categories", businessId, p.data),
  );
}

/** `categoryId` null = ingen kategori. Spärras om tjänsten får > 5 frågor. */
export async function setServiceCategory(
  userId: string,
  businessId: string,
  serviceId: string,
  categoryId: string | null,
): Promise<BookingFormResult> {
  if (!UUID.test(serviceId)) return fail("not_found");
  if (categoryId !== null && !UUID.test(categoryId)) {
    return fail("invalid_target");
  }
  return ownerMutation(userId, async (q) => {
    const r = await q.query(
      `update public.services set category_id = $3
        where business_id = $1 and id = $2`,
      [businessId, serviceId, categoryId],
    );
    if (!r.rowCount) return fail("not_found");
    return (await checkLoad(q, businessId)) ?? { ok: true as const };
  });
}

// ---------------------------------------------------------------------------
// Frågor
// ---------------------------------------------------------------------------

async function replaceTargets(
  q: Queryable,
  businessId: string,
  questionId: string,
  targets: Targets,
): Promise<void> {
  await q.query(
    `update public.booking_questions set applies_to = $3::public.booking_question_applies_to
      where business_id = $1 and id = $2`,
    [businessId, questionId, targets.appliesTo],
  );
  await q.query(
    `delete from public.booking_question_targets where business_id = $1 and question_id = $2`,
    [businessId, questionId],
  );
  if (targets.appliesTo === "all") return;
  if (targets.serviceIds.length > 0) {
    await q.query(
      `insert into public.booking_question_targets (business_id, question_id, service_id)
       select $1, $2, s from unnest($3::uuid[]) as s`,
      [businessId, questionId, targets.serviceIds],
    );
  }
  if (targets.categoryIds.length > 0) {
    await q.query(
      `insert into public.booking_question_targets (business_id, question_id, category_id)
       select $1, $2, c from unnest($3::uuid[]) as c`,
      [businessId, questionId, targets.categoryIds],
    );
  }
}

async function insertQuestion(
  q: Queryable,
  businessId: string,
  fields: QuestionFields,
  presetKey: string | null,
  active: boolean,
  targets: Targets,
): Promise<string> {
  const sort = await nextSort(q, "booking_questions", businessId);
  const r = await q.query<{ id: string }>(
    `insert into public.booking_questions
       (business_id, label, help, kind, options, required, save_to_customer,
        preset_key, applies_to, active, sort)
     values ($1, $2, $3, $4::public.question_kind, $5::jsonb, $6, $7, $8,
             $9::public.booking_question_applies_to, $10, $11)
     returning id`,
    [
      businessId,
      fields.label,
      fields.help,
      fields.kind,
      fields.options === null ? null : JSON.stringify(fields.options),
      fields.required,
      fields.saveToCustomer,
      presetKey,
      targets.appliesTo,
      active,
      sort,
    ],
  );
  const id = r.rows[0]!.id;
  await replaceTargets(q, businessId, id, targets);
  return id;
}

/** Egen fråga: `{ question, targets, active? }`. */
export async function createQuestion(
  userId: string,
  businessId: string,
  rawInput: unknown,
): Promise<BookingFormCreateResult> {
  const p = createQuestionInputSchema.safeParse(rawInput);
  if (!p.success) return fail(firstCode(p.error));
  const input = p.data;
  return ownerMutation(userId, async (q) => {
    const id = await insertQuestion(
      q,
      businessId,
      input.question,
      null,
      input.active,
      input.targets,
    );
    return (await checkLoad(q, businessId)) ?? { ok: true as const, id };
  });
}

type Preset = presetsEs.BookingQuestionPreset;

function presetsFor(m: Market): Readonly<Record<string, readonly Preset[]>> {
  return m === "SE"
    ? presetsSv.BOOKING_QUESTION_PRESETS
    : presetsEs.BOOKING_QUESTION_PRESETS;
}

/** Förslaget för bransch + nyckel på installationens språk, annars undefined. */
export function findPreset(
  industry: string,
  presetKey: string,
  m: Market = installationMarket,
): Preset | undefined {
  const all = presetsFor(m);
  if (!Object.hasOwn(all, industry)) return undefined;
  return all[industry]?.find((x) => x.key === presetKey);
}

/**
 * Slår på ett branschförslag. Finns redan en fråga med samma `preset_key`
 * aktiveras den (och får nya mål om `targets` anges); annars skapas den från
 * förslaget (standard: gäller alla tjänster). Stängs av med
 * `setQuestionActive(…, false)`.
 */
export async function activatePreset(
  userId: string,
  businessId: string,
  rawInput: unknown,
  opts: { market?: Market } = {},
): Promise<BookingFormCreateResult> {
  const p = activatePresetInputSchema.safeParse(rawInput);
  if (!p.success) return fail(firstCode(p.error));
  const preset = findPreset(
    p.data.industry,
    p.data.presetKey,
    opts.market ?? installationMarket,
  );
  if (!preset) return fail("preset_not_found");
  const fields = questionFieldsSchema.safeParse({
    label: preset.label,
    help: preset.help ?? null,
    kind: preset.type,
    options: preset.options ? [...preset.options] : null,
    required: preset.required,
    saveToCustomer: preset.saveToCustomer,
  });
  // Förslagen är kod; ett ogiltigt förslag är ett programmeringsfel.
  if (!fields.success) return fail("preset_not_found");
  const targets = p.data.targets;
  return ownerMutation(userId, async (q) => {
    const existing = await q.query<{ id: string }>(
      `select id from public.booking_questions
        where business_id = $1 and preset_key = $2
        order by sort, id limit 1`,
      [businessId, preset.key],
    );
    let id = existing.rows[0]?.id;
    if (id) {
      await q.query(
        `update public.booking_questions set active = true
          where business_id = $1 and id = $2`,
        [businessId, id],
      );
      if (targets) await replaceTargets(q, businessId, id, targets);
    } else {
      id = await insertQuestion(
        q,
        businessId,
        fields.data,
        preset.key,
        true,
        targets ?? { appliesTo: "all" },
      );
    }
    return (await checkLoad(q, businessId)) ?? { ok: true as const, id };
  });
}

/**
 * Redigerar frågans innehåll (inte mål/aktiv/ordning). Byts typen, eller
 * stängs "sparas på kundkortet" av, raderas kundkortets sparade värden för
 * frågan (dataminimering; bokningarnas svar finns kvar med sin kopia).
 */
export async function updateQuestion(
  userId: string,
  businessId: string,
  questionId: string,
  rawInput: unknown,
): Promise<BookingFormResult> {
  const p = questionFieldsSchema.safeParse(rawInput);
  if (!p.success) return fail(firstCode(p.error));
  if (!UUID.test(questionId)) return fail("not_found");
  const f = p.data;
  return ownerMutation(userId, async (q) => {
    const before = await q.query<{ kind: string }>(
      `select kind from public.booking_questions
        where business_id = $1 and id = $2 for update`,
      [businessId, questionId],
    );
    const old = before.rows[0];
    if (!old) return fail("not_found");
    await q.query(
      `update public.booking_questions
          set label = $3, help = $4, kind = $5::public.question_kind,
              options = $6::jsonb, required = $7, save_to_customer = $8
        where business_id = $1 and id = $2`,
      [
        businessId,
        questionId,
        f.label,
        f.help,
        f.kind,
        f.options === null ? null : JSON.stringify(f.options),
        f.required,
        f.saveToCustomer,
      ],
    );
    if (!f.saveToCustomer || old.kind !== f.kind) {
      await q.query(
        `delete from public.customer_answers where business_id = $1 and question_id = $2`,
        [businessId, questionId],
      );
    }
    return { ok: true as const };
  });
}

export async function setQuestionActive(
  userId: string,
  businessId: string,
  questionId: string,
  active: boolean,
): Promise<BookingFormResult> {
  if (!UUID.test(questionId)) return fail("not_found");
  return ownerMutation(userId, async (q) => {
    const r = await q.query(
      `update public.booking_questions set active = $3
        where business_id = $1 and id = $2`,
      [businessId, questionId, active],
    );
    if (!r.rowCount) return fail("not_found");
    if (!active) return { ok: true as const };
    return (await checkLoad(q, businessId)) ?? { ok: true as const };
  });
}

/** "Gäller för" i ett anrop: `{ appliesTo: "all" }` eller listor. */
export async function setQuestionTargets(
  userId: string,
  businessId: string,
  questionId: string,
  rawTargets: unknown,
): Promise<BookingFormResult> {
  const p = targetsInputSchema.safeParse(rawTargets);
  if (!p.success) return fail(firstCode(p.error));
  if (!UUID.test(questionId)) return fail("not_found");
  return ownerMutation(userId, async (q) => {
    const exists = await q.query<QuestionRow>(
      `select ${QUESTION_COLUMNS} from public.booking_questions
        where business_id = $1 and id = $2 for update`,
      [businessId, questionId],
    );
    const row = exists.rows[0];
    if (!row) return fail("not_found");
    await replaceTargets(q, businessId, questionId, p.data);
    if (!toCatalogQuestion(row).active) return { ok: true as const };
    return (await checkLoad(q, businessId)) ?? { ok: true as const };
  });
}

export async function reorderQuestions(
  userId: string,
  businessId: string,
  orderedIds: unknown,
): Promise<BookingFormResult> {
  const p = reorderInputSchema.safeParse(orderedIds);
  if (!p.success) return fail(firstCode(p.error));
  return ownerMutation(userId, (q) =>
    reorder(q, "booking_questions", businessId, p.data),
  );
}

/** Bokningarnas svar finns kvar (kopia av etikett/typ, `question_id` null). */
export async function deleteQuestion(
  userId: string,
  businessId: string,
  questionId: string,
): Promise<BookingFormResult> {
  if (!UUID.test(questionId)) return fail("not_found");
  return ownerMutation(userId, async (q) => {
    const r = await q.query(
      `delete from public.booking_questions where business_id = $1 and id = $2`,
      [businessId, questionId],
    );
    return r.rowCount ? { ok: true as const } : fail("not_found");
  });
}
