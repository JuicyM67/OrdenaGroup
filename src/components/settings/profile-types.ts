// Klientens typer för "Ajustes → Perfil" (WP-41 steg 4). Speglar
// `src/server/owner/profile.ts`, duplicerade i stället för importerade: en
// "use client"-fil importerar aldrig något under `@/server/*` (samma regel
// som `./types.ts`/`./booking-form-types.ts`).
export type ProfileImage = { id: string; url: string };

export type ProfileSettingsData = {
  about: string;
  instagram: string;
  address: string;
  phone: string;
  coverUrl: string | null;
  logoUrl: string | null;
  gallery: ProfileImage[];
};

export type ProfileMutationResult = { ok: true } | { ok: false; code: string };

export type ImageUploadTicket =
  | { ok: true; path: string; signedUrl: string; token: string }
  | { ok: false; code: string };

export type ConfirmImageResult =
  { ok: true; url: string; imageId?: string } | { ok: false; code: string };

export type ImageKind = "cover" | "logo" | "gallery";

export type DeleteImageTarget =
  { kind: "gallery"; id: string } | { kind: "cover" } | { kind: "logo" };

export type ProfileActions = {
  updateBusinessProfile: (input: unknown) => Promise<ProfileMutationResult>;
  /** WP-41: staff.title, ägd av profile.ts (inte `AjustesActions.updateStaff`). */
  updateStaffTitle: (
    staffId: string,
    title: string,
  ) => Promise<ProfileMutationResult>;
  createImageUpload: (input: unknown) => Promise<ImageUploadTicket>;
  confirmImageUpload: (input: unknown) => Promise<ConfirmImageResult>;
  deleteImage: (target: DeleteImageTarget) => Promise<ProfileMutationResult>;
  reorderImages: (ids: string[]) => Promise<ProfileMutationResult>;
};
