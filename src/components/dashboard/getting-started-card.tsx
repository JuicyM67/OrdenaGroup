// GettingStartedCard — WP-57 punkt 4 (ägarens UX-genomgång, "Kom igång-kort med progress"):
// ersätter den stora hero-ytan med 01/02/03-korten. Fem steg härledda ur befintlig data
// (`InicioData["gettingStarted"]`, `loadOwnerInicio`) — inget eget "onboarding klar"-fält.
// Döljs av anroparen (inicio-screen.tsx) när alla fem är klara.
import { Check } from "lucide-react";
import Link from "next/link";

import { ProgressBar } from "@/components/dashboard/progress-bar";
import { Card } from "@/components/ui/card";
import { Chip } from "@/components/ui/chip";
import { appHref } from "@/config/routes";
import { onboarding, flash } from "@/i18n";

import type { InicioData } from "./types";

type Step = {
  key: string;
  done: boolean;
  label: string;
  href: string;
};

export type GettingStartedCardProps = {
  data: NonNullable<InicioData["gettingStarted"]>;
};

export function GettingStartedCard({ data }: GettingStartedCardProps) {
  const steps: Step[] = [
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
      href: appHref("appAjustesNegocio"),
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
  const doneCount = steps.filter((s) => s.done).length;
  const pending = steps.length - doneCount;

  return (
    <Card
      as="section"
      aria-label={onboarding.checklist.titulo}
      radius="card"
      padding="none"
      className="flex flex-col gap-3 px-5.5 py-5"
    >
      <div className="flex items-center justify-between gap-3">
        <h2 className="text-18 font-bold">{onboarding.checklist.titulo}</h2>
        <span className="text-13 text-muted">
          {onboarding.checklist.pasosPendientes({ n: pending })}
        </span>
      </div>
      <ProgressBar value={doneCount / steps.length} />
      <ul className="flex flex-wrap gap-2">
        {steps.map((step) => (
          <li key={step.key}>
            {step.done ? (
              <Chip tone="success" size="sm" weight="bold">
                <Check
                  aria-hidden="true"
                  className="mr-1 inline size-3.5"
                  strokeWidth={2.4}
                />
                {step.label}
              </Chip>
            ) : (
              <Link
                href={step.href}
                prefetch={false}
                className="inline-flex items-center rounded-chip bg-canvas px-2.5 py-1.25 text-12 font-semibold text-ink transition-colors duration-150 ease-out focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink focus-visible:transition-none"
              >
                {step.label}
              </Link>
            )}
          </li>
        ))}
      </ul>
    </Card>
  );
}
