// BookingBar — Reserva.dc.html rad 99–108 / DESIGN.md §7. Fast i botten, visas bara
// när `canContinue` är sant (BookingScreen avgör det).
import { Button, type ButtonProps } from "@/components/ui/button";
import { reserva } from "@/i18n";

import type { BarPrice } from "./summary";

export function BookingBar({
  summary,
  price,
  ctaLabel,
  ctaDisabled,
  onCta,
  formId,
  inline = false,
}: {
  summary: string;
  price: BarPrice | null;
  ctaLabel: string;
  ctaDisabled?: boolean;
  onCta?: () => void;
  formId?: string;
  /** WP-82 (widgets): i en iframe med automatisk höjd fungerar inte `fixed`. Raden ligger
   * i flödet och fäster sig mot underkanten bara när innehållet är högre än fönstret. */
  inline?: boolean;
}) {
  const ctaProps: Partial<ButtonProps> = formId
    ? { type: "submit", form: formId }
    : {
        type: "button",
        onClick: ctaDisabled ? undefined : onCta,
      };

  return (
    <div
      role="region"
      aria-label={summary}
      data-surface="dark"
      className={
        inline
          ? "sticky bottom-3 z-10 mx-auto flex w-full max-w-114 items-center gap-3 rounded-bar bg-dark py-3.5 pr-3.5 pl-5"
          : "fixed inset-x-3 bottom-3 mx-auto flex max-w-114 items-center gap-3 rounded-bar bg-dark py-3.5 pr-3.5 pl-5"
      }
    >
      <div className="min-w-0 grow">
        <div className="truncate text-12 text-on-dark-muted">{summary}</div>
        {price ? (
          <div className="mt-0.5 flex items-baseline gap-2">
            <span className="font-display text-22 font-semibold text-on-dark">
              {price.total}
            </span>
            {price.old ? (
              <span className="text-13 text-on-dark-subtle line-through">
                <span className="sr-only">
                  {reserva.precioAnteriorAria({ precio: price.old })}
                </span>
                <span aria-hidden="true">{price.old}</span>
              </span>
            ) : null}
          </div>
        ) : null}
      </div>
      <Button
        variant="accent"
        size="2xl"
        aria-disabled={ctaDisabled}
        disabled={ctaDisabled}
        {...ctaProps}
      >
        {ctaLabel}
      </Button>
    </div>
  );
}
