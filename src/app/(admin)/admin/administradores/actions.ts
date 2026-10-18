"use server";

// WP-80 (D-061): lägg till/ta bort plattformsadmins. `requireAdminForAction()`
// (admin + aal2) FÖRST; reglerna (inte sig själv, inte den sista) och loggen
// ligger i `src/server/admin/admins.ts`.
import { revalidatePath } from "next/cache";

import {
  addPlatformAdmin,
  removePlatformAdmin,
  type AdminMutationResult,
} from "@/server/admin/admins";
import { requireAdminForAction } from "@/server/admin/auth";

// Bara typer till klientkomponenten (boundaries.test.ts).
export type { AdminMutationResult };

export async function addAdminAction(
  email: string,
): Promise<AdminMutationResult> {
  const admin = await requireAdminForAction();
  const result = await addPlatformAdmin(admin.userId, email);
  revalidatePath("/admin/administradores");
  return result;
}

export async function removeAdminAction(
  targetUserId: string,
): Promise<AdminMutationResult> {
  const admin = await requireAdminForAction();
  const result = await removePlatformAdmin(admin.userId, targetUserId);
  revalidatePath("/admin/administradores");
  return result;
}
