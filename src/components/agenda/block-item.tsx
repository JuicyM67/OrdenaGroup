// Se DESIGN.md §7 "Byggt i WP-12". Blockering/lunch: inte en bokning, inte klickbar (<div>).
// `top`/`height` (alltid) och `left`/`width` (bara i lanes) är enda geometrin i `style`
// (D-021) — samma mönster som event-block.tsx, så ett block som bara gäller NÅGRA av de
// synliga profesionales delar spår med krockande bokningar i stället för att ritas i full
// bredd ovanpå dem (granskningsfynd).
import { cn } from "@/components/ui/cn";
import { agenda } from "@/i18n";

import { showTime as isTimeVisible } from "./geometry";
import type { TimeOffKind } from "./types";

export type BlockItemLane = { readonly index: number; readonly lanes: number };

export type BlockItemProps = {
  kind: TimeOffKind;
  top: number;
  height: number;
  lane?: BlockItemLane;
};

export function BlockItem({ kind, top, height, lane }: BlockItemProps) {
  const title =
    kind === "lunch" ? agenda.bloqueo.almuerzo : agenda.bloqueo.bloqueado;
  const showMeta = kind === "lunch" && isTimeVisible(height);
  const hasLanes = !!lane && lane.lanes > 1;
  return (
    <div
      className={cn(
        "absolute flex flex-col overflow-hidden rounded-event bg-line px-2.25 py-1.75 text-muted",
        !hasLanes && "inset-x-1.25",
      )}
      style={{
        top,
        height,
        left: hasLanes
          ? `${((lane?.index ?? 0) / (lane?.lanes ?? 1)) * 100}%`
          : undefined,
        width: hasLanes ? `${100 / (lane?.lanes ?? 1)}%` : undefined,
      }}
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
