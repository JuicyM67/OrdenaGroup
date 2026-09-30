"use client";

// Uppladdningsflödet delat mellan omslag/logo/galleri (profile-section.tsx, WP-41) och
// personalens profilbild (staff-section.tsx, WP-44): samma tre steg (signera, ladda upp
// direkt till Storage, bekräfta) och samma typ-/storleksvalidering på klienten (servern
// validerar alltid själv, hård regel 2 — det här är bara en snabbare felkoll).
import { createSupabaseBrowserClient } from "@/lib/supabase/browser";
import {
  IMAGE_CONTENT_TYPES,
  IMAGE_MAX_BYTES,
  MEDIA_BUCKET,
  type ImageContentType,
} from "@/lib/validation/profile";

import type { ConfirmImageResult, ImageKind, ImageUploadTicket } from "./profile-types";

export type UploadImageActions = {
  createImageUpload: (input: unknown) => Promise<ImageUploadTicket>;
  confirmImageUpload: (input: unknown) => Promise<ConfirmImageResult>;
};

function isImageContentType(t: string): t is ImageContentType {
  return (IMAGE_CONTENT_TYPES as readonly string[]).includes(t);
}

/** Sube un archivo ya validado y devuelve la URL pública final, o `null`.
 * `staffId` solo se usa (y solo es necesario) cuando `kind === "staff"` (WP-44). */
export async function uploadImage(
  file: File,
  target: { kind: ImageKind; staffId?: string },
  actions: UploadImageActions,
): Promise<{ url: string; imageId?: string } | { code: string }> {
  if (!isImageContentType(file.type)) {
    return { code: "profile.image_type_invalid" };
  }
  if (file.size > IMAGE_MAX_BYTES) return { code: "profile.image_too_large" };

  const ticket = await actions.createImageUpload({
    kind: target.kind,
    contentType: file.type,
    size: file.size,
    staffId: target.staffId,
  });
  if (!ticket.ok) return { code: ticket.code };

  const supabase = createSupabaseBrowserClient();
  const { error } = await supabase.storage
    .from(MEDIA_BUCKET)
    .uploadToSignedUrl(ticket.path, ticket.token, file);
  if (error) return { code: "profile.upload_failed" };

  const confirmed = await actions.confirmImageUpload({
    kind: target.kind,
    path: ticket.path,
    staffId: target.staffId,
  });
  if (!confirmed.ok) return { code: confirmed.code };
  return { url: confirmed.url, imageId: confirmed.imageId };
}
