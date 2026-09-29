// Kategoriflikar på bokningssidan (WP-40, D-031). Rena funktioner (ingen
// databas, inget state) — se `.visual-diff/ref/falt-kategorier.html`
// (kundens flikar, telefonmockupen längst till höger) och
// `docs/tasks/plans/WP-40-falt-kategorier.md` steg 5: "dölj flikar om < 2
// kategorier har aktiva tjänster; 'Utan kategori' sist".
import { formulario } from "@/i18n";

import type { BookingService, BookingServiceCategory } from "./types";

/** Fliken som visar alla tjänster, oavsett kategori. */
export const ALL_CATEGORY_ID = "all" as const;
/** Fliken för tjänster utan kategori (`categoryId === null`). */
export const UNCATEGORIZED_CATEGORY_ID = "none" as const;

export type CategoryTab = { readonly id: string; readonly name: string };

/**
 * Flikarna för bokningssidan: "Todos" + en per kategori med minst en aktiv
 * tjänst + "Sin categoría" om det finns tjänster utan kategori. Tom lista om
 * det finns färre än två grupper (planen: en enda grupp gör flikarna
 * meningslösa — allt syns redan).
 */
export function categoryTabs(
  categories: readonly BookingServiceCategory[],
  services: readonly BookingService[],
): CategoryTab[] {
  const hasUncategorized = services.some(
    (s) => (s.categoryId ?? null) === null,
  );
  const groupCount = categories.length + (hasUncategorized ? 1 : 0);
  if (groupCount < 2) return [];

  const tabs: CategoryTab[] = [
    { id: ALL_CATEGORY_ID, name: formulario.categorias.pestanaTodas },
    ...categories.map((c) => ({ id: c.id, name: c.name })),
  ];
  if (hasUncategorized) {
    tabs.push({
      id: UNCATEGORIZED_CATEGORY_ID,
      name: formulario.categorias.sinAsignar,
    });
  }
  return tabs;
}

/** Tjänsterna som hör till en flik (`ALL_CATEGORY_ID`/`UNCATEGORIZED_CATEGORY_ID`/kategori-id). */
export function servicesForCategory(
  services: readonly BookingService[],
  categoryId: string,
): readonly BookingService[] {
  if (categoryId === ALL_CATEGORY_ID) return services;
  if (categoryId === UNCATEGORIZED_CATEGORY_ID) {
    return services.filter((s) => (s.categoryId ?? null) === null);
  }
  return services.filter((s) => s.categoryId === categoryId);
}
