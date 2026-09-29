import { describe, expect, it } from "vitest";

import { questionsApplyingToService } from "./booking-form-resolve";
import type { BookingFormQuestion } from "./booking-form-types";

function q(overrides: Partial<BookingFormQuestion>): BookingFormQuestion {
  return {
    id: "q-1",
    label: "Pregunta",
    help: null,
    kind: "short_text",
    options: null,
    required: false,
    saveToCustomer: false,
    presetKey: null,
    appliesTo: "all",
    active: true,
    sort: 1,
    serviceIds: [],
    categoryIds: [],
    ...overrides,
  };
}

describe("questionsApplyingToService", () => {
  it("una pregunta inactiva nunca aplica, aunque sea 'all'", () => {
    const result = questionsApplyingToService(
      [q({ id: "q-1", active: false })],
      { id: "svc-1", categoryId: null },
      5,
    );
    expect(result).toEqual([]);
  });

  it("un mal de categoría aplica a un servicio de esa categoría (ärvs)", () => {
    const question = q({
      id: "q-1",
      appliesTo: "targets",
      categoryIds: ["cat-1"],
    });
    const result = questionsApplyingToService(
      [question],
      { id: "svc-nueva", categoryId: "cat-1" },
      5,
    );
    expect(result.map((x) => x.id)).toEqual(["q-1"]);
  });

  it("recorta a como máximo maxPerService, ordenado por sort", () => {
    const questions = Array.from({ length: 7 }, (_, i) =>
      q({ id: `q-${i}`, sort: 7 - i }),
    );
    const result = questionsApplyingToService(
      questions,
      { id: "svc-1", categoryId: null },
      5,
    );
    expect(result).toHaveLength(5);
    expect(result[0]!.sort).toBe(1);
  });
});
