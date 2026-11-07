// Gemensam rubrik och knapprad för onboardingens steg (WP-92): stor rubrik i
// display-typsnittet, kort ingress, och "Tillbaka" + lime "Fortsätt" längst ner
// (fast i botten på mobil, så att knappen alltid syns).
import { ArrowLeft, ArrowRight } from "lucide-react";

import { cn } from "@/components/ui/cn";
import { onboarding } from "@/i18n";

export function StepHeader({ title, text }: { title: string; text?: string }) {
  return (
    <div className="flex flex-col gap-1.5">
      <h1 className="font-display text-30 leading-snug font-semibold tracking-title text-ink sm:text-34">
        {title}
      </h1>
      {text ? <p className="text-15 leading-body text-muted">{text}</p> : null}
    </div>
  );
}

export function StepNav({
  onBack,
  onContinue,
  continueLabel = onboarding.ctaContinuar,
  disabled,
  extra,
}: {
  onBack?: () => void;
  onContinue: () => void;
  continueLabel?: string;
  disabled?: boolean;
  /** T.ex. "Hoppa över" bredvid knapparna. */
  extra?: React.ReactNode;
}) {
  return (
    <div className="sticky bottom-0 z-10 -mx-6 mt-2 flex items-center gap-3 border-t border-border bg-surface px-6 py-4 sm:static sm:mx-0 sm:border-0 sm:bg-transparent sm:px-0 sm:py-0">
      {onBack ? (
        <button
          type="button"
          onClick={onBack}
          className="flex h-12 items-center gap-2 rounded-full px-4 text-14 font-semibold text-ink hover:bg-canvas focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink"
        >
          <ArrowLeft aria-hidden="true" className="size-4" strokeWidth={2} />
          {onboarding.ctaVolver}
        </button>
      ) : null}
      {extra}
      <button
        type="button"
        onClick={onContinue}
        disabled={disabled}
        className={cn(
          "ml-auto flex h-12 items-center gap-3 rounded-full bg-lime pr-1.5 pl-6 text-15 font-bold text-ink transition-opacity duration-150 ease-out hover:opacity-90 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink disabled:opacity-40",
        )}
      >
        {continueLabel}
        <span
          aria-hidden="true"
          className="flex size-9 items-center justify-center rounded-full bg-ink text-lime"
        >
          <ArrowRight className="size-4.5" strokeWidth={2.5} />
        </span>
      </button>
    </div>
  );
}
