// WP-66: urvalet från AI-importens förhandsgranskning → wizardens data. Inget
// sparas här: ägaren går igenom de vanliga stegen (Negocio → Servicios →
// Equipo → Horario → Tu página) och `completeOnboarding` validerar allt.
import type { ImportChoice } from "@/components/import/import-panel";

import { slugify } from "./client-validation";
import type { WizardData, WizardPageDefaults } from "./types";

const norm = (s: string) => s.trim().toLowerCase().replace(/\s+/g, " ");

export function applyImportToWizard(
  data: WizardData,
  choice: ImportChoice,
): { data: WizardData; page: WizardPageDefaults } {
  const b = choice.business;
  const business = { ...data.business };
  if (b.name) {
    business.name = b.name;
    if (!business.slugTouched) business.slug = slugify(b.name);
  }
  if (b.district) business.comuna = b.district;
  if (b.category) business.category = b.category;
  if (choice.profile.phone) business.phone = choice.profile.phone;

  const taken = new Set(data.services.map((s) => norm(s.name)));
  const services = [...data.services];
  const newIndexes: number[] = [];
  for (const s of choice.services) {
    if (taken.has(norm(s.name))) continue;
    taken.add(norm(s.name));
    newIndexes.push(services.length);
    services.push({
      name: s.name,
      durationMin: s.durationMin,
      priceClp: s.price,
      description: s.description || undefined,
      category: s.category || undefined,
    });
  }

  const takenStaff = new Set(data.staff.map((s) => norm(s.name)));
  const staff = [...data.staff];
  for (const st of choice.staff) {
    if (takenStaff.has(norm(st.name))) continue;
    takenStaff.add(norm(st.name));
    staff.push({
      name: st.name,
      serviceIndexes: newIndexes.length > 0 ? newIndexes : [],
      title: st.title || undefined,
    });
  }

  const hours = choice.hours
    ? choice.hours.map((h) => ({
        weekday: h.weekday,
        open: h.open,
        start: h.open ? h.start : "09:00",
        end: h.open ? h.end : "19:00",
      }))
    : data.hours;

  return {
    data: { business, services, staff, hours },
    page: {
      about: choice.profile.about ?? "",
      address: choice.profile.address ?? "",
      instagram: choice.profile.instagram ?? "",
      tiktok: choice.profile.tiktok ?? "",
      facebook: choice.profile.facebook ?? "",
    },
  };
}
