// Klientöarna i profilvyn (WP-53, D-040): servern renderar all text/markup
// (`profile-browse.tsx` m.fl.), de här komponenterna läser bara
// `ProfileFlowContext` för att visa rätt flik/knapptillstånd och starta
// bokningsflödet. Tar bara emot redan formaterat innehåll (`ReactNode`) eller
// rena strängar som props — importerar aldrig `@/i18n` eller
// `@/lib/format/*` själva, så att de texterna/funktionerna inte behöver följa
// med i klientbunten (JS-budgeten).
"use client";

import { useState, type ReactNode } from "react";

import { Button } from "@/components/ui/button";
import { reserva } from "@/i18n";

import { ALL_CATEGORY_ID, UNCATEGORIZED_CATEGORY_ID } from "./categories";
import type { CategoryTab } from "./categories";
import { CategoryTabs } from "./category-tabs";
import { useProfileFlow, type MobileTab } from "./profile-flow-context";

/** Kategoriflikarna i profilvyn — samma `CategoryTabs`/`Pill` som
 * bokningsflödets eget tjänsteval (redan i klientbunten där), bara kopplad
 * mot `ProfileFlowContext` i stället för lokala props. */
export function ProfileCategoryTabs({
  tabs,
}: {
  tabs: readonly CategoryTab[];
}) {
  const { categoryId, onSelectCategory } = useProfileFlow();
  return (
    <CategoryTabs
      tabs={tabs}
      selectedId={categoryId}
      onSelect={onSelectCategory}
    />
  );
}

export interface ProfileServiceRowEntry {
  readonly id: string;
  readonly categoryId: string | null;
  /** WP-81: personal som utför tjänsten (personalfiltret). */
  readonly staffIds?: readonly string[];
  /** Radens synliga huvud (namn, längd, personal, pris, chevron), färdigrenderat av
   * servern (`ProfileServiceHeader`). */
  readonly header: ReactNode;
  /** Tjänstens beskrivning (visas utfälld). */
  readonly description: string | null;
  /** Namn + längd, nytt tillgängligt namn på raden (e2e: `name: /Corte clásico/`). */
  readonly ariaLabel: string;
  /** "Välj tid" (färdig text från servern). */
  readonly cta: string;
}

/** Tjänstelistan som accordion (WP-72, Main.dc.html): raden fälls ut och visar
 * beskrivningen + "Välj tid", som startar bokningsflödet. Raderna är redan
 * formaterade av servern, filtret efter vald kategoriflik körs bara mot id:n här. */
export function ProfileServiceList({
  rows,
  emptyLabel,
  tour,
}: {
  rows: readonly ProfileServiceRowEntry[];
  emptyLabel: string;
  /** `data-tour`-namn på listan (visningen). */
  tour?: string;
}) {
  const { categoryId, bookService, staffFilter, onSelectStaff } =
    useProfileFlow();
  const [openId, setOpenId] = useState<string | null>(null);
  const byCategory =
    categoryId === ALL_CATEGORY_ID
      ? rows
      : categoryId === UNCATEGORIZED_CATEGORY_ID
        ? rows.filter((r) => r.categoryId === null)
        : rows.filter((r) => r.categoryId === categoryId);
  // WP-81: bara den valda medarbetarens behandlingar.
  const visible = staffFilter
    ? byCategory.filter((r) => r.staffIds?.includes(staffFilter.id))
    : byCategory;
  const filterChip = staffFilter ? (
    <p className="flex flex-wrap items-center gap-2 rounded-full bg-lilac py-1.5 pr-1.5 pl-4 text-13 font-semibold text-ink">
      <span className="flex-1">
        {reserva.filtroPersonal({ nombre: staffFilter.name })}
      </span>
      <button
        type="button"
        onClick={() => onSelectStaff(null)}
        className="rounded-full bg-surface px-3 py-1 text-12 font-bold text-ink hover:bg-field focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink"
      >
        {reserva.filtroPersonalQuitar} ✕
      </button>
    </p>
  ) : null;

  if (visible.length === 0) {
    return (
      <div className="flex flex-col gap-3">
        {filterChip}
        <p className="text-14 text-muted">{emptyLabel}</p>
      </div>
    );
  }
  return (
    <div data-tour={tour} className="flex flex-col gap-2">
      {filterChip}
      {visible.map((r, i) => {
        const open = openId === r.id;
        return (
          <div
            key={r.id}
            data-tour={i === 0 ? "book" : undefined}
            className={`overflow-hidden rounded-icon bg-surface transition-shadow duration-300 ease-out ${open ? "shadow-row-open" : ""}`}
          >
            <button
              type="button"
              aria-expanded={open}
              aria-controls={`svc-${r.id}`}
              aria-label={r.ariaLabel}
              onClick={() => {
                setOpenId(open ? null : r.id);
              }}
              className="group flex min-h-15 w-full items-center gap-3.5 px-4 py-2.5 text-left -outline-offset-2 focus-visible:outline-2 focus-visible:outline-ink"
            >
              {r.header}
            </button>
            {open ? (
              <div
                id={`svc-${r.id}`}
                className="flex flex-col gap-3 px-4 pb-4 sm:flex-row sm:items-end sm:gap-4"
              >
                <p className="flex-1 text-14 leading-relaxed text-ink-soft">
                  {r.description}
                </p>
                <button
                  type="button"
                  onClick={() => {
                    bookService(r.id);
                  }}
                  className="h-10 shrink-0 rounded-event bg-ink px-4.5 text-13 font-bold text-on-dark focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink"
                >
                  {r.cta}
                </button>
              </div>
            ) : null}
          </div>
        );
      })}
    </div>
  );
}

