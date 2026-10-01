// Klientöarna i profilvyn (WP-53, D-040): servern renderar all text/markup
// (`profile-browse.tsx` m.fl.), de här komponenterna läser bara
// `ProfileFlowContext` för att visa rätt flik/knapptillstånd och starta
// bokningsflödet. Tar bara emot redan formaterat innehåll (`ReactNode`) eller
// rena strängar som props — importerar aldrig `@/i18n` eller
// `@/lib/format/*` själva, så att de texterna/funktionerna inte behöver följa
// med i klientbunten (JS-budgeten).
"use client";

import type { ReactNode } from "react";

import { Button } from "@/components/ui/button";

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
  /** Hela raden (`ProfileServiceRow`), färdigrenderad av servern. */
  readonly node: ReactNode;
}

/** Tjänstelistan: raderna är redan formaterade av servern, filtret efter
 * vald kategoriflik körs bara mot id:n här (ingen text/formatering i klienten). */
export function ProfileServiceList({
  rows,
  emptyLabel,
  className,
}: {
  rows: readonly ProfileServiceRowEntry[];
  emptyLabel: string;
  className?: string;
}) {
  const { categoryId } = useProfileFlow();
  const visible =
    categoryId === ALL_CATEGORY_ID
      ? rows
      : categoryId === UNCATEGORIZED_CATEGORY_ID
        ? rows.filter((r) => r.categoryId === null)
        : rows.filter((r) => r.categoryId === categoryId);

  if (visible.length === 0) {
    return <p className="text-14 text-muted">{emptyLabel}</p>;
  }
  // Ingen extra wrapper-`<div>` när anroparen inte skickar en `className`
  // (datorns `rounded-tile bg-surface px-5`-yta äger redan radernas behållare).
  if (!className) return <>{visible.map((r) => r.node)}</>;
  return <div className={className}>{visible.map((r) => r.node)}</div>;
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
        className="flex border-b border-border px-4"
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
            className={`border-b-2 px-2.5 py-3 text-14 transition-colors duration-150 ease-out focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink focus-visible:transition-none ${
              mobileTab === tab.id
                ? "border-ink font-bold text-ink"
                : "border-transparent font-semibold text-muted"
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      <div className="flex flex-col gap-3.5 px-4 py-3.5 pb-32">
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
