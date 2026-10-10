"use server";

// WP-24 (F10): server actions för Caja e informes och "Markera betald"
// (kassan, agendans popover, Hoy). `userId`/`businessId` läses ur den
// verifierade sessionen här, aldrig från klienten; `now` är serverns klocka.
// Behörigheten kontrolleras i `src/server/payments/` och `src/server/reports/`.
import { revalidatePath } from "next/cache";

import { createSupabaseServerClient } from "@/lib/supabase/server";
import { getCurrentMember } from "@/server/onboarding/owner-business";
import {
  markBookingPaid,
  undoPayment,
  type MarkBookingPaidInput,
  type MarkBookingPaidResult,
  type UndoPaymentInput,
  type UndoPaymentResult,
} from "@/server/payments/mark-paid";
import {
  loadCaja,
  loadInformes,
  type CajaPeriod,
  type CajaResult,
  type InformesResult,
} from "@/server/reports/caja";
import { systemClock } from "@/server/scheduling/clock";
import { businessCan } from "@/server/plans/entitlements";

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

function revalidateCaja(): void {
  revalidatePath("/app/caja");
  revalidatePath("/app/agenda");
  revalidatePath("/app/hoy");
}

export async function markPaidAction(
  input: MarkBookingPaidInput,
): Promise<MarkBookingPaidResult> {
  const ctx = await currentMember();
  if (!ctx) return { ok: false, code: "forbidden" };
  const result = await markBookingPaid(
    ctx.userId,
    ctx.businessId,
    systemClock(),
    input,
  );
  if (result.ok) revalidateCaja();
  return result;
}

export async function undoPaymentAction(
  input: UndoPaymentInput,
): Promise<UndoPaymentResult> {
  const ctx = await currentMember();
  if (!ctx) return { ok: false, code: "forbidden" };
  const result = await undoPayment(
    ctx.userId,
    ctx.businessId,
    systemClock(),
    input,
  );
  if (result.ok) revalidateCaja();
  return result;
}

export async function loadCajaAction(period: CajaPeriod): Promise<CajaResult> {
  const ctx = await currentMember();
  if (!ctx) return { forbidden: true };
  return loadCaja(ctx.userId, ctx.businessId, systemClock(), period);
}

export async function loadInformesAction(): Promise<InformesResult> {
  const ctx = await currentMember();
  if (!ctx) return { forbidden: true };
  // WP-73 (D-048): rapporterna (full kassa & rapporter) ingår från Team;
  // Gratis/Starta har bara Caja-översikten.
  if (!(await businessCan(ctx.businessId, "full_reports"))) {
    return { forbidden: true };
  }
  return loadInformes(ctx.userId, ctx.businessId, systemClock());
}
