import { describe, expect, it } from "vitest";

import { formulario } from "@/i18n";

import {
  ALL_CATEGORY_ID,
  UNCATEGORIZED_CATEGORY_ID,
  categoryTabs,
  servicesForCategory,
} from "./categories";
import type { BookingService, BookingServiceCategory } from "./types";

const svc = (id: string, categoryId: string | null): BookingService => ({
  id,
  name: id,
  durationMin: 30,
  priceClp: 1000,
  tint: "lilac",
  categoryId,
});

describe("categoryTabs", () => {
  it("tom lista utan kategorier (bara okategoriserade tjänster)", () => {
    expect(categoryTabs([], [svc("a", null), svc("b", null)])).toEqual([]);
  });

  it("tom lista med en enda kategori och inga okategoriserade tjänster", () => {
    const cats: BookingServiceCategory[] = [{ id: "c1", name: "Dam" }];
    expect(categoryTabs(cats, [svc("a", "c1"), svc("b", "c1")])).toEqual([]);
  });

  it("visar 'Todos' + kategorierna när det finns minst två grupper", () => {
    const cats: BookingServiceCategory[] = [
      { id: "c1", name: "Dam" },
      { id: "c2", name: "Herr" },
    ];
    const tabs = categoryTabs(cats, [svc("a", "c1"), svc("b", "c2")]);
    expect(tabs).toEqual([
      { id: ALL_CATEGORY_ID, name: formulario.categorias.pestanaTodas },
      { id: "c1", name: "Dam" },
      { id: "c2", name: "Herr" },
    ]);
  });

  it("lägger till en flik för tjänster utan kategori sist", () => {
    const cats: BookingServiceCategory[] = [{ id: "c1", name: "Dam" }];
    const tabs = categoryTabs(cats, [svc("a", "c1"), svc("b", null)]);
    expect(tabs.map((t) => t.id)).toEqual([
      ALL_CATEGORY_ID,
      "c1",
      UNCATEGORIZED_CATEGORY_ID,
    ]);
    expect(tabs.at(-1)?.name).toBe(formulario.categorias.sinAsignar);
  });
});

describe("servicesForCategory", () => {
  const services = [svc("a", "c1"), svc("b", "c2"), svc("c", null)];

  it("'all' ger alla tjänster oavsett kategori", () => {
    expect(servicesForCategory(services, ALL_CATEGORY_ID)).toEqual(services);
  });

  it("en kategori ger bara dess tjänster", () => {
    expect(servicesForCategory(services, "c1")).toEqual([services[0]]);
  });

  it("'none' ger bara tjänster utan kategori", () => {
    expect(servicesForCategory(services, UNCATEGORIZED_CATEGORY_ID)).toEqual([
      services[2],
    ]);
  });
});
