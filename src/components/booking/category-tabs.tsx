// CategoryTabs — WP-40 (D-031): tjänsterna grupperade i kategoriflikar på
// bokningssidan. Samma Pill-komponent och scroll-mönster som StaffPicker
// (`staff-picker.tsx`): full bredd, scrollar horisontellt i stället för att
// bryta rad. Se `.visual-diff/ref/falt-kategorier.html` (telefonmockupen)
// för formspråket — ingen skalenlig mobilreferens finns för den här raden,
// så den återanvänder StaffPickers redan godkända Pill-mönster i stället
// för mockupens `role="tablist"` (som skulle krocka med Pills egna
// `aria-pressed`, se DESIGN.md §9).
import { Pill } from "@/components/ui/pill";

import type { CategoryTab } from "./categories";

export function CategoryTabs({
  tabs,
  selectedId,
  onSelect,
}: {
  tabs: readonly CategoryTab[];
  selectedId: string;
  onSelect: (id: string) => void;
}) {
  return (
    <div className="-mx-5 flex snap-x gap-2 overflow-x-auto px-5">
      {tabs.map((tab) => (
        <Pill
          key={tab.id}
          selected={selectedId === tab.id}
          onClick={() => {
            onSelect(tab.id);
          }}
          className="snap-start"
        >
          {tab.name}
        </Pill>
      ))}
    </div>
  );
}
