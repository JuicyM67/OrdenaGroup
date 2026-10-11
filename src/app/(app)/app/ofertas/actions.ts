"use server";

// Server actions för /app/erbjudanden (WP-70, D-056). `userId`/`businessId` kommer
// alltid från den verifierade sessionen här, aldrig från klienten. Behörighet, plan
// och prisvakt kontrolleras i `src/server/marketplace/owner.ts` och i databasen.
import { marketplaceEnabled } from "@/config/marketplace";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import {
  createOfferImageUpload,
  saveOffer,
  setOfferStatus,
} from "@/server/marketplace/owner";
import { getCurrentMember } from "@/server/onboarding/owner-business";

async function currentMember(): Promise<{
  userId: string;
  businessId: string;
} | null> {
  if (!marketplaceEnabled()) return null;
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;
  const current = await getCurrentMember(user.id);
  if (!current) return null;
  return { userId: user.id, businessId: current.business.id };
}

export async function saveOfferAction(
  offerId: string | null,
  input: unknown,
): Promise<{ ok: true; id: string } | { ok: false; code: string }> {
  const m = await currentMember();
  if (!m) return { ok: false, code: "unauthorized" };
  return saveOffer(m.userId, m.businessId, offerId, input);
}

export async function setOfferStatusAction(
  offerId: string,
  status: "published" | "paused",
): Promise<{ ok: true } | { ok: false; code: string }> {
  const m = await currentMember();
  if (!m) return { ok: false, code: "unauthorized" };
  return setOfferStatus(m.userId, m.businessId, offerId, status);
}

export async function createOfferImageUploadAction(
  input: unknown,
): Promise<
  | { ok: true; path: string; signedUrl: string; token: string }
  | { ok: false; code: string }
> {
  const m = await currentMember();
  if (!m) return { ok: false, code: "unauthorized" };
  return createOfferImageUpload(m.userId, m.businessId, input);
}
