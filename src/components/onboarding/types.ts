// Klientens interna form av onboarding-wizarden (WP-15 slim, F1). Skickas till servern
// bara en gång, i sista steget (`onboarding-wizard.tsx`); `src/server/onboarding/schemas.ts`
// validerar allt på nytt.
import type { IsoWeekday } from "@/lib/format/dates";

export type WizardBusiness = {
  name: string;
  slug: string;
  /** Sant efter att ägaren själv skrivit i slug-fältet: slutar då auto-uppdateras
   * inte längre från `name`. */
  slugTouched: boolean;
  comuna: string;
  category: string;
  phone: string;
};

export type WizardService = {
  name: string;
  durationMin: string;
  priceClp: string;
};

export type WizardStaff = {
  name: string;
  serviceIndexes: number[];
};

export type WizardHours = {
  weekday: IsoWeekday;
  open: boolean;
  start: string;
  end: string;
};

export type WizardData = {
  business: WizardBusiness;
  services: WizardService[];
  staff: WizardStaff[];
  hours: WizardHours[];
};

export const STEP_IDS = [
  "business",
  "services",
  "staff",
  "hours",
  "done",
] as const;
export type StepId = (typeof STEP_IDS)[number];

/**
 * Spegel av `OnboardingResult` (`src/server/onboarding/complete-onboarding.ts`) —
 * duplicerad i stället för importerad, för att en "use client"-fil aldrig ska importera
 * något under `@/server/*` (arkitekturgränsen i `src/server/boundaries.test.ts`, som inte
 * gör undantag för typimporter).
 */
export type OnboardingSubmitResult =
  { ok: true; businessId: string; slug: string } | { ok: false; code: string };
