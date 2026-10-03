"use client";

// Panelen "Gäller för" (`falt-kategorier.html`), delad mellan vy A och vy B
// (WP-40 steg 5–7, D-031): till vilka tjänster/kategorier en fråga gäller.
// Ett kategori-val är ett mål på kategorin (`applies_to = 'targets'` +
// `booking_question_targets.category_id`): nya tjänster i kategorin ärver
// frågan automatiskt (`formulario.aplicaA.autoNuevosServicios`), det finns
// inget sätt att stänga av det (ingen egen kolumn i schemat) — texten är en
// upplysning, inte en egen växel.
//
// WP-62 (ägarens feedback 2026-10-02, D-042): "Gäller för" visades som ett eget
// inbäddat kort med egen "Guardar"-knapp UNDER frågeeditorn — två spara-knappar
// staplat på höjden, "inte super användarvänligt". `useAppliesToState`/
// `AppliesToFields` nedan är det delade state/UI:t, utan egen kant/skugga eller
// spara-knapp: `QuestionEditor` (vy A) återanvänder dem i stället för hela den
// här filens `<AppliesToPanel>` för att rendera "Gäller för" som en vanlig del
// av samma formulär (en "Spara fråga"-knapp). `AppliesToPanel` (fristående kort
// med egna knappar) finns kvar oförändrad i sitt publika API — vy B
// (`service-questions-tab.tsx`) använder den fortfarande för "använd även i
// andra tjänster" efter att frågan redan är skapad (inget frågeformulär öppet
// då att bädda in den i).
import { useMemo, useState } from "react";

import { Button } from "@/components/ui/button";
import { cn } from "@/components/ui/cn";
import { ajustes, formulario } from "@/i18n";

import { bookingFormErrorText } from "./booking-form-error-text";
import type {
  BookingFormCategory,
  BookingFormService,
  MutationResult,
  Targets,
} from "./booking-form-types";

type Group = {
  category: BookingFormCategory | null;
  services: BookingFormService[];
};

function groupByCategory(
  categories: BookingFormCategory[],
  services: BookingFormService[],
): Group[] {
  const groups: Group[] = categories.map((category) => ({
    category,
    services: services.filter((s) => s.categoryId === category.id),
  }));
  const sinCategoria = services.filter((s) => s.categoryId === null);
  if (sinCategoria.length > 0) {
    groups.push({ category: null, services: sinCategoria });
  }
  return groups;
}

export type AppliesToState = {
  mode: "all" | "targets";
  setMode: (mode: "all" | "targets") => void;
  query: string;
  setQuery: (query: string) => void;
  groups: Group[];
  isChecked: (service: BookingFormService) => boolean;
  toggleWholeCategory: (categoryId: string) => void;
  toggleService: (service: BookingFormService) => void;
  wholeCategories: Set<string>;
  selectedCount: number;
  computeTargets: () => Targets;
};

/** Delat state för "Gäller för" (alla/valda tjänster, kategori- och
 * tjänstval): används av både `AppliesToFields` (inbäddad, utan egna
 * knappar) och `AppliesToPanel` (fristående kort). */
export function useAppliesToState(
  categories: BookingFormCategory[],
  services: BookingFormService[],
  initial: Targets,
): AppliesToState {
  const [mode, setMode] = useState<"all" | "targets">(initial.appliesTo);
  const [wholeCategories, setWholeCategories] = useState<Set<string>>(
    () => new Set(initial.appliesTo === "targets" ? initial.categoryIds : []),
  );
  const [individualServices, setIndividualServices] = useState<Set<string>>(
    () => new Set(initial.appliesTo === "targets" ? initial.serviceIds : []),
  );
  const [query, setQuery] = useState("");

  const groups = useMemo(
    () => groupByCategory(categories, services),
    [categories, services],
  );

  function isChecked(service: BookingFormService): boolean {
    return (
      (service.categoryId !== null &&
        wholeCategories.has(service.categoryId)) ||
      individualServices.has(service.id)
    );
  }

  function toggleWholeCategory(categoryId: string) {
    setWholeCategories((prev) => {
      const next = new Set(prev);
      if (next.has(categoryId)) next.delete(categoryId);
      else next.add(categoryId);
      return next;
    });
  }

  function toggleService(service: BookingFormService) {
    const categoryId = service.categoryId;
    const siblings = services.filter((s) => s.categoryId === categoryId);
    if (categoryId !== null && wholeCategories.has(categoryId)) {
      // Un service avmarkerat medan hela kategorin är vald: gör om till en
      // uttrycklig lista (alla utom den här).
      setWholeCategories((prev) => {
        const next = new Set(prev);
        next.delete(categoryId);
        return next;
      });
      setIndividualServices((prev) => {
        const next = new Set(prev);
        for (const s of siblings) next.add(s.id);
        next.delete(service.id);
        return next;
      });
      return;
    }
    setIndividualServices((prev) => {
      const next = new Set(prev);
      if (next.has(service.id)) next.delete(service.id);
      else next.add(service.id);
      return next;
    });
  }

  const selectedCount = services.filter(isChecked).length;

  function computeTargets(): Targets {
    if (mode === "all") return { appliesTo: "all" };
    return {
      appliesTo: "targets",
      categoryIds: [...wholeCategories],
      serviceIds: [...individualServices].filter((id) => {
        const s = services.find((x) => x.id === id);
        return (
          !s || s.categoryId === null || !wholeCategories.has(s.categoryId)
        );
      }),
    };
  }

  return {
    mode,
    setMode,
    query,
    setQuery,
    groups,
    isChecked,
    toggleWholeCategory,
    toggleService,
    wholeCategories,
    selectedCount,
    computeTargets,
  };
}

