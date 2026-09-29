import { describe, expect, it } from "vitest";

import {
  MAX_QUESTIONS_PER_SERVICE,
  questionLoadViolations,
  questionsForService,
  type CatalogQuestion,
  type QuestionTarget,
} from "./resolve";

const S1 = "s1";
const S2 = "s2";
const DAM = "cat-dam";
const HERR = "cat-herr";

function q(id: string, over: Partial<CatalogQuestion> = {}): CatalogQuestion {
  return {
    id,
    label: id,
    help: null,
    kind: "short_text",
    options: null,
    required: false,
    saveToCustomer: false,
    presetKey: null,
    appliesTo: "targets",
    active: true,
    sort: 0,
    ...over,
  };
}
const toService = (questionId: string, serviceId: string): QuestionTarget => ({
  questionId,
  serviceId,
  categoryId: null,
});
const toCategory = (
  questionId: string,
  categoryId: string,
): QuestionTarget => ({ questionId, serviceId: null, categoryId });

const ids = (r: { questions: CatalogQuestion[] }) =>
  r.questions.map((x) => x.id);

describe("questionsForService", () => {
  it("all + tjänstmål + kategorimål, sorterat på sort", () => {
    const qs = [
      q("all", { appliesTo: "all", sort: 3 }),
      q("svc", { sort: 1 }),
      q("cat", { sort: 2 }),
      q("other", { sort: 0 }),
    ];
    const ts = [
      toService("svc", S1),
      toCategory("cat", DAM),
      toService("other", S2),
    ];
    expect(
      ids(questionsForService(qs, ts, { id: S1, categoryId: DAM })),
    ).toEqual(["svc", "cat", "all"]);
  });

  it("dubbelträff (tjänst + kategori) ger frågan en gång", () => {
    const qs = [q("x")];
    const ts = [toService("x", S1), toCategory("x", DAM)];
    const r = questionsForService(qs, ts, { id: S1, categoryId: DAM });
    expect(ids(r)).toEqual(["x"]);
    expect(r.dropped).toBe(0);
  });

  it("en ny tjänst i kategorin ärver kategorins frågor (inga egna mål)", () => {
    const qs = [q("cat")];
    const ts = [toCategory("cat", DAM)];
    expect(
      ids(questionsForService(qs, ts, { id: "ny", categoryId: DAM })),
    ).toEqual(["cat"]);
    expect(
      ids(questionsForService(qs, ts, { id: "ny", categoryId: HERR })),
    ).toEqual([]);
    expect(
      ids(questionsForService(qs, ts, { id: "ny", categoryId: null })),
    ).toEqual([]);
  });

  it("inaktiva frågor och frågor med 'all' + mål räknas rätt", () => {
    const qs = [
      q("off", { appliesTo: "all", active: false }),
      q("all", { appliesTo: "all" }),
    ];
    // Ett kvarglömt mål på en 'all'-fråga ger ingen dubblett.
    const ts = [toService("all", S1)];
    expect(
      ids(questionsForService(qs, ts, { id: S1, categoryId: null })),
    ).toEqual(["all"]);
  });

  it("max 5: överskottet klipps deterministiskt efter sort, sedan id", () => {
    const qs = ["g", "f", "e", "d", "c", "b", "a"].map((id) =>
      q(id, { appliesTo: "all", sort: id === "g" ? 0 : 1 }),
    );
    const r = questionsForService(qs, [], { id: S1, categoryId: null });
    expect(r.questions).toHaveLength(MAX_QUESTIONS_PER_SERVICE);
    expect(ids(r)).toEqual(["g", "a", "b", "c", "d"]);
    expect(r.dropped).toBe(2);
    // Samma resultat oavsett indatans ordning.
    const again = questionsForService([...qs].reverse(), [], {
      id: S1,
      categoryId: null,
    });
    expect(ids(again)).toEqual(ids(r));
  });
});

describe("questionLoadViolations", () => {
  const services = [
    { id: S1, categoryId: DAM },
    { id: S2, categoryId: null },
  ];
  const categories = [DAM, HERR];

  it("inga överträdelser vid ≤ 5", () => {
    const qs = [1, 2, 3, 4, 5].map((n) => q(`a${n}`, { appliesTo: "all" }));
    expect(questionLoadViolations(qs, [], services, categories)).toEqual({
      all: false,
      serviceIds: [],
      categoryIds: [],
    });
  });

  it("6 'all'-frågor överträder överallt, även utan tjänster", () => {
    const qs = [1, 2, 3, 4, 5, 6].map((n) => q(`a${n}`, { appliesTo: "all" }));
    expect(questionLoadViolations(qs, [], [], [])).toEqual({
      all: true,
      serviceIds: [],
      categoryIds: [],
    });
  });

  it("kategori + tjänst tillsammans > 5 flaggar tjänsten; kategorin själv flaggas vid > 5", () => {
    const qs = [
      ...[1, 2, 3].map((n) => q(`c${n}`)),
      ...[1, 2, 3].map((n) => q(`s${n}`)),
    ];
    const ts = [
      ...[1, 2, 3].map((n) => toCategory(`c${n}`, DAM)),
      ...[1, 2, 3].map((n) => toService(`s${n}`, S1)),
    ];
    expect(questionLoadViolations(qs, ts, services, categories)).toEqual({
      all: false,
      serviceIds: [S1],
      categoryIds: [],
    });
  });

  it("dubbelträff räknas en gång och inaktiva räknas inte", () => {
    const qs = [
      ...[1, 2, 3, 4, 5].map((n) => q(`x${n}`)),
      q("off", { active: false }),
    ];
    const ts = [
      ...[1, 2, 3, 4, 5].flatMap((n) => [
        toCategory(`x${n}`, DAM),
        toService(`x${n}`, S1),
      ]),
      toService("off", S1),
    ];
    expect(
      questionLoadViolations(qs, ts, services, categories).serviceIds,
    ).toEqual([]);
  });

  it("en kategori utan tjänster med 6 frågor flaggas (en ny tjänst där skulle få 6)", () => {
    const qs = [1, 2, 3, 4, 5, 6].map((n) => q(`h${n}`));
    const ts = qs.map((x) => toCategory(x.id, HERR));
    expect(questionLoadViolations(qs, ts, services, categories)).toEqual({
      all: false,
      serviceIds: [],
      categoryIds: [HERR],
    });
  });
});
