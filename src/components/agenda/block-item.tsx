// Se DESIGN.md §7 "Byggt i WP-12". Blockering/lunch: inte en bokning, inte klickbar (<div>).
import { agenda } from "@/i18n";

import { showTime as isTimeVisible } from "./geometry";
import type { TimeOffKind } from "./types";

export type BlockItemProps = {
  kind: TimeOffKind;
  top: number;
  height: number;
};

export function BlockItem({ kind, top, height }: BlockItemProps) {
  const title =
    kind === "lunch" ? agenda.bloqueo.almuerzo : agenda.bloqueo.bloqueado;
  const showMeta = kind === "lunch" && isTimeVisible(height);
  return (
    <div
      className="absolute inset-x-1.25 flex flex-col overflow-hidden rounded-event bg-line px-2.25 py-1.75 text-muted"
      style={{ top, height }}
    >
      <div className="truncate text-event-title leading-event font-bold">
        {title}
      </div>
      {showMeta ? (
        <div className="mt-0.5 truncate text-event-meta">
          {agenda.bloqueo.bloqueado}
        </div>
      ) : null}
    </div>
  );
}
