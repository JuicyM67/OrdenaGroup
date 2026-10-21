"use client";

// Byt plan + valfritt slutdatum för en manuell override (F19/WP-36). Svensk
// text. WP-73 (D-048): planen `custom` med avtalade gränser (anställda).
import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";

import { Button } from "@/components/ui/button";
import {
  BUSINESS_PLANS,
  type BusinessPlan,
  type CustomLimits,
} from "@/config/plans";

import type { AdminActionResult } from "./confirm-action-button";

export type PlanFormProps = {
  plan: BusinessPlan;
  overrideUntil: string | null;
  customLimits?: CustomLimits;
  onSubmit: (
    plan: BusinessPlan,
    overrideUntil: string | null,
    customLimits: CustomLimits | null,
  ) => Promise<AdminActionResult>;
};

const INPUT =
  "h-10 rounded-control border border-border bg-surface px-3 text-14 text-ink";

function toInt(v: string): number | undefined {
  const n = Number(v);
  return v.trim() !== "" && Number.isInteger(n) && n >= 0 ? n : undefined;
}

export function PlanForm({
  plan,
  overrideUntil,
  customLimits,
  onSubmit,
}: PlanFormProps) {
  const router = useRouter();
  const [value, setValue] = useState<BusinessPlan>(plan);
  const [until, setUntil] = useState(overrideUntil?.slice(0, 10) ?? "");
  const [staff, setStaff] = useState(
    customLimits?.staff !== undefined ? String(customLimits.staff) : "",
  );
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setPending(true);
    setError(null);
    const limits: CustomLimits = {};
    const s = toInt(staff);
    if (s !== undefined) limits.staff = s;
    const result = await onSubmit(
      value,
      until ? new Date(`${until}T00:00:00.000Z`).toISOString() : null,
      value === "custom" ? limits : null,
    );
    setPending(false);
    if (result.ok) router.refresh();
    else setError(result.code);
  }

  return (
    <form
      onSubmit={(e) => void handleSubmit(e)}
      className="flex flex-wrap items-end gap-3"
    >
      <label className="flex flex-col gap-1 text-13 text-ink">
        Plan
        <select
          value={value}
          onChange={(e) => setValue(e.target.value as BusinessPlan)}
          className={INPUT}
        >
          {BUSINESS_PLANS.map((p) => (
            <option key={p} value={p}>
              {p}
            </option>
          ))}
        </select>
      </label>
      {value === "custom" ? (
        <label className="flex flex-col gap-1 text-13 text-ink">
          Anställda (avtalat, standard 10)
          <input
            type="number"
            min={1}
            value={staff}
            onChange={(e) => setStaff(e.target.value)}
            className={INPUT}
          />
        </label>
      ) : null}
      <label className="flex flex-col gap-1 text-13 text-ink">
        Gratis/override till (valfritt)
        <input
          type="date"
          value={until}
          onChange={(e) => setUntil(e.target.value)}
          className={INPUT}
        />
      </label>
      <Button type="submit" size="sm" disabled={pending}>
        {pending ? "Sparar…" : "Spara plan"}
      </Button>
      {error ? (
        <span className="text-13 text-alert">Det gick inte ({error}).</span>
      ) : null}
    </form>
  );
}
