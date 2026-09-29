// Klientens typer för Ajustes (WP-15b slim). Speglar `src/server/owner/ajustes.ts`,
// duplicerade i stället för importerade: en "use client"-fil importerar aldrig
// något under `@/server/*` (samma regel som src/components/onboarding/types.ts).
export type AjustesBusiness = {
  name: string;
  slug: string;
  comuna: string;
  phone: string;
  address: string;
  minNoticeMinutes: number;
  maxDaysAhead: number;
  cancelWindowHours: number;
  slotIntervalMinutes: number;
};

export type AjustesService = {
  id: string;
  name: string;
  durationMin: number;
  priceClp: number;
  bufferAfterMin: number;
  active: boolean;
  /** WP-41: "" = sin descripción. */
  description: string;
};

export type AjustesStaffMember = {
  id: string;
  name: string;
  active: boolean;
  /** WP-41: rol, "" = sin rol (se guarda con `ProfileActions.updateStaffTitle`,
   * no con `updateStaff`: mismo split que en `src/server/owner/profile.ts`). */
  title: string;
  serviceIds: string[];
};

export type AjustesHour = {
  weekday: 1 | 2 | 3 | 4 | 5 | 6 | 7;
  open: boolean;
  start: string;
  end: string;
};

export type AjustesData = {
  business: AjustesBusiness;
  services: AjustesService[];
  staff: AjustesStaffMember[];
  hours: AjustesHour[];
};

export type MutationResult = { ok: true } | { ok: false; code: string };
export type CreateResult =
  { ok: true; id: string } | { ok: false; code: string };

export type AjustesActions = {
  updateBusinessSettings: (input: unknown) => Promise<MutationResult>;
  createService: (input: unknown) => Promise<CreateResult>;
  updateService: (id: string, input: unknown) => Promise<MutationResult>;
  setServiceActive: (id: string, active: boolean) => Promise<MutationResult>;
  createStaff: (input: unknown) => Promise<CreateResult>;
  updateStaff: (id: string, input: unknown) => Promise<MutationResult>;
  setStaffActive: (id: string, active: boolean) => Promise<MutationResult>;
  updateHours: (input: unknown) => Promise<MutationResult>;
};
