import "server-only";

// WP-67 (D-054): gemensamt slut på inloggningen för `/auth/confirm` (magisk
// länk) och `/auth/callback` (Google, PKCE). Målet väljs av cookien
// `auth_intent` (whitelist, ingen `next`-parameter, D-019): `customer` →
// kundkontot (`/cuenta`, SE `/konto`) efter att kontot skapats och kopplats,
// annars `/app` precis som före WP-67.
import type { SupabaseClient } from "@supabase/supabase-js";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";

import { cuentaHref } from "@/config/routes";
import {
  ACCOUNT_MARKETING_COOKIE,
  AUTH_INTENT_COOKIE,
  parseAuthIntent,
  type AuthIntent,
} from "@/lib/supabase/intent";
import { ensureAccountAndLink } from "@/server/accounts/account";

async function takeIntent(): Promise<{
  intent: AuthIntent;
  marketing: boolean;
}> {
  const store = await cookies();
  const intent = parseAuthIntent(store.get(AUTH_INTENT_COOKIE)?.value);
  const marketing = store.get(ACCOUNT_MARKETING_COOKIE)?.value === "1";
  store.delete(AUTH_INTENT_COOKIE);
  store.delete(ACCOUNT_MARKETING_COOKIE);
  return { intent, marketing };
}

function metadataName(
  meta: Record<string, unknown> | undefined,
): string | null {
  const v = meta?.["full_name"] ?? meta?.["name"];
  return typeof v === "string" && v.trim() !== ""
    ? v.trim().slice(0, 80)
    : null;
}

/** Anropas efter en lyckad verifiering/kodväxling med SAMMA klient (den har
 * sessionen i minnet). Kastar alltid (redirect). */
export async function finishSignIn(supabase: SupabaseClient): Promise<never> {
  const { intent, marketing } = await takeIntent();
  if (intent === "customer") {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (user) {
      try {
        await ensureAccountAndLink(user.id, {
          displayName: metadataName(user.user_metadata),
          marketing,
        });
      } catch {
        // Kontot skapas igen vid nästa besök (`/cuenta` kräver det inte för
        // att visas); ingen persondata loggas.
      }
      redirect(cuentaHref("cuenta"));
    }
  }
  redirect("/app");
}

/** Fel vid verifieringen: tillbaka till rätt inloggningssida. */
export async function failSignIn(code: string): Promise<never> {
  const { intent } = await takeIntent();
  const base = intent === "customer" ? cuentaHref("cuentaIngresar") : "/login";
  redirect(`${base}?error=${encodeURIComponent(code)}`);
}
