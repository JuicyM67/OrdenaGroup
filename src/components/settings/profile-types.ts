// Klientens typer för "Ajustes → Perfil" (WP-41 steg 4). Speglar
// `src/server/owner/profile.ts`, duplicerade i stället för importerade: en
// "use client"-fil importerar aldrig något under `@/server/*` (samma regel
// som `./types.ts`/`./booking-form-types.ts`).
export type ProfileImage = { id: string; url: string };

export type ProfileSettingsData = {
  about: string;
  instagram: string;
  /** WP-51: samma regler som instagram. Frivilliga (`ProfileSettings`,
   * servertypen, saknar dem ännu tills `src/server/owner/profile.ts`
   * uppdateras — se `updatePageProfileAction`s kommentar) — behandla en
   * saknad nyckel som tom sträng. */
  tiktok?: string;
  facebook?: string;
  address: string;
  phone: string;
  coverUrl: string | null;
  logoUrl: string | null;
  gallery: ProfileImage[];
  /** WP-44: personalens foton, `staffId` → publik URL (bara de som har ett). */
  staffPhotos: Record<string, string>;
};

export type ProfileMutationResult = { ok: true } | { ok: false; code: string };

export type ImageUploadTicket =
  | { ok: true; path: string; signedUrl: string; token: string }
  | { ok: false; code: string };

export type ConfirmImageResult =
  { ok: true; url: string; imageId?: string } | { ok: false; code: string };

/** WP-44: `"staff"` = personalens profilbild. */
export type ImageKind = "cover" | "logo" | "gallery" | "staff";

export type DeleteImageTarget =
  | { kind: "gallery"; id: string }
  | { kind: "cover" }
  | { kind: "logo" }
  | { kind: "staff"; staffId: string };

/** WP-51: subconjunto que necesita `SingleImageField` (`profile-section.tsx`,
 * reutilizado en el paso "Tu página" del onboarding) — así ese paso no
 * necesita implementar `updateStaffTitle`/`reorderImages`, que no usa.
 * `deleteImage` se declara con el `target` angosto (solo portada/logo, no
 * todo `DeleteImageTarget`) a propósito: así una función MÁS amplia como
 * `ProfileActions["deleteImage"]` sigue siendo asignable acá (contravarianza
 * de parámetros), tanto desde Ajustes como desde el onboarding. */
export type SingleImageFieldActions = {
  createImageUpload: (input: unknown) => Promise<ImageUploadTicket>;
  confirmImageUpload: (input: unknown) => Promise<ConfirmImageResult>;
  deleteImage: (
    target: { kind: "cover" } | { kind: "logo" },
  ) => Promise<ProfileMutationResult>;
};

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
