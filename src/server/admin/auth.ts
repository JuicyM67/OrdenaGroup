import "server-only";

// Åtkomstkontroll för /admin (F19/WP-36, D-038): platform_admins är
// FÖRETAGSOBERONDE (inte memberships.role = 'admin', se DATA_MODEL.md och
// migrationskommentaren i 20260930180000_platform_admin.sql). Bara servern
// läser tabellen (service_role, ingen RLS-policy alls). Kräver dessutom
// tvåstegsverifiering (Supabase MFA TOTP, aal2) för allt utom
// inskrivnings-/verifieringssidan (/admin/mfa), som bara kräver att
// personen FINNS i platform_admins (annars skulle ingen någonsin kunna
// skriva in sig).
import { notFound, redirect } from "next/navigation";

import { createSupabaseServerClient } from "@/lib/supabase/server";
import { withServiceTx } from "@/server/db/tx";

export type AdminSession = { readonly userId: string; readonly email: string };

async function currentUser(): Promise<{ id: string; email: string } | null> {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;
  return { id: user.id, email: user.email ?? "" };
}

async function isPlatformAdmin(userId: string): Promise<boolean> {
  return withServiceTx(async (q) => {
    const r = await q.query(
      `select 1 from private.platform_admins where user_id = $1`,
      [userId],
    );
    return r.rows.length > 0;
  });
}

export async function currentAal(): Promise<"aal1" | "aal2" | null> {
  const supabase = await createSupabaseServerClient();
  const { data, error } =
    await supabase.auth.mfa.getAuthenticatorAssuranceLevel();
  if (error || !data) return null;
  return data.currentLevel === "aal2" ? "aal2" : "aal1";
}

/**
 * Bara för `/admin/mfa` (inskrivning/verifiering): kräver att personen är
 * inloggad OCH redan finns i `platform_admins` (annars 404 — röj inte att
 * ytan finns, se planen), men INTE `aal2` än (det är hela poängen med
 * sidan).
 */
export async function requireAdminAnyAal(): Promise<AdminSession> {
  const user = await currentUser();
  if (!user || !(await isPlatformAdmin(user.id))) notFound();
  return { userId: user.id, email: user.email };
}

/**
 * För varje skyddad `/admin`-sida (utom `/admin/mfa`): 404 om personen inte
 * är en plattformsadmin, redirect till `/admin/mfa` om `aal2` saknas.
 */
export async function requireAdminPage(): Promise<AdminSession> {
  const user = await currentUser();
  if (!user || !(await isPlatformAdmin(user.id))) notFound();
  const aal = await currentAal();
  if (aal !== "aal2") redirect("/admin/mfa");
  return { userId: user.id, email: user.email };
}

/**
 * För server actions (mutationer): samma kontroll som `requireAdminPage`,
 * men actions kan inte anropa `notFound()`/`redirect()` (de hör till
 * rendering) — kastar i stället, så anroparen kan visa ett fel i UI:t.
 */
export async function requireAdminForAction(): Promise<AdminSession> {
  const user = await currentUser();
  if (!user || !(await isPlatformAdmin(user.id))) {
    throw new Error("No autorizado");
  }
  const aal = await currentAal();
  if (aal !== "aal2") {
    throw new Error("Falta verificación en dos pasos");
  }
  return { userId: user.id, email: user.email };
}
