"use client";

// WP-66 (D-046): importen i Ajustes → Negocio (bara ägaren). Samma panel som
// onboarding; urvalet skickas till `applyImportAction` (en transaktion, samma
// servervalideringar som resten av Ajustes).
import { useRouter } from "next/navigation";

import {
  ImportPanel,
  type ImportChoice,
} from "@/components/import/import-panel";
import type {
  ImportApplyResult,
  ImportSelection,
} from "@/lib/validation/import";
import { importar } from "@/i18n";

import { ajustesErrorText } from "./error-text";

export type ImportSectionProps = {
  platformNames: string;
  action: (input: unknown) => Promise<ImportApplyResult>;
  /** WP-91: admin importerar åt ett valt företag. */
  extract?: { url: string; businessId: string };
  /** WP-84 (port av SE WP-94): för "plan sugerido". */
  currentPlan?: string;
  existingCounts?: { services: number; staff: number };
};

function toSelection(c: ImportChoice): ImportSelection {
  return {
    profile: c.profile,
    hours: c.hours,
    services: c.services.map((s) => ({
      name: s.name,
      description: s.description,
      durationMin: s.durationMin,
      price: s.price,
      priceFrom: s.priceFrom,
      category: s.category,
    })),
    staff: c.staff.map((s) => ({ name: s.name, title: s.title })),
  };
}

export function ImportSection({
  platformNames,
  action,
  extract,
  currentPlan,
  existingCounts,
}: ImportSectionProps) {
  const router = useRouter();
  return (
    <ImportPanel
      mode="ajustes"
      platformNames={platformNames}
      extract={extract}
      currentPlan={currentPlan}
      existingCounts={existingCounts}
      onConfirm={async (choice) => {
        const r = await action(toSelection(choice));
        if (!r.ok) {
          const motivo = ajustesErrorText(r.code);
          return {
            ok: false,
            message: r.item
              ? importar.errorEn({ item: r.item, motivo })
              : motivo,
          };
        }
        router.refresh();
        const skipped = [...r.skipped.services, ...r.skipped.staff];
        const msg = importar.listo({
          servicios: r.created.services,
          equipo: r.created.staff,
        });
        return {
          ok: true,
          message: skipped.length
            ? `${msg} ${importar.omitidos({ lista: skipped.join(", ") })}`
            : msg,
        };
      }}
    />
  );
}
