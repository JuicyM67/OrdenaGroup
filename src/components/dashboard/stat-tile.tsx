// Se DESIGN.md §7 "StatTile" och docs/tasks/plans/WP-11.md §4 steg 5. Tre varianter: en
// siffra, ett belopp med sparkline, en procent med trend-chip. Texten (meta, trendLabel)
// kommer alltid från anroparen (@/i18n) — komponenten är generell, inte Inicio-specifik.
import { Card } from "@/components/ui/card";
import { Chip } from "@/components/ui/chip";
import { cn } from "@/components/ui/cn";

import { Sparkline } from "./sparkline";

export type StatTileTrend = "down" | "up" | "flat";

/** down = success (t.ex. färre inasistencias), up = deposit (varning), flat = neutral. */
const TREND_TONE: Record<StatTileTrend, "success" | "deposit" | "neutral"> = {
  down: "success",
  up: "deposit",
  flat: "neutral",
};

type StatTileBase = { meta: string; className?: string };

export type StatTileProps =
  | (StatTileBase & { variant: "number"; value: number })
  | (StatTileBase & {
      variant: "amount";
      /** Redan formaterad via `formatClp()` (src/lib/format/clp.ts). */
      value: string;
      series: readonly number[];
    })
  | (StatTileBase & {
      variant: "percent";
      /** Redan formaterad text ("4%"). */
      value: string;
      trend: StatTileTrend;
      trendLabel: string;
    });

export function StatTile(props: StatTileProps) {
  return (
    <Card
      radius="card"
      padding="none"
      className={cn(
        "flex h-29 px-5.5 py-5",
        props.variant === "amount" ? "gap-3" : "flex-col justify-between",
        props.className,
      )}
    >
      {props.variant === "number" ? (
        <>
          <span className="font-display text-38 font-semibold tracking-display">
            {props.value}
          </span>
          <span className="text-13 text-muted">{props.meta}</span>
        </>
      ) : null}

      {props.variant === "amount" ? (
        <>
          <div className="flex flex-col justify-between">
            <span className="font-display text-32 font-semibold tracking-display whitespace-nowrap">
              {props.value}
            </span>
            <span className="text-13 text-muted">{props.meta}</span>
          </div>
          <Sparkline values={props.series} className="shrink-0 self-center" />
        </>
      ) : null}

      {props.variant === "percent" ? (
        <>
          <div className="flex items-baseline gap-2.5">
            <span className="font-display text-38 font-semibold tracking-display">
              {props.value}
            </span>
            <Chip tone={TREND_TONE[props.trend]} size="trend">
              {props.trendLabel}
            </Chip>
          </div>
          <span className="text-13 text-muted">{props.meta}</span>
        </>
      ) : null}
    </Card>
  );
}