/** Mobilens fyra flikar (Tjänster/Personal/Om oss/Info) — panelerna är redan
 * färdigrenderade av servern (`panels`), komponenten här visar bara den
 * valda och sköter `role="tab"`/`aria-selected`. */
export function ProfileMobileTabs({
  tabs,
  tablistLabel,
  panels,
}: {
  tabs: readonly { id: MobileTab; label: string }[];
  tablistLabel: string;
  panels: Readonly<Record<MobileTab, ReactNode>>;
}) {
  const { mobileTab, onSelectMobileTab } = useProfileFlow();
  return (
    <>
      <div
        role="tablist"
        aria-label={tablistLabel}
        className="flex overflow-x-auto border-b border-border px-4"
      >
        {tabs.map((tab) => (
          <button
            key={tab.id}
            type="button"
            role="tab"
            aria-selected={mobileTab === tab.id}
            onClick={() => {
              onSelectMobileTab(tab.id);
            }}
            className={`shrink-0 border-b-2 px-2.5 py-3 text-14 transition-colors duration-150 ease-out focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink focus-visible:transition-none ${
              mobileTab === tab.id
                ? "border-ink font-bold text-ink"
                : "border-transparent font-semibold text-muted"
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      <div className="flex flex-col gap-3.5 overflow-x-clip px-4 py-3.5 pb-32">
        {panels[mobileTab]}
      </div>
    </>
  );
}

/** Raden/pillens hela klickyta — ett "Boka" på en tjänst (`ProfileServiceRow`)
 * eller sidopanelens snabbaste tid (`FastestTimesCard`). Innehållet
 * (`children`) är redan formaterat av servern. */
export function ProfileServiceButton({
  serviceId,
  ariaLabel,
  className,
  children,
}: {
  serviceId: string;
  ariaLabel?: string;
  className?: string;
  children: ReactNode;
}) {
  const { bookService } = useProfileFlow();
  return (
    <button
      type="button"
      onClick={() => {
        bookService(serviceId);
      }}
      aria-label={ariaLabel}
      className={className}
    >
      {children}
    </button>
  );
}

/** Mobilens fasta "Boka nu"-rad. `serviceId` är `null` när ingen tid är ledig
 * (knappen syns ändå, som i referensen — klicket blir bara ett no-op). */
export function ProfileBookNowButton({
  serviceId,
  className,
  children,
}: {
  serviceId: string | null;
  className?: string;
  children: ReactNode;
}) {
  const { bookService } = useProfileFlow();
  return (
    <Button
      variant="accent"
      size="lg"
      className={className}
      onClick={() => {
        if (serviceId) bookService(serviceId);
      }}
    >
      {children}
    </Button>
  );
}
