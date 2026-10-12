// CategoryTabs — WP-40 (D-031): tjänsterna grupperade i kategoriflikar på
// bokningssidan. Samma Pill-komponent och radmönster som StaffPicker
// (`staff-picker.tsx`): radbryts i stället för att scrolla i sidled (sidledsscrollen
// gjorde mobilsidan bredare än skärmen). Se `.visual-diff/ref/falt-kategorier.html` (telefonmockupen)
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
    <div className="flex flex-wrap gap-2">
      {tabs.map((tab) => (
        <Pill
          key={tab.id}
          selected={selectedId === tab.id}
          onClick={() => {
            onSelect(tab.id);
          }}
        >
          {tab.name}
        </Pill>
      ))}
    </div>
  );
}
