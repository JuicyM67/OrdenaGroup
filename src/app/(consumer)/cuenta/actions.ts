"use server";

// WP-67 (D-054): kundkontots server actions. `userId` kommer alltid från den
// verifierade sessionen (`auth.getUser()`), aldrig från klienten; allt annat
// (boknings-/företags-id) auktoriseras i databasen via kontots kopplingar.
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { cuentaHref, href } from "@/config/routes";
import { cuenta } from "@/i18n";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import {
  cancelForAccount,
  deleteMyAccount,
  exportMyAccount,
  isUuid,
  setFavorite,
  setMarketingConsent,
  type AccountCancelResult,
} from "@/server/accounts/account";
import { systemClock } from "@/server/scheduling/clock";

async function sessionUserId(): Promise<string | null> {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return user?.id ?? null;
}

export async function cancelAccountBooking(
  bookingId: string,
): Promise<AccountCancelResult> {
  const userId = await sessionUserId();
  if (!userId || !isUuid(bookingId)) return { ok: false, code: "not_found" };
  // Ingen revalidatePath här: kortet visar svaret på plats (raden skulle
  // annars flyttas/försvinna innan kunden hinner läsa det). Sidorna är
  // dynamiska, så nästa besök visar det nya läget.
  return cancelForAccount(userId, bookingId, systemClock());
}

/** Hjärtat på `/[slug]` och Ta bort i Favoriter (formulär, fungerar utan JS). */
export async function toggleFavorite(formData: FormData): Promise<void> {
  const businessId = formData.get("businessId");
  const on = formData.get("on") === "1";
  const back = formData.get("back");
  const userId = await sessionUserId();
  if (!userId) redirect(cuentaHref("cuentaIngresar"));
  if (isUuid(businessId)) await setFavorite(userId, businessId, on);
  // Bara egna, relativa sökvägar (ingen öppen omdirigering).
  const target =
    typeof back === "string" && /^\/(?!\/)[a-z0-9/-]{0,120}$/.test(back)
      ? back
      : cuentaHref("cuentaFavoritos");
  revalidatePath(target);
  redirect(target);
}

export async function saveMarketingConsent(
  granted: boolean,
): Promise<{ ok: boolean }> {
  const userId = await sessionUserId();
  if (!userId) return { ok: false };
  try {
    await setMarketingConsent(userId, granted === true);
    return { ok: true };
  } catch {
    return { ok: false };
  }
}

export async function exportAccountData(): Promise<string | null> {
  const userId = await sessionUserId();
  if (!userId) return null;
  const data = await exportMyAccount(userId);
  return JSON.stringify(data, null, 2);
}

export async function deleteAccount(
  confirmWord: string,
): Promise<{ ok: false; code: "word" | "error" }> {
  const userId = await sessionUserId();
  if (!userId) return { ok: false, code: "error" };
  if (
    typeof confirmWord !== "string" ||
    confirmWord.trim() !== cuenta.privacidad.palabra
  ) {
    return { ok: false, code: "word" };
  }
  let authDeleted: boolean;
  try {
    authDeleted = await deleteMyAccount(userId);
  } catch {
    // Ingen persondata i loggar; kunden får ett vänligt fel (PrivacyPanel).
    return { ok: false, code: "error" };
  }
  if (authDeleted) {
    // Användaren och dess sessioner finns inte längre; rensa cookien lokalt.
    const supabase = await createSupabaseServerClient();
    await supabase.auth.signOut({ scope: "local" }).catch(() => undefined);
  }
  redirect(
    `${cuentaHref("cuentaIngresar")}?cuenta=${authDeleted ? "eliminada" : "eliminada-negocio"}`,
  );
}

export async function logoutAccount(): Promise<void> {
  const supabase = await createSupabaseServerClient();
  await supabase.auth.signOut();
  redirect(href("inicio"));
}
