import "server-only";

/**
 * Vilka bokningsfrågor gäller en tjänst (WP-40 steg 3, D-031)? Ren funktion
 * av katalogen — ingen databas, ingen klocka.
 *
 * En fråga gäller tjänsten om den är aktiv och antingen `applies_to = 'all'`,
 * har ett mål på tjänsten eller ett mål på tjänstens kategori (kategorimål
 * upplöses här vid läsning, så en ny tjänst i kategorin ärver frågan utan att
 * några rader kopieras). En fråga som träffas flera gånger räknas en gång.
 *
 * Max 5 per tjänst: ägarens sparande spärrar (`questionLoadViolations`,
 * felkod `too_many_questions`); vid läsning klipps ett eventuellt överskott
 * deterministiskt (sort, sedan id) som ett extra skydd.
 */
import type { BookingQuestionDef } from "@/lib/validation/booking-questions";

export const MAX_QUESTIONS_PER_SERVICE = 5;

export type CatalogQuestion = BookingQuestionDef & {
  presetKey: string | null;
  appliesTo: "all" | "targets";
  active: boolean;
  sort: number;
};

/** Exakt ett av `serviceId`/`categoryId` är satt (DB-check). */
export type QuestionTarget = {
  questionId: string;
  serviceId: string | null;
  categoryId: string | null;
};

export type CatalogService = { id: string; categoryId: string | null };

function byOrder(a: CatalogQuestion, b: CatalogQuestion): number {
  if (a.sort !== b.sort) return a.sort - b.sort;
  return a.id < b.id ? -1 : a.id > b.id ? 1 : 0;
}

/** Aktiva frågor som gäller för ett mål (tjänst och/eller kategori), osorterat. */
function applying(
  questions: readonly CatalogQuestion[],
  targets: readonly QuestionTarget[],
  serviceId: string | null,
  categoryId: string | null,
): CatalogQuestion[] {
  const hit = new Set<string>();
  for (const t of targets) {
    if (
      (serviceId !== null && t.serviceId === serviceId) ||
      (categoryId !== null && t.categoryId === categoryId)
    ) {
      hit.add(t.questionId);
    }
  }
  return questions.filter(
    (q) =>
      q.active &&
      (q.appliesTo === "all" || (q.appliesTo === "targets" && hit.has(q.id))),
  );
}

export function questionsForService(
  questions: readonly CatalogQuestion[],
  targets: readonly QuestionTarget[],
  service: CatalogService,
): { questions: CatalogQuestion[]; dropped: number } {
  const all = applying(questions, targets, service.id, service.categoryId).sort(
    byOrder,
  );
  return {
    questions: all.slice(0, MAX_QUESTIONS_PER_SERVICE),
    dropped: Math.max(0, all.length - MAX_QUESTIONS_PER_SERVICE),
  };
}

export type LoadViolations = {
  /** Fler än 5 aktiva 'all'-frågor (gäller varje tjänst, även framtida). */
  all: boolean;
  /** Befintliga tjänster som skulle få fler än 5 frågor. */
  serviceIds: string[];
  /** Kategorier där en (ny) tjänst skulle få fler än 5 frågor. */
  categoryIds: string[];
};

/**
 * Spärren vid sparande: varje tjänst, varje kategori (en ny tjänst där) och
 * en tjänst utan kategori får högst 5 aktiva frågor.
 */
export function questionLoadViolations(
  questions: readonly CatalogQuestion[],
  targets: readonly QuestionTarget[],
  services: readonly CatalogService[],
  categoryIds: readonly string[],
): LoadViolations {
  const over = (serviceId: string | null, categoryId: string | null) =>
    applying(questions, targets, serviceId, categoryId).length >
    MAX_QUESTIONS_PER_SERVICE;
  return {
    all: over(null, null),
    serviceIds: services
      .filter((s) => over(s.id, s.categoryId))
      .map((s) => s.id),
    categoryIds: categoryIds.filter((c) => over(null, c)),
  };
}

export function hasViolations(v: LoadViolations): boolean {
  return v.all || v.serviceIds.length > 0 || v.categoryIds.length > 0;
}
