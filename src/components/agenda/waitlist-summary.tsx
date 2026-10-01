"use client";

// Se DESIGN.md §7 "Byggt i WP-12". Visas inte när `waitlist` är null/tom (plan §4 steg 3).
//
// WP-23: listan med namn/tjänst/status + "Ta bort" (ägarens uttryckliga krav) återinförs
// under sammanfattningsraden — samma mörka kort, ingen ny komponenttyp.
import type { LucideIcon } from "lucide-react";
import { X } from "lucide-react";
import { useState } from "react";

import { Card } from "@/components/ui/card";
import { Chip } from "@/components/ui/chip";
import { IconButton } from "@/components/ui/icon-button";
import { roleIcons, strokeCard } from "@/components/ui/icons";
import { formatLocalDate } from "@/lib/format/dates";
import { agenda, estados } from "@/i18n";

import type { AgendaWaitlist } from "./types";

// roleIcons är typad som Record<string, LucideIcon>, så indexeringen ger
// `LucideIcon | undefined` — nyckeln finns garanterat (src/components/ui/icons.ts).
const ListIcon = roleIcons.listaEspera as LucideIcon;

export type WaitlistSummaryProps = {
  waitlist: AgendaWaitlist;
  /** Ägaren tar bort en väntande kund ur kön (server action). `undefined`
   * (design lab/ingen behörighet) döljer "Ta bort"-knapparna. */
  onRemove?: (entryId: string) => Promise<{ ok: boolean }>;
};

export function WaitlistSummary({ waitlist, onRemove }: WaitlistSummaryProps) {
  const [removedIds, setRemovedIds] = useState<ReadonlySet<string>>(new Set());
  const [pendingId, setPendingId] = useState<string | null>(null);
  if (!waitlist || waitlist.count === 0) return null;
  const dia = formatLocalDate(waitlist.day, "weekdayLongLower");
  const visibleEntries = waitlist.entries.filter((e) => !removedIds.has(e.id));

  async function handleRemove(entryId: string) {
    if (!onRemove || pendingId) return;
    setPendingId(entryId);
    const result = await onRemove(entryId);
    setPendingId(null);
    if (result.ok) {
      setRemovedIds((prev) => new Set(prev).add(entryId));
    }
  }

  return (
    <Card
      as="section"
      aria-label={estados.listaDeEspera}
      tone="dark-2"
      radius="card"
      padding="none"
      className="flex flex-col gap-3 px-5 py-4"
    >
      <div className="flex items-center gap-3.5">
        <div className="flex size-11 shrink-0 items-center justify-center rounded-avatar bg-peach text-ink">
          <ListIcon
            aria-hidden="true"
            className="size-5.5"
            strokeWidth={strokeCard}
          />
        </div>
        <div className="grow">
          <div className="text-14 font-semibold">
            {agenda.panel.esperanEl({ n: waitlist.count, dia })}
          </div>
          <div className="mt-0.5 text-12 text-on-dark-muted">
            {agenda.panel.avisoWhatsapp}
          </div>
        </div>
      </div>
      {visibleEntries.length > 0 ? (
        <ul className="flex flex-col gap-2">
          {visibleEntries.map((entry) => (
            <li
              key={entry.id}
              className="flex items-center gap-2.5 rounded-control bg-on-dark/8 px-3 py-2.5"
            >
              <div className="min-w-0 flex-1">
                <div className="truncate text-13 font-semibold">
                  {entry.customerName}
                </div>
                <div className="truncate text-12 text-on-dark-muted">
                  {entry.service}
                </div>
              </div>
              <Chip size="xs" tone="ink">
                {entry.status === "offered"
                  ? agenda.panel.listaEsperaEstado.offered
                  : agenda.panel.listaEsperaEstado.waiting}
              </Chip>
              {onRemove ? (
                <IconButton
                  label={agenda.panel.quitarDeLaLista({
                    nombre: entry.customerName,
                  })}
                  tone="ghost-dark"
                  size={30}
                  disabled={pendingId === entry.id}
                  onClick={() => void handleRemove(entry.id)}
                >
                  <X
                    aria-hidden="true"
                    className="size-3.5"
                    strokeWidth={2.2}
                  />
                </IconButton>
              ) : null}
            </li>
          ))}
        </ul>
      ) : null}
    </Card>
  );
}
