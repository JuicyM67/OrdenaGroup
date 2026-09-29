import "server-only";

/**
 * Läser frågekatalogen (WP-40 steg 3, D-031) och löser upp vilka frågor som
 * gäller en tjänst. Varje fråga filtrerar på `business_id` (service role
 * förbigår RLS, ARCHITECTURE princip 3); ägarens väg går via `withOwnerTx`
 * och RLS.
 */
import type { Queryable } from "@/server/db/pool";
import { withOwnerTx, withServiceTx } from "@/server/db/tx";
import type {
  BookingQuestionDef,
  QuestionKind,
} from "@/lib/validation/booking-questions";

import {
  questionsForService,
  type CatalogQuestion,
  type CatalogService,
  type QuestionTarget,
} from "./resolve";

export type QuestionCatalog = {
  questions: CatalogQuestion[];
  targets: QuestionTarget[];
  services: CatalogService[];
  categoryIds: string[];
};

type QuestionRow = {
  id: string;
  label: string;
  help: string | null;
  kind: QuestionKind;
  options: string[] | null;
  required: boolean;
  save_to_customer: boolean;
  preset_key: string | null;
  applies_to: "all" | "targets";
  active: boolean;
  sort: number;
};

type TargetRow = {
  question_id: string;
  service_id: string | null;
  category_id: string | null;
};

type ServiceRow = { id: string; category_id: string | null };

export function toCatalogQuestion(r: QuestionRow): CatalogQuestion {
  return {
    id: r.id,
    label: r.label,
    help: r.help,
    kind: r.kind,
    options: r.options,
    required: r.required,
    saveToCustomer: r.save_to_customer,
    presetKey: r.preset_key,
    appliesTo: r.applies_to,
    active: r.active,
    sort: r.sort,
  };
}

export const QUESTION_COLUMNS = `id, label, help, kind, options, required, save_to_customer,
            preset_key, applies_to, active, sort`;

export type { QuestionRow };

/** Hela katalogen för ett företag (frågor, mål, tjänster, kategorier). */
export async function loadQuestionCatalogIn(
  q: Queryable,
  businessId: string,
): Promise<QuestionCatalog> {
  const questions = await q.query<QuestionRow>(
    `select ${QUESTION_COLUMNS}
       from public.booking_questions
      where business_id = $1
      order by sort, id`,
    [businessId],
  );
  const targets = await q.query<TargetRow>(
    `select question_id, service_id, category_id
       from public.booking_question_targets
      where business_id = $1`,
    [businessId],
  );
  const services = await q.query<ServiceRow>(
    `select id, category_id from public.services where business_id = $1`,
    [businessId],
  );
  const categories = await q.query<{ id: string }>(
    `select id from public.service_categories where business_id = $1 order by sort, name`,
    [businessId],
  );
  return {
    questions: questions.rows.map(toCatalogQuestion),
    targets: targets.rows.map((t) => ({
      questionId: t.question_id,
      serviceId: t.service_id,
      categoryId: t.category_id,
    })),
    services: services.rows.map((s) => ({
      id: s.id,
      categoryId: s.category_id,
    })),
    categoryIds: categories.rows.map((c) => c.id),
  };
}

function toDef(q: CatalogQuestion): BookingQuestionDef {
  return {
    id: q.id,
    label: q.label,
    help: q.help,
    kind: q.kind,
    options: q.options,
    required: q.required,
    saveToCustomer: q.saveToCustomer,
  };
}

/**
 * Aktiva frågor för tjänsten i företaget, sorterade, högst 5. En tjänst som
 * inte finns i företaget ger en tom lista.
 */
export async function getQuestionsForServiceIn(
  q: Queryable,
  businessId: string,
  serviceId: string,
): Promise<BookingQuestionDef[]> {
  const svc = await q.query<ServiceRow>(
    `select id, category_id from public.services where business_id = $1 and id = $2`,
    [businessId, serviceId],
  );
  const service = svc.rows[0];
  if (!service) return [];
  const questions = await q.query<QuestionRow>(
    `select ${QUESTION_COLUMNS}
       from public.booking_questions
      where business_id = $1 and active`,
    [businessId],
  );
  if (questions.rows.length === 0) return [];
  const targets = await q.query<TargetRow>(
    `select question_id, service_id, category_id
       from public.booking_question_targets
      where business_id = $1
        and (service_id = $2 or category_id = $3)`,
    [businessId, serviceId, service.category_id],
  );
  const r = questionsForService(
    questions.rows.map(toCatalogQuestion),
    targets.rows.map((t) => ({
      questionId: t.question_id,
      serviceId: t.service_id,
      categoryId: t.category_id,
    })),
    { id: service.id, categoryId: service.category_id },
  );
  return r.questions.map(toDef);
}

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/**
 * Bokningssidan (publik): `businessId` kommer från sluggen på servern,
 * `serviceId` från kundens val (ett ogiltigt id ger en tom lista).
 */
export async function getQuestionsForService(
  businessId: string,
  serviceId: string,
): Promise<BookingQuestionDef[]> {
  if (!UUID.test(businessId) || !UUID.test(serviceId)) return [];
  return withServiceTx((q) =>
    getQuestionsForServiceIn(q, businessId, serviceId),
  );
}

/** Ägarens förhandsvisning (RLS via `withOwnerTx`). */
export async function getQuestionsForServiceAsOwner(
  userId: string,
  businessId: string,
  serviceId: string,
): Promise<BookingQuestionDef[]> {
  if (!UUID.test(businessId) || !UUID.test(serviceId)) return [];
  return withOwnerTx(userId, (q) =>
    getQuestionsForServiceIn(q, businessId, serviceId),
  );
}
