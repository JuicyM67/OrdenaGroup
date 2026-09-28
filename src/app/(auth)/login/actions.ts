"use server";

// Server action: magisk länk via e-post (F1). Svarar likadant oavsett om kontot redan
// finns (`signInWithOtp` skapar kontot i farten om det inte finns — `enable_signup`
// är på, se docs/tech/SUPABASE_CONFIG.md), så UI:t kan aldrig läcka om ett konto finns.
import { createSupabaseServerClient } from "@/lib/supabase/server";

export type RequestMagicLinkResult =
  { ok: true } | { ok: false; code: RequestMagicLinkErrorCode };

/** Delmängd av `acceso.errores` (src/i18n/es-CL.ts) som den här action:en kan ge. */
export type RequestMagicLinkErrorCode =
  "invalid_email" | "over_email_send_rate_limit" | "captcha_failed" | "network";

const EMAIL_MAX = 254;

function mapAuthErrorCode(code: string | undefined): RequestMagicLinkErrorCode {
  switch (code) {
    case "validation_failed":
    case "email_address_invalid":
    case "email_provider_disabled":
      return "invalid_email";
    case "over_email_send_rate_limit":
    case "over_request_rate_limit":
      return "over_email_send_rate_limit";
    case "captcha_failed":
      return "captcha_failed";
    default:
      return "network";
  }
}

export async function requestMagicLink(
  rawEmail: string,
): Promise<RequestMagicLinkResult> {
  const email = rawEmail.trim();
  if (email === "" || email.length > EMAIL_MAX || !email.includes("@")) {
    return { ok: false, code: "invalid_email" };
  }

  try {
    const supabase = await createSupabaseServerClient();
    // Ingen `emailRedirectTo`: länken i mejlet byggs av mallen själv
    // (supabase/templates/magic_link.html, D-019) mot `{{ .SiteURL }}/auth/confirm`, som
    // efter verifiering går vidare till /app (default i src/app/auth/confirm/route.ts).
    const { error } = await supabase.auth.signInWithOtp({ email });
    if (error) return { ok: false, code: mapAuthErrorCode(error.code) };
    return { ok: true };
  } catch {
    return { ok: false, code: "network" };
  }
}
