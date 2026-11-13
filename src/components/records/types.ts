// WP-88 (D-074): vy-modeller för fichan och Ajustes → Ficha. Ren typfil (ingen
// "use client", inga `@/server/*`-importer) — samma motiv som
// `src/components/settings/types.ts`: klientkomponenter importerar aldrig från
// servern, servern bygger de här formerna.

export const RECORD_FIELD_KEYS = [
  "allergies",
  "contraindications",
  "observations",
] as const;

export type RecordFieldKey = (typeof RECORD_FIELD_KEYS)[number];

export function isRecordFieldKey(v: unknown): v is RecordFieldKey {
  return (
    typeof v === "string" &&
    (RECORD_FIELD_KEYS as readonly string[]).includes(v)
  );
}

export type ConsentSourceKey = "booking" | "manage_link" | "in_person";

export type FichaBookingOption = {
  id: string;
  serviceName: string;
  /** ISO UTC. */
  start: string;
};

export type FichaEntry = {
  id: string;
  body: string;
  /** ISO UTC. */
  createdAt: string;
  authorName: string | null;
  /** WP-91 (D-077): författaren eller ägaren kan annullera (en gång). */
  canVoid: boolean;
  /** Annullerad: texten finns kvar och visas överstruken. */
  voided: {
    /** ISO UTC. */
    at: string;
    reason: string;
    byName: string | null;
  } | null;
  booking: FichaBookingOption | null;
};

export type FichaConsent = {
  templateId: string;
  title: string;
  active: boolean;
  /** Kort form av mallens aktuella sha256 (för visning). */
  currentVersion: string;
  /** Senaste godkännandet, om något. */
  accepted: {
    version: string;
    /** ISO UTC. */
    at: string;
    source: ConsentSourceKey;
    isCurrent: boolean;
  } | null;
};

export type FichaData = {
  customer: { id: string; name: string };
  fields: RecordFieldKey[];
  values: Record<RecordFieldKey, string>;
  /** ISO UTC, `null` = aldrig sparat. */
  valuesUpdatedAt: string | null;
  entries: FichaEntry[];
  consents: FichaConsent[];
  bookings: FichaBookingOption[];
  /** Planen har `records` (annars bara läsning + uppgraderingsruta). */
  canWrite: boolean;
};

export type FichaMutationResult =
  | { ok: true }
  | {
      ok: false;
      code:
        | "unauthorized"
        | "forbidden"
        | "not_found"
        | "plan_locked"
        | "invalid_input"
        | "unexpected";
    };

export type SigningLinkResult =
  { ok: true; path: string } | Exclude<FichaMutationResult, { ok: true }>;

export type FichaActions = {
  saveFields: (
    values: Partial<Record<RecordFieldKey, string>>,
  ) => Promise<FichaMutationResult>;
  addEntry: (input: {
    body: string;
    bookingId: string | null;
  }) => Promise<FichaMutationResult>;
  voidEntry: (input: {
    entryId: string;
    reason: string;
  }) => Promise<FichaMutationResult>;
  createSigningLink: (input: {
    templateId: string;
    bookingId: string | null;
  }) => Promise<SigningLinkResult>;
  /** WP-91 (D-077): solo el dueño — la ficha de este cliente como archivo. */
  exportFicha?: () => Promise<
    { ok: true; filename: string; html: string } | { ok: false; code: string }
  >;
};

// Ajustes → Ficha ---------------------------------------------------------------

export type ConsentTemplateItem = {
  id: string;
  title: string;
  body: string;
  active: boolean;
  serviceIds: string[];
};

export type RecordSettingsData = {
  fields: RecordFieldKey[];
  templates: ConsentTemplateItem[];
  services: { id: string; name: string; active: boolean }[];
};

export type SaveTemplateInput = {
  id: string | null;
  title: string;
  body: string;
  active: boolean;
  serviceIds: string[];
};

export type RecordSettingsActions = {
  saveFields: (fields: RecordFieldKey[]) => Promise<FichaMutationResult>;
  saveTemplate: (
    input: SaveTemplateInput,
  ) => Promise<FichaMutationResult | { ok: false; code: "limit" }>;
};
