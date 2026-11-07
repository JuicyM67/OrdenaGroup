// E-postfält + knapp "Skapa gratis konto" (hero och avslutande CTA, WP-71). Vanligt
// GET-formulär mot /comenzar (WP-83) med e-posten som `?email=` — registreringen förifyller den.
// Ingen klient-JS behövs.
import { ArrowRight } from "lucide-react";

import { cn } from "@/components/ui/cn";
import { copy } from "@/i18n/marketing";
import { SIGNUP_PATH } from "@/config/routes";

const t = copy.home.hero;

export function EmailForm({
  id,
  tone,
  className,
  action = SIGNUP_PATH,
  texts = t,
}: {
  id: string;
  tone: "nav" | "light";
  className?: string;
  /** Mål för GET-formuläret (kundlandningen skickar till kundinloggningen). */
  action?: string;
  texts?: { emailLabel: string; emailPlaceholder: string; cta: string };
}) {
  return (
    <form
      action={action}
      method="get"
      className={cn(
        "flex w-full max-w-140 flex-col gap-1.5 rounded-tile p-1.5 sm:flex-row sm:rounded-form",
        tone === "nav" ? "glass-nav" : "glass-light",
        className,
      )}
    >
      <label htmlFor={id} className="sr-only">
        {texts.emailLabel}
      </label>
      <input
        id={id}
        name="email"
        type="email"
        autoComplete="email"
        placeholder={texts.emailPlaceholder}
        className="h-13 min-w-0 rounded-bar bg-surface px-5 text-16 text-ink placeholder:text-muted focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-lime sm:flex-1"
      />
      <button
        type="submit"
        className="flex h-13 shrink-0 items-center justify-between gap-3 rounded-bar bg-lime pr-2 pl-5.5 text-16 font-bold text-ink transition-opacity duration-150 ease-out hover:opacity-90 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-on-dark"
      >
        {texts.cta}
        <span
          aria-hidden="true"
          className="flex size-9.5 items-center justify-center rounded-full bg-ink text-lime"
        >
          <ArrowRight className="size-4.5" strokeWidth={2.5} />
        </span>
      </button>
    </form>
  );
}
