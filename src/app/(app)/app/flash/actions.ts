"use server";

// Server actions för /app/flash (WP-30, F13). `userId`/`businessId` läses ur
// den verifierade sessionen här, aldrig från klienten — samma mönster som
// `src/app/(app)/app/caja/actions.ts`. Den faktiska behörighets-/
// tillgänglighetskontrollen sker i `src/server/flash/` (scheduling-engineer).
import type {
  CreateFlashResult,
  CreateFlashSlotInput as ClientCreateFlashSlotInput,
  SendFlashCampaignInput,
  SendFlashCampaignResult,
} from "@/components/flash/types";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { sendFlashCampaign } from "@/server/campaigns";
import { cancelFlashSlot, type CancelFlashSlotResult } from "@/server/flash";
import { getCurrentMember } from "@/server/onboarding/owner-business";
import { createFlashSlotFromDialog } from "@/server/owner/flash-slots";

async function currentMember(): Promise<
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

export async function createFlashSlotAction(
  input: ClientCreateFlashSlotInput,
): Promise<CreateFlashResult> {
  const owner = await currentMember();
  if ("ok" in owner) return owner;
  return createFlashSlotFromDialog(owner.userId, owner.businessId, input);
}

export async function cancelFlashSlotAction(
  id: string,
): Promise<CancelFlashSlotResult> {
  const owner = await currentMember();
  if ("ok" in owner) return { ok: false, code: "forbidden" };
  return cancelFlashSlot(owner.userId, owner.businessId, id);
}

export async function sendFlashCampaignAction(
  input: SendFlashCampaignInput,
): Promise<SendFlashCampaignResult> {
  const owner = await currentMember();
  if ("ok" in owner) return { ok: false, code: "forbidden" };
  return sendFlashCampaign(owner.userId, owner.businessId, input);
}
