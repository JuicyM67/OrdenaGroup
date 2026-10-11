"use server";

// WP-67 (D-054): inloggning för KUNDKONTON. Samma magiska länk som företagens
// `/login` (svarar likadant oavsett om kontot finns), men sätter cookien
// `auth_intent=customer` så att `/auth/confirm` landar i kundkontot, och —
// bara om kunden själv kryssade i rutan — `account_marketing=1` som sparas
// när kontot skapas (aldrig förkryssat, regel 7). Egen rate limit per IP och
// e-post (samma nivåer som `/login`).
import { cookies } from "next/headers";
import { redirect } from "next/navigation";

import type { RequestMagicLinkResult } from "@/app/(auth)/login/actions";
import { cuentaHref } from "@/config/routes";
import {
  ACCOUNT_MARKETING_COOKIE,
  AUTH_INTENT_COOKIE,
  authIntentCookieOptions,
} from "@/lib/supabase/intent";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { getClientIp, hitRateLimit } from "@/server/db/rate-limit";

const EMAIL_MAX = 254;
const WINDOW_SECONDS = 10 * 60;
const IP_MAX = 5;
const EMAIL_PER_WINDOW = 3;

async function setIntent(marketing: boolean): Promise<void> {
  const store = await cookies();
  store.set(AUTH_INTENT_COOKIE, "customer", authIntentCookieOptions);
  if (marketing) {
    store.set(ACCOUNT_MARKETING_COOKIE, "1", authIntentCookieOptions);
  } else {
    store.delete(ACCOUNT_MARKETING_COOKIE);
  }
}

/** Basadressen för återkomsten: bara `NEXT_PUBLIC_APP_URL` (aldrig
 * förfrågans Host-huvud). Saknas den används Supabase-projektets Site URL. */
function appOrigin(): string | undefined {
  return process.env.NEXT_PUBLIC_APP_URL || undefined;
}

export async function requestAccountMagicLink(input: {
  email: string;
  marketing: boolean;
}): Promise<RequestMagicLinkResult> {
  const email = typeof input.email === "string" ? input.email.trim() : "";
  if (email === "" || email.length > EMAIL_MAX || !email.includes("@")) {
    return { ok: false, code: "invalid_email" };
  }
  const ip = await getClientIp();
  const ipAllowed = await hitRateLimit({
    scope: "account-login:ip",
    subject: ip,
    windowSeconds: WINDOW_SECONDS,
    max: IP_MAX,
  });
  if (!ipAllowed) return { ok: false, code: "over_email_send_rate_limit" };
  const emailAllowed = await hitRateLimit({
    scope: "account-login:email",
    subject: email.toLowerCase(),
    windowSeconds: WINDOW_SECONDS,
    max: EMAIL_PER_WINDOW,
  });
  if (!emailAllowed) return { ok: false, code: "over_email_send_rate_limit" };

  await setIntent(input.marketing === true);
  try {
    const supabase = await createSupabaseServerClient();
    const origin = appOrigin();
    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: origin ? { emailRedirectTo: `${origin}/auth/confirm` } : {},
    });
    if (error) {
      return {
        ok: false,
        code:
          error.code === "over_email_send_rate_limit"
            ? "over_email_send_rate_limit"
            : error.code === "email_address_invalid"
              ? "invalid_email"
              : "network",
      };
    }
    return { ok: true };
  } catch {
    return { ok: false, code: "network" };
  }
}

/** Google (PKCE): `@supabase/ssr` sparar kodverifieraren i en cookie och vi
 * skickar webbläsaren till Google; tillbaka via `/auth/callback`. Bara när
 * `NEXT_PUBLIC_GOOGLE_AUTH=1` (knappen visas annars inte, D-035). */
export async function signInWithGoogle(formData: FormData): Promise<void> {
  if (process.env.NEXT_PUBLIC_GOOGLE_AUTH !== "1") {
    redirect(cuentaHref("cuentaIngresar"));
  }
  await setIntent(formData.get("marketing") === "1");
  const origin = appOrigin();
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: "google",
    options: {
      ...(origin ? { redirectTo: `${origin}/auth/callback` } : {}),
      queryParams: { prompt: "select_account" },
    },
  });
  if (error || !data.url) {
    redirect(`${cuentaHref("cuentaIngresar")}?error=oauth_failed`);
  }
  redirect(data.url);
}
