"use client";

// Laddningsvy (WP-92, ägarens referens "Hey, let's start now!"): rubrik, lime
// progressbar och en checklista som bockas av steg för steg medan servern arbetar
// (importen 20–60 s, skapandet några sekunder). Det sista steget står kvar som
// aktivt tills anroparen tar bort vyn — vi lovar aldrig "klart" innan det är klart.
import { Sparkles } from "lucide-react";
import { useEffect, useState, type ReactNode } from "react";

import { ProgressBar } from "@/components/dashboard/progress-bar";

import { SetupChecklist } from "./setup-checklist";

export function LoadingChecklist({
  title,
  text,
  steps,
  stepMs = 1400,
  footer,
}: {
  title: string;
  text?: string;
  steps: readonly string[];
  /** Hur länge varje steg visas som aktivt innan nästa tar vid. */
  stepMs?: number;
  footer?: ReactNode;
}) {
  const [current, setCurrent] = useState(0);
  useEffect(() => {
    if (current >= steps.length - 1) return;
    const t = setTimeout(() => setCurrent((c) => c + 1), stepMs);
    return () => clearTimeout(t);
  }, [current, steps.length, stepMs]);

  const progress = (current + 0.5) / steps.length;
  return (
    <section
      role="status"
      aria-live="polite"
      className="flex flex-col gap-5 rounded-card bg-dark p-6 text-on-dark sm:p-8"
    >
      <div className="flex items-start gap-3.5">
        <span
          aria-hidden="true"
          className="flex size-11 shrink-0 animate-float items-center justify-center rounded-full bg-lime text-ink"
        >
          <Sparkles className="size-5" strokeWidth={2} />
        </span>
        <div className="flex flex-col gap-1">
          <h2 className="font-display text-24 leading-snug font-semibold tracking-title">
            {title}
          </h2>
          {text ? <p className="text-14 text-on-dark-muted">{text}</p> : null}
        </div>
      </div>
      <ProgressBar value={progress} tone="lime" />
      <SetupChecklist
        tone="dark"
        items={steps.map((label, i) => ({
          key: String(i),
          label,
          state: i < current ? "done" : i === current ? "current" : "todo",
        }))}
      />
      {footer}
    </section>
  );
}
