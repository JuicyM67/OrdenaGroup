// Filter och sortering (WP-68, Desktop.dc.html): ett GET-formulär (fungerar utan
// JS). Avstånd kräver delad position; utan den visas en förklaring i stället.
import Link from "next/link";

import { cn } from "@/components/ui/cn";
import { DISTANCE_OPTIONS_KM } from "@/config/marketplace";
import { descubre } from "@/i18n";

import type { DiscoverParams, MarketplaceSort } from "./params";

const t = descubre;

const OFFER_SORTS: readonly MarketplaceSort[] = [
  "near",
  "new",
  "price",
  "discount",
];

const legend = "mb-2.5 text-14 font-bold";

export function Filters({
  action,
  params,
  hasPosition,
  clearHref,
  sorts = OFFER_SORTS,
  extraHidden,
  className,
}: {
  action: string;
  params: DiscoverParams;
  hasPosition: boolean;
  clearHref: string;
  /** WP-85: företagsfliken sorterar på närmast/betyg/nyast. */
  sorts?: readonly MarketplaceSort[];
  /** GET-formulär tappar action-adressens frågesträng (t.ex. `?kategori=`). */
  extraHidden?: Record<string, string>;
  className?: string;
}) {
  return (
    <form
      action={action}
      method="get"
      className={cn("flex flex-col gap-5", className)}
    >
      {params.q ? <input type="hidden" name="q" value={params.q} /> : null}
      {params.ort ? (
        <input type="hidden" name="ort" value={params.ort} />
      ) : null}
      {Object.entries(extraHidden ?? {}).map(([k, v]) => (
        <input key={k} type="hidden" name={k} value={v} />
      ))}

      <fieldset>
        <legend className={legend}>{t.filtros.distancia}</legend>
        {hasPosition ? (
          <div className="flex flex-wrap gap-2">
            {DISTANCE_OPTIONS_KM.map((km) => (
              <label key={km} className="cursor-pointer">
                <input
                  type="radio"
                  name="km"
                  value={km}
                  defaultChecked={params.km === km}
                  className="peer sr-only"
                />
                <span className="flex h-9 items-center rounded-event border border-border bg-surface px-3 text-13 font-semibold peer-checked:border-ink peer-checked:bg-ink peer-checked:text-on-dark peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-ink">
                  {t.filtros.km({ km })}
                </span>
              </label>
            ))}
          </div>
        ) : (
          <p className="text-13 text-muted">{t.filtros.distanciaSinPosicion}</p>
        )}
      </fieldset>

      <fieldset className="flex flex-col gap-2.5">
        <legend className={legend}>{t.filtros.mostrar}</legend>
        <label className="flex cursor-pointer items-center gap-3 text-14">
          <input
            type="checkbox"
            name="blixt"
            value="1"
            defaultChecked={params.blixt === true}
            className="size-5 accent-ink"
          />
          {t.filtros.soloFlash}
        </label>
        <label className="flex cursor-pointer items-center gap-3 text-14">
          <input
            type="checkbox"
            name="betyg"
            value="1"
            defaultChecked={params.betyg === true}
            className="size-5 accent-ink"
          />
          {t.filtros.rating}
        </label>
      </fieldset>

      <label className="flex flex-col">
        <span className={legend}>{t.filtros.ordenar}</span>
        <select
          name="sortera"
          defaultValue={params.sortera ?? "near"}
          className="h-11 rounded-control bg-canvas px-3.5 text-14 font-medium focus-visible:outline-2 focus-visible:outline-ink"
        >
          {sorts.map((s) => (
            <option key={s} value={s}>
              {t.filtros.ordenes[s]}
            </option>
          ))}
        </select>
      </label>

      <div className="flex items-center gap-3">
        <button
          type="submit"
          className="flex h-11 flex-1 items-center justify-center rounded-control bg-ink px-4 text-14 font-bold text-on-dark hover:bg-ink-soft focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink"
        >
          {t.filtros.aplicar}
        </button>
        <Link
          href={clearHref}
          className="rounded-badge text-13 font-semibold text-muted underline underline-offset-4 hover:text-ink focus-visible:outline-2 focus-visible:outline-ink"
        >
          {t.filtros.limpiar}
        </Link>
      </div>
    </form>
  );
}
