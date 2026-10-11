"use client";

// Erbjudandebilden (WP-70): samma flöde som profilbilderna (`settings/upload-image.ts`) —
// servern signerar `<business_id>/<uuid>.<ext>`, filen laddas upp direkt till Storage
// (`offer-images`), och `saveOffer` kontrollerar objektet innan URL:en sparas. Typ och
// storlek kontrolleras här bara för ett snabbare fel; servern och bucketen avgör.
import { createSupabaseBrowserClient } from "@/lib/supabase/browser";
import {
  OFFER_IMAGE_BUCKET,
  OFFER_IMAGE_CONTENT_TYPES,
  OFFER_IMAGE_MAX_BYTES,
  type OfferImageContentType,
} from "@/lib/validation/offers";

import type { OffersActions } from "./types";

function isContentType(t: string): t is OfferImageContentType {
  return (OFFER_IMAGE_CONTENT_TYPES as readonly string[]).includes(t);
}

/** Laddar upp filen och returnerar sökvägen i bucketen, eller en felkod. */
export async function uploadOfferImage(
  file: File,
  createImageUpload: OffersActions["createImageUpload"],
): Promise<{ path: string } | { code: string }> {
  if (!isContentType(file.type)) return { code: "offers.image_type_invalid" };
  if (file.size > OFFER_IMAGE_MAX_BYTES) {
    return { code: "offers.image_too_large" };
  }
  const ticket = await createImageUpload({
    contentType: file.type,
    size: file.size,
  });
  if (!ticket.ok) return { code: ticket.code };
  const supabase = createSupabaseBrowserClient();
  const { error } = await supabase.storage
    .from(OFFER_IMAGE_BUCKET)
    .uploadToSignedUrl(ticket.path, ticket.token, file);
  if (error) return { code: "offers.upload_failed" };
  return { path: ticket.path };
}
