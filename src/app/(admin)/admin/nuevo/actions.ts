"use server";

import { requireAdminForAction } from "@/server/admin/auth";
import {
  inviteBusiness,
  type InviteBusinessInput,
  type InviteBusinessResult,
} from "@/server/admin/invite";

// Reexporterade bara som TYPER: `invite-form.tsx` ("use client") får inte
// importera något från `@/server/*` (boundaries.test.ts), så klientkomponenten
// importerar de här typerna härifrån i stället — samma mönster som
// `LoginForm` importerar `RequestMagicLinkResult` från `.../login/actions`.
export type { InviteBusinessInput, InviteBusinessResult };

export async function inviteBusinessAction(
  input: InviteBusinessInput,
): Promise<InviteBusinessResult> {
  const admin = await requireAdminForAction();
  return inviteBusiness(admin.userId, input);
}
