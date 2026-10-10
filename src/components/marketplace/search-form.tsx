// Sökfältet (WP-68): ett vanligt GET-formulär mot samma sida (fungerar utan JS),
// som behåller ort och filter. v1: enkel `ilike` på titel, salong och tjänst.
import { Search } from "lucide-react";
import type { ReactNode } from "react";

import { cn } from "@/components/ui/cn";
import { SEARCH_MAX } from "@/config/marketplace";
import { descubre } from "@/i18n";

import type { DiscoverParams } from "./params";

const t = descubre;

export function SearchForm({
  action,
  params,
  placeholder = t.buscar.placeholder,
  trailing,
  className,
  extraHidden,
}: {
  action: string;
  params: DiscoverParams;
  placeholder?: string;
  /** T.ex. ortväljaren inne i fältet (desktop). */
  trailing?: ReactNode;
  className?: string;
  extraHidden?: Record<string, string>;
}) {
  const hidden: Record<string, string> = {
    ...(params.ort ? { ort: params.ort } : {}),
    ...(params.km ? { km: String(params.km) } : {}),
    ...(params.blixt ? { blixt: "1" } : {}),
    ...(params.betyg ? { betyg: "1" } : {}),
    ...(params.sortera ? { sortera: params.sortera } : {}),
    ...extraHidden,
  };
  return (
    <form
      action={action}
      method="get"
      role="search"
      className={cn(
        "flex h-14 items-center gap-2.5 rounded-panel bg-surface pr-1.5 pl-4 text-ink shadow-soft",
        className,
      )}
    >
      {Object.entries(hidden).map(([k, v]) => (
        <input key={k} type="hidden" name={k} value={v} />
      ))}
      <Search
        aria-hidden="true"
        className="size-4.5 shrink-0 text-muted"
        strokeWidth={2}
      />
      <label className="sr-only" htmlFor="upptack-q">
        {t.buscar.label}
      </label>
      <input
        id="upptack-q"
        type="search"
        name="q"
        defaultValue={params.q}
        maxLength={SEARCH_MAX}
        placeholder={placeholder}
        className="h-full min-w-0 flex-1 bg-transparent text-15 outline-none placeholder:text-muted"
      />
      {trailing}
      <button
        type="submit"
        aria-label={t.buscar.boton}
        className="flex size-11 shrink-0 items-center justify-center rounded-control bg-ink text-on-dark hover:bg-ink-soft focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink"
      >
        <Search aria-hidden="true" className="size-4.5" strokeWidth={2.2} />
      </button>
    </form>
  );
}
