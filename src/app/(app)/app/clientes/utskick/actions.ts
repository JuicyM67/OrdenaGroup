"use server";

// Server actions för Campañas (WP-31, F14): varje anrop läser `userId` ur
// den verifierade sessionen och `businessId` via `getCurrentMember` här inne
// — aldrig från klienten (samma regel som src/app/(app)/app/ajustes/actions.ts).
// `src/server/campaigns/send.ts` (integrations-engineer) kontrollerar
// behörigheten (ägare/`can_manage_all_bookings`) igen själv, RLS gäller.
import { createSupabaseServerClient } from "@/lib/supabase/server";
import {
  previewCampaign,
  sendCampaign,
  listCampaigns,
  type PreviewCampaignResult,
  type SendCampaignResult,
} from "@/server/campaigns/send";
import type { CampaignInput, CampaignListItem } from "@/server/campaigns/types";
import { getCurrentMember } from "@/server/onboarding/owner-business";

async function currentOwner(): Promise<
  { userId: string; businessId: string } | { ok: false; code: "forbidden" }
> {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, code: "forbidden" };
  const current = await getCurrentMember(user.id);
  if (!current) return { ok: false, code: "forbidden" };
  return { userId: user.id, businessId: current.business.id };
}

export async function previewCampaignAction(
  input: CampaignInput,
): Promise<PreviewCampaignResult> {
  const owner = await currentOwner();
  if ("ok" in owner) return owner;
  return previewCampaign(owner.userId, owner.businessId, input);
}

export async function sendCampaignAction(
  input: CampaignInput,
): Promise<SendCampaignResult> {
  const owner = await currentOwner();
  if ("ok" in owner) return owner;
  return sendCampaign(owner.userId, owner.businessId, input);
}

export async function listCampaignsAction(): Promise<CampaignListItem[]> {
  const owner = await currentOwner();
  if ("ok" in owner) return [];
  return listCampaigns(owner.userId, owner.businessId);
}
