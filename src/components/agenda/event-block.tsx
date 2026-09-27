// Se DESIGN.md §7 "Byggt i WP-12". `top`/`height` (alltid) och `left`/`width` (bara i lanes,
// FRÅGA 3) är enda geometrin som räknas ur data (D-021) — allt annat är tokens/klasser.
import type { Ref } from "react";

import { Chip } from "@/components/ui/chip";
import { cn } from "@/components/ui/cn";
import { estados } from "@/i18n";

import { staffBgClass } from "./agenda-view";
import type { StaffColor } from "./types";

export type EventBlockVariant = "staff" | "flash" | "waitlist";

export type EventBlockLane = { readonly index: number; readonly lanes: number };

export type EventBlockProps = {
  variant: EventBlockVariant;
  staffColor: StaffColor;
  selected?: boolean;
  title: string;
  /** null → `showTime` var falskt (höjden räcker inte, se geometry.ts). */
  meta: string | null;
  showAvatar: boolean;
  avatarInitials?: string;
  top: number;
  height: number;
  /** Bara för `variant="flash"`. */
  flashPct?: number;
  /** Flera profesionales samtidigt i samma kolumn (veckovyn): sida vid sida. */
  lane?: EventBlockLane;
  ariaLabel: string;
  onClick: () => void;
  ref?: Ref<HTMLButtonElement>;
};

export function EventBlock({
  variant,
  staffColor,
  selected = false,
  title,
  meta,
  showAvatar,
  avatarInitials,
  top,
  height,
  flashPct,
  lane,
  ariaLabel,
  onClick,
  ref,
}: EventBlockProps) {
  const hasLanes = !!lane && lane.lanes > 1;
  const bgClass =
    variant === "flash"
      ? "bg-lime"
      : variant === "waitlist"
        ? "bg-peach"
        : staffBgClass(staffColor);

  return (
    <button
      ref={ref}
      type="button"
      aria-label={ariaLabel}
      onClick={onClick}
      style={{
        top,
        height,
        left: hasLanes
          ? `${((lane?.index ?? 0) / (lane?.lanes ?? 1)) * 100}%`
          : undefined,
        width: hasLanes ? `${100 / (lane?.lanes ?? 1)}%` : undefined,
      }}
      className={cn(
        "absolute flex flex-col overflow-hidden rounded-event px-2.25 py-1.75 text-left text-ink transition-colors duration-150 ease-out",
        "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink focus-visible:transition-none",
        !hasLanes && "inset-x-1.25",
        bgClass,
        selected && "border-2 border-ink",
      )}
    >
      {variant !== "staff" ? (
        <Chip size="tag" tone="ink" className="mb-0.75 self-start">
          {variant === "flash"
            ? estados.flashConDescuento({ porcentaje: flashPct ?? 0 })
            : estados.listaDeEspera}
        </Chip>
      ) : null}
      <div className="truncate text-event-title leading-event font-bold">
        {title}
      </div>
      {meta ? (
        <div className="mt-0.5 truncate text-event-meta text-ink-soft">
          {meta}
        </div>
      ) : null}
      {showAvatar ? (
        <div className="mt-auto flex size-6 items-center justify-center rounded-avatar bg-ink text-10 font-bold text-on-dark">
          {avatarInitials}
        </div>
      ) : null}
    </button>
  );
}
