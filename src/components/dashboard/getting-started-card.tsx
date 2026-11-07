// GettingStartedCard — WP-57 punkt 4, omgjord i WP-83 (portad från BookingBuddy WP-92):
// rubrik + procent, progressbar och en lodrät checklista där varje kvarvarande steg är
// en länk. Fälls ihop till en liten "Comenzar ③"-knapp (`<details>`, ingen klient-JS).
// Steg härledda ur befintlig data (`InicioData["gettingStarted"]`, `loadOwnerInicio`);
// döljs av anroparen (inicio-screen.tsx) när alla är klara. Inget plansteg här i Chile
// (D-068): planen väljs i onboarding, och Gratis är ett giltigt val som annars aldrig
// skulle bockas av.
import { ChevronDown, Sparkles } from "lucide-react";

import { ProgressBar } from "@/components/dashboard/progress-bar";
import {
  SetupChecklist,
  type ChecklistItem,
} from "@/components/onboarding/setup-checklist";
import { appHref } from "@/config/routes";
import { flash, onboarding } from "@/i18n";

import type { InicioData } from "./types";

export type GettingStartedCardProps = {
  data: NonNullable<InicioData["gettingStarted"]>;
};

export function GettingStartedCard({ data }: GettingStartedCardProps) {
  const raw = [
    {
      key: "services",
      done: data.services,
      label: onboarding.pasos.servicios,
      href: appHref("appAjustesServicios"),
    },
    {
      key: "hours",
      done: data.hours,
      label: onboarding.pasos.horario,
      href: appHref("appAjustesHorario"),
    },
    {
      key: "profile",
      done: data.profile,
      label: onboarding.pasos.pagina,
      href: appHref("appAjustesPerfil"),
    },
    {
      key: "flash",
      done: data.flash,
      label: flash.nueva.cta,
      href: appHref("appFlash"),
    },
    {
      key: "team",
      done: data.team,
      label: onboarding.pasos.equipo,
      href: appHref("appAjustesEquipo"),
    },
  ];
  const firstOpen = raw.findIndex((s) => !s.done);
  const items: ChecklistItem[] = raw.map((s, i) => ({
    key: s.key,
    label: s.label,
    href: s.href,
    state: s.done ? "done" : i === firstOpen ? "current" : "todo",
  }));
  const doneCount = raw.filter((s) => s.done).length;
  const pending = raw.length - doneCount;
  const t = onboarding.checklist;

  return (
    <details
      open
      aria-label={t.titulo}
      className="group w-fit self-start rounded-full bg-surface shadow-soft open:w-full open:max-w-md open:rounded-card open:p-5.5 lg:open:max-w-sm"
    >
      <summary className="flex cursor-pointer list-none items-center gap-3 rounded-full px-4 py-3 group-open:p-0 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink">
        <span
          aria-hidden="true"
          className="flex size-9 shrink-0 items-center justify-center rounded-full bg-lime text-ink"
        >
          <Sparkles className="size-4.5" strokeWidth={2} />
        </span>
        <span className="flex flex-1 flex-col">
          <span className="text-17 font-bold text-ink">
            <span className="group-open:hidden">{t.tituloCorto}</span>
            <span className="hidden group-open:inline">{t.hola}</span>
          </span>
          <span className="hidden text-13 text-muted group-open:inline">
            {t.pasosPendientes({ n: pending })}
          </span>
        </span>
        <span className="flex size-7 items-center justify-center rounded-full bg-ink text-12 font-bold text-lime group-open:hidden">
          {pending}
        </span>
        <span className="hidden text-13 font-semibold text-ink group-open:inline">
          {t.porcentaje({ n: Math.round((doneCount / raw.length) * 100) })}
        </span>
        <ChevronDown
          aria-hidden="true"
          className="size-4 text-muted transition-transform duration-150 ease-out group-open:rotate-180"
          strokeWidth={2}
        />
        <span className="sr-only">
          <span className="group-open:hidden">{t.abrir}</span>
          <span className="hidden group-open:inline">{t.cerrar}</span>
        </span>
      </summary>
      <div className="mt-4 flex flex-col gap-3">
        <ProgressBar value={doneCount / raw.length} />
        <SetupChecklist tone="light" items={items} />
      </div>
    </details>
  );
}
