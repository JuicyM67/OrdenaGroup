"use server";

// WP-86 (D-072): server actions för paket — försäljning och annullering
// (kundkortet, Caja), "Usar paquete"/"Devolver sesión" (agendan, Caja) och
// mallarna (Ajustes → Paquetes). `userId`/`businessId` läses ur den
// verifierade sessionen här, aldrig från klienten; `now` är serverns klocka.
// Behörighet och plan kontrolleras i `src/server/packages/packages.ts` (och
// igen av RLS och databasens triggers).
import { revalidatePath } from "next/cache";

import { createSupabaseServerClient } from "@/lib/supabase/server";
import { getCurrentMember } from "@/server/onboarding/owner-business";
import {
  savePackageTemplate,
  searchCustomersForPackage,
  sellPackage,
  undoPackageUse,
  redeemPackage,
  voidPackageSale,
  type PackageResult,
  type SavePackageTemplateInput,
  type SellPackageInput,
  type RedeemPackageInput,
} from "@/server/packages/packages";
import { systemClock } from "@/server/scheduling/clock";

async function currentMember(): Promise<{
  userId: string;
  businessId: string;
} | null> {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;
  const current = await getCurrentMember(user.id);
  if (!current) return null;
  return { userId: user.id, businessId: current.business.id };
}

function revalidatePackages(): void {
  revalidatePath("/app/caja");
  revalidatePath("/app/agenda");
  revalidatePath("/app/hoy");
  revalidatePath("/app/clientes/[id]", "page");
}

export async function savePackageTemplateAction(
  input: SavePackageTemplateInput,
): Promise<PackageResult<{ id: string }>> {
  const ctx = await currentMember();
  if (!ctx) return { ok: false, code: "forbidden" };
  const result = await savePackageTemplate(ctx.userId, ctx.businessId, input);
  if (result.ok) revalidatePath("/app/ajustes/paquetes");
  return result;
}

export async function sellPackageAction(
  input: SellPackageInput,
): Promise<PackageResult> {
  const ctx = await currentMember();
  if (!ctx) return { ok: false, code: "forbidden" };
  const result = await sellPackage(ctx.userId, ctx.businessId, input);
  if (result.ok) revalidatePackages();
  return result.ok ? { ok: true } : result;
}

export async function voidPackageSaleAction(input: {
  customerPackageId: string;
}): Promise<PackageResult> {
  const ctx = await currentMember();
  if (!ctx) return { ok: false, code: "forbidden" };
  const result = await voidPackageSale(
    ctx.userId,
    ctx.businessId,
    systemClock(),
    input,
  );
  if (result.ok) revalidatePackages();
  return result;
}

export async function redeemPackageAction(
  input: RedeemPackageInput,
): Promise<PackageResult> {
  const ctx = await currentMember();
  if (!ctx) return { ok: false, code: "forbidden" };
  const result = await redeemPackage(
    ctx.userId,
    ctx.businessId,
    systemClock(),
    input,
  );
  if (result.ok) revalidatePackages();
  return result.ok ? { ok: true } : result;
}

export async function undoPackageUseAction(input: {
  moveId: string;
}): Promise<PackageResult> {
  const ctx = await currentMember();
  if (!ctx) return { ok: false, code: "forbidden" };
  const result = await undoPackageUse(ctx.userId, ctx.businessId, input);
  if (result.ok) revalidatePackages();
  return result;
}

export async function searchPackageCustomersAction(
  search: string,
): Promise<{ id: string; name: string; phone: string | null }[]> {
  const ctx = await currentMember();
  if (!ctx || typeof search !== "string") return [];
  return searchCustomersForPackage(
    ctx.userId,
    ctx.businessId,
    systemClock(),
    search,
  );
}
