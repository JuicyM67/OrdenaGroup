"use client";

// Första steget i onboarding (WP-83, BookingBuddy WP-92: importen först): "Har du redan
// en bokningssida?" med två stora val. "Ja" öppnar importpanelen (samma som förut);
// efter en lyckad import går vi vidare med uppgifterna förifyllda.
import { ArrowRight, Download, Sparkles } from "lucide-react";
import { useState } from "react";

import {
  ImportPanel,
  type ImportChoice,
} from "@/components/import/import-panel";
import { cn } from "@/components/ui/cn";
import { importar, onboarding } from "@/i18n";

import { StepHeader } from "./step-frame";

export function ImportChoiceStep({
  platformNames,
  onImported,
  onSkip,
}: {
  platformNames: string;
  /** Lägger in importen i wizarden; returnerar meddelandet som ska visas. */
  onImported: (choice: ImportChoice) => void;
  onSkip: () => void;
}) {
  const [importing, setImporting] = useState(false);
  const t = onboarding.inicio;

  if (importing) {
    return (
      <div className="flex flex-col gap-4">
        <ImportPanel
          mode="onboarding"
          platformNames={platformNames}
          onConfirm={async (choice) => {
            onImported(choice);
            return { ok: true, message: t.importado };
          }}
        />
        <button
          type="button"
          onClick={() => setImporting(false)}
          className="self-start rounded-badge text-14 font-semibold text-muted underline underline-offset-4 hover:text-ink focus-visible:outline-2 focus-visible:outline-ink"
        >
          {t.volverOpciones}
        </button>
      </div>
    );
  }

  const option = (
    tone: string,
    icon: React.ReactNode,
    title: string,
    text: string,
    onClick: () => void,
  ) => (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "group flex items-center gap-4 rounded-card p-5 text-left transition-transform duration-150 ease-out hover:-translate-y-0.5 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink",
        tone,
      )}
    >
      <span
        aria-hidden="true"
        className="flex size-12 shrink-0 items-center justify-center rounded-full bg-surface/70"
      >
        {icon}
      </span>
      <span className="flex flex-1 flex-col gap-0.5">
        <span className="text-17 font-bold text-ink">{title}</span>
        <span className="text-14 text-ink-soft">{text}</span>
      </span>
      <span
        aria-hidden="true"
        className="flex size-10 shrink-0 items-center justify-center rounded-full bg-ink text-lime transition-transform duration-150 ease-out group-hover:translate-x-0.5"
      >
        <ArrowRight className="size-4.5" strokeWidth={2.5} />
      </span>
    </button>
  );

  return (
    <div className="flex flex-col gap-5">
      <StepHeader title={t.titulo} text={t.texto} />
      <div className="flex flex-col gap-3">
        {option(
          "bg-lime",
          <Download className="size-5" strokeWidth={2} />,
          t.si,
          importar.plataformas({ lista: platformNames }),
          () => setImporting(true),
        )}
        {option(
          "bg-canvas",
          <Sparkles className="size-5" strokeWidth={2} />,
          t.no,
          t.noTexto,
          onSkip,
        )}
      </div>
    </div>
  );
}
