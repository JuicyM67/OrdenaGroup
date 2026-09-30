"use client";

// Byt plan + valfritt slutdatum för en manuell override (F19/WP-36). Svensk
// text.
import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";

import { Button } from "@/components/ui/button";
import type { AdminActionResult } from "./confirm-action-button";

export type PlanFormProps = {
  plan: "free" | "emprende" | "equipo" | "local";
  overrideUntil: string | null;
  onSubmit: (
    plan: "free" | "emprende" | "equipo" | "local",
    overrideUntil: string | null,
  ) => Promise<AdminActionResult>;
};

const PLANS = ["free", "emprende", "equipo", "local"] as const;

export function PlanForm({ plan, overrideUntil, onSubmit }: PlanFormProps) {
  const router = useRouter();
  const [value, setValue] = useState(plan);
  const [until, setUntil] = useState(overrideUntil?.slice(0, 10) ?? "");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setPending(true);
    setError(null);
    const result = await onSubmit(
      value,
      until ? new Date(`${until}T00:00:00.000Z`).toISOString() : null,
    );
    setPending(false);
    if (result.ok) router.refresh();
    else setError(result.code);
  }

  return (
    <form onSubmit={(e) => void handleSubmit(e)} className="flex flex-wrap items-end gap-3">
      <label className="flex flex-col gap-1 text-13 text-ink">
        Plan
        <select
          value={value}
          onChange={(e) => setValue(e.target.value as typeof value)}
          className="h-10 rounded-control border border-border bg-surface px-3 text-14 text-ink"
        >
          {PLANS.map((p) => (
            <option key={p} value={p}>
              {p}
            </option>
          ))}
        </select>
      </label>
      <label className="flex flex-col gap-1 text-13 text-ink">
        Gratis/override till (valfritt)
        <input
          type="date"
          value={until}
          onChange={(e) => setUntil(e.target.value)}
          className="h-10 rounded-control border border-border bg-surface px-3 text-14 text-ink"
        />
      </label>
      <Button type="submit" size="sm" disabled={pending}>
        {pending ? "Sparar…" : "Spara plan"}
      </Button>
      {error ? <span className="text-13 text-alert">Det gick inte ({error}).</span> : null}
    </form>
  );
}
