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
    // Med våra mallar (lokalt) byggs länken mot `{{ .SiteURL }}/auth/confirm?token_hash=…`.
    // Utan egna mallar (staging utan egen SMTP) går Supabases standardlänk via
    // `/auth/v1/verify` och tillbaka hit med `?code=`; `emailRedirectTo` pekar den till
    // `/auth/confirm`, som hanterar båda (src/app/auth/confirm/route.ts).
    const appUrl = process.env.NEXT_PUBLIC_APP_URL;
    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: appUrl ? { emailRedirectTo: `${appUrl}/auth/confirm` } : {},
    });
    if (error) return { ok: false, code: mapAuthErrorCode(error.code) };
    return { ok: true };
  } catch {
    return { ok: false, code: "network" };
  }
}
