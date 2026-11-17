// Pappret på utskriftssidan (WP-95, D-079): skylten i verklig storlek. "A6 · 4 por hoja"
// lägger fyra mini-skyltar på ett A4 med streckade skärlinjer mellan rutorna.
import { cn } from "@/components/ui/cn";
import type { CartelSize } from "@/lib/share/carteles";

import { Cartel, type CartelProps } from "./cartel";

const PAPER: Record<CartelSize, string> = {
  a3: "cartel-papel-a3",
  a4: "cartel-papel-a4",
  a5: "cartel-papel-a5",
  a6x4: "cartel-papel-a4",
};

export function CartelPapel({
  size,
  ...cartel
}: CartelProps & { size: CartelSize }) {
  if (size !== "a6x4") {
    return (
      <div className={cn("mx-auto shadow-soft print:shadow-none", PAPER[size])}>
        <Cartel {...cartel} />
      </div>
    );
  }
  return (
    <div
      className={cn(
        "mx-auto grid grid-cols-2 grid-rows-2 bg-surface shadow-soft print:shadow-none",
        PAPER[size],
      )}
    >
      {[0, 1, 2, 3].map((i) => (
        <div
          key={i}
          className={cn(
            "min-h-0 border-dashed border-subtle",
            i % 2 === 0 && "border-r",
            i < 2 && "border-b",
          )}
        >
          <Cartel {...cartel} />
        </div>
      ))}
    </div>
  );
}