/** Bara fälten (mode-knappar, sökfält, grupperad checkboxlista, auto-besked)
 * — ingen rubrik, kant eller spara/avbryt-knapp. Byggd för att bäddas in i
 * ett större formulär (`QuestionEditor`); `AppliesToPanel` nedan lägger på
 * resten för de ställen som fortfarande behöver en fristående panel. */
export function AppliesToFields({ state }: { state: AppliesToState }) {
  const q = state.query.trim().toLowerCase();
  const matches = (name: string) => q === "" || name.toLowerCase().includes(q);

  return (
    <div className="flex flex-col gap-3">
      <div className="flex gap-1.5">
        <Button
          type="button"
          variant={state.mode === "all" ? "primary" : "secondary"}
          size="sm"
          aria-pressed={state.mode === "all"}
          onClick={() => state.setMode("all")}
        >
          {formulario.aplicaA.todos}
        </Button>
        <Button
          type="button"
          variant={state.mode === "targets" ? "primary" : "secondary"}
          size="sm"
          aria-pressed={state.mode === "targets"}
          onClick={() => state.setMode("targets")}
        >
          {formulario.aplicaA.elegidos}
        </Button>
      </div>

      {state.mode === "targets" ? (
        <>
          <input
            type="search"
            value={state.query}
            onChange={(e) => state.setQuery(e.target.value)}
            placeholder={formulario.aplicaA.buscarPlaceholder}
            aria-label={formulario.aplicaA.buscarPlaceholder}
            className="h-11 w-full rounded-control border-2 border-transparent bg-canvas px-3.5 text-13 font-medium text-ink placeholder:text-muted focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink"
          />

          <div className="flex max-h-96 flex-col gap-3 overflow-y-auto">
            {state.groups.map((group) => {
              const visibleServices = group.services.filter((s) =>
                matches(s.name),
              );
              if (
                group.category &&
                !matches(group.category.name) &&
                visibleServices.length === 0
              ) {
                return null;
              }
              const total = group.services.length;
              const selected = group.services.filter(state.isChecked).length;
              return (
                <div
                  key={group.category?.id ?? "sin-categoria"}
                  className="flex flex-col gap-1.5"
                >
                  {group.category ? (
                    <label className="flex items-center gap-2 text-14 font-bold text-ink">
                      <input
                        type="checkbox"
                        checked={state.wholeCategories.has(group.category.id)}
                        onChange={() =>
                          state.toggleWholeCategory(group.category!.id)
                        }
                        className="size-4 accent-ink"
                      />
                      {formulario.aplicaA.todaLaCategoria({
                        nombre: group.category.name,
                      })}
                      <span className="ml-auto text-12 font-semibold text-muted">
                        {formulario.aplicaA.seleccion({
                          x: selected,
                          y: total,
                        })}
                      </span>
                    </label>
                  ) : (
                    <p className="text-13 font-bold text-muted">
                      {formulario.categorias.sinAsignar}
                    </p>
                  )}
                  <div className="flex flex-col gap-1 pl-6">
                    {visibleServices.map((s) => (
                      <label
                        key={s.id}
                        className="flex items-center gap-2 text-13 text-ink"
                      >
                        <input
                          type="checkbox"
                          checked={state.isChecked(s)}
                          onChange={() => state.toggleService(s)}
                          className="size-4 accent-ink"
                        />
                        {s.name}
                      </label>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>

          {state.wholeCategories.size > 0 ? (
            <p className="rounded-event bg-lime-50 px-2.5 py-2 text-12 text-ink">
              {formulario.aplicaA.autoNuevosServicios}
            </p>
          ) : null}
        </>
      ) : null}
    </div>
  );
}

export type AppliesToPanelProps = {
  questionLabel: string;
  categories: BookingFormCategory[];
  services: BookingFormService[];
  initial: Targets;
  onCancel: () => void;
  onSave: (targets: Targets) => Promise<MutationResult>;
  className?: string;
};

export function AppliesToPanel({
  questionLabel,
  categories,
  services,
  initial,
  onCancel,
  onSave,
  className,
}: AppliesToPanelProps) {
  const state = useAppliesToState(categories, services, initial);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | undefined>();

  async function handleSave() {
    setSaving(true);
    setError(undefined);
    try {
      const result = await onSave(state.computeTargets());
      if (!result.ok) {
        setError(bookingFormErrorText(result.code));
      }
    } finally {
      setSaving(false);
    }
  }

  return (
    <section
      aria-label={formulario.aplicaA.titulo}
      className={cn(
        "flex flex-col gap-3 rounded-card bg-surface p-4.5 shadow-popover fields-on-surface",
        className,
      )}
    >
      <div>
        <p className="text-12 font-semibold text-muted">
          {formulario.aplicaA.titulo}
        </p>
        <p className="text-16 font-bold text-ink">{questionLabel}</p>
      </div>

      <AppliesToFields state={state} />

      {error ? (
        <p role="alert" className="text-13 font-semibold text-ink">
          {error}
        </p>
      ) : null}

      <div className="flex justify-end gap-2">
        <Button type="button" variant="secondary" size="sm" onClick={onCancel}>
          {ajustes.seguirEditando}
        </Button>
        <Button
          type="button"
          size="sm"
          disabled={saving}
          onClick={() => void handleSave()}
        >
          {formulario.aplicaA.ctaGuardar({ n: state.selectedCount })}
        </Button>
      </div>
    </section>
  );
}
