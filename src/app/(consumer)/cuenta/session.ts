import "server-only";

// WP-67 (D-054): gemensam inloggningskontroll för kundkontots sidor. `proxy.ts`
// skickar redan utloggade till inloggningen; här skapas kontot om personen är
// inloggad men saknar det (t.ex. en företagsägare som öppnar `/cuenta`, eller
// om skapandet i `/auth/confirm` misslyckades).
import { cookies } from "next/headers";
import { redirect } from "next/navigation";

import { cuentaHref } from "@/config/routes";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import {
  ensureAccountAndLink,
  loadAccount,
  type AccountSummary,
} from "@/server/accounts/account";

export type AccountSession = AccountSummary & {
  userId: string;
  email: string;
};

export async function requireAccount(): Promise<AccountSession> {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect(cuentaHref("cuentaIngresar"));
  let account = await loadAccount(user.id);
  if (!account) {
    await ensureAccountAndLink(user.id, {});
    account = (await loadAccount(user.id)) ?? {
      displayName: null,
      marketingConsent: false,
    };
  }
  return { ...account, userId: user.id, email: user.email ?? "" };
}

/** För publika sidor (`/[slug]`): den inloggade kundens konto, annars `null`.
 * Frågar Supabase Auth bara när en sessionscookie finns (ingen extra
 * nätverksrunda för de flesta besökare, tidsbudgeten D-039), och skapar
 * aldrig ett konto. */
export async function optionalAccount(): Promise<AccountSession | null> {
  const store = await cookies();
  const hasSession = store
    .getAll()
    .some((c) => c.name.startsWith("sb-") && c.name.includes("auth-token"));
  if (!hasSession) return null;
  try {
    const supabase = await createSupabaseServerClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return null;
    const account = await loadAccount(user.id);
    if (!account) return null;
    return { ...account, userId: user.id, email: user.email ?? "" };
  } catch {
    return null;
  }
}
