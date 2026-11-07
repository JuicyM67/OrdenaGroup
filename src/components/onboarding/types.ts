// Klientens interna form av onboarding-wizarden (WP-15 slim, F1). Skickas till servern
// bara en gång, i sista steget (`onboarding-wizard.tsx`); `src/server/onboarding/schemas.ts`
// validerar allt på nytt.
//
// WP-51 (steget "Tu página"): till skillnad från `business`/`services`/`staff`/`hours`
// ovan sparas det här steget INTE i `WizardData`/`onboardingInputSchema` — det körs
// EFTER att företaget redan skapats (se `finish()` i onboarding-wizard.tsx), så det
// återanvänder samma server actions som Ajustes → Perfil (`app/onboarding/actions.ts`,
// tunna omslag runt `src/server/owner/profile.ts`) i stället för ett eget skrivsteg i
// den stora transaktionen.
import type { IsoWeekday } from "@/lib/format/dates";
import type {
  ProfileMutationResult,
  SingleImageFieldActions,
} from "@/components/settings/profile-types";

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
  /** WP-66: bara när tjänsten kom från en import. */
  description?: string;
  category?: string;
};

export type WizardStaff = {
  name: string;
  serviceIndexes: number[];
  /** WP-66: bara när personen kom från en import. */
  title?: string;
};

/** WP-66: profiltexter från en import, förifyllda i steget "Tu página". */
export type WizardPageDefaults = {
  about: string;
  address: string;
  instagram: string;
  tiktok: string;
  facebook: string;
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

// WP-83 (BookingBuddy WP-92): företagsuppgifterna i tre steg (negocio/rubro/lugar), importen först
// ("inicio") och planvalet ("plan") efter "pagina".
export const STEP_IDS = [
  "inicio",
  "negocio",
  "rubro",
  "lugar",
  "services",
  "staff",
  "hours",
  // WP-51: entre "hours" (fin de la transacción, el negocio ya existe) y
  // "done" ("Tu link").
  "pagina",
  "plan",
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

/** Server actions för steget "Tu página" (WP-51) — `businessId` skickas
 * aldrig från klienten, servern läser det ur sessionen (samma mönster som
 * `ProfileActions`, `settings/profile-types.ts`). Delar bilduppladdningens
 * form med `SingleImageField` (`profile-section.tsx`, återanvänd oförändrad
 * här). */
export type PageStepActions = SingleImageFieldActions & {
  updateProfile: (input: unknown) => Promise<ProfileMutationResult>;
};
