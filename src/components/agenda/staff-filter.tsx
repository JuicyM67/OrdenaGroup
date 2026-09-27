"use client";
// Se DESIGN.md §7 "Byggt i WP-12". Minst en profesional måste förbli synlig: den sista
// ikryssade kan inte kryssas ur (aria-disabled + förklaring, WP-12 FRÅGA 6/plan §4).
import { ChevronDown } from "lucide-react";

import { Card } from "@/components/ui/card";
import { cn } from "@/components/ui/cn";
import { strokeArrow } from "@/components/ui/icons";
import { agenda } from "@/i18n";

import { staffBgClass } from "./agenda-view";
import { pendingCopy } from "./pending-copy";
import type { AgendaStaff, StaffId } from "./types";

export type StaffFilterProps = {
  staff: readonly AgendaStaff[];
  visibleStaffIds: ReadonlySet<StaffId>;
  counts: Record<StaffId, number>;
  onToggle: (id: StaffId) => void;
};

export function StaffFilter({
  staff,
  visibleStaffIds,
  counts,
  onToggle,
}: StaffFilterProps) {
  return (
    <Card
      as="section"
      aria-label={agenda.panel.profesionales}
      tone="dark"
      radius="card"
      padding="none"
      className="flex flex-col gap-2.5 px-5 py-4.5"
    >
      <div className="flex items-center justify-between">
        <h2 className="text-17 font-semibold">{agenda.panel.profesionales}</h2>
        <ChevronDown
          aria-hidden="true"
          className="size-4 text-on-dark-subtle"
          strokeWidth={strokeArrow}
        />
      </div>
      {staff.map((s) => {
        const checked = visibleStaffIds.has(s.id);
        const isLastChecked = checked && visibleStaffIds.size === 1;
        const describedBy = isLastChecked
          ? `staff-filter-min-${s.id}`
          : undefined;
        return (
          <label
            key={s.id}
            className="flex h-7.5 cursor-pointer items-center gap-3 text-14 text-on-dark-soft"
          >
            <input
              type="checkbox"
              checked={checked}
              aria-disabled={isLastChecked || undefined}
              aria-describedby={describedBy}
              onChange={() => {
                if (isLastChecked) return;
                onToggle(s.id);
              }}
              className="size-4 accent-lime"
            />
            <span
              aria-hidden="true"
              className={cn("size-2.5 rounded-full", staffBgClass(s.color))}
            />
            <span className="grow">{s.name}</span>
            <span className="text-12 text-on-dark-subtle">
              {agenda.panel.reservasCount({ n: counts[s.id] ?? 0 })}
            </span>
            {isLastChecked ? (
              <span id={describedBy} className="sr-only">
                {pendingCopy.panelMinimoUnProfesional}
              </span>
            ) : null}
          </label>
        );
      })}
    </Card>
  );
}
