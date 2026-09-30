"use server";

// Server action: magisk länk via e-post (F1). Svarar likadant oavsett om kontot redan
// finns (`signInWithOtp` skapar kontot i farten om det inte finns — `enable_signup`
// är på, se docs/tech/SUPABASE_CONFIG.md), så UI:t kan aldrig läcka om ett konto finns.
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { getClientIp, hitRateLimit } from "@/server/db/rate-limit";

export type RequestMagicLinkResult =
  { ok: true } | { ok: false; code: RequestMagicLinkErrorCode };

/** Delmängd av `acceso.errores` (src/i18n/es-CL.ts) som den här action:en kan ge. */
export type RequestMagicLinkErrorCode =
  "invalid_email" | "over_email_send_rate_limit" | "captcha_failed" | "network";

const EMAIL_MAX = 254;

/** Pilotblockerare (säkerhetsgranskning WP-27): egen rate limit utöver
 * Supabase Auths inbyggda (`over_email_send_rate_limit`, en global gräns per
 * projekt) — en gräns per IP och en snävare per e-post, så att en enda
 * adress/avsändare inte kan spamma inloggningslänkar. Samma felkod
 * (`over_email_send_rate_limit`) återanvänds: texten ("Espera un minuto…")
 * stämmer lika bra här. */
const LOGIN_WINDOW_SECONDS = 10 * 60;
const LOGIN_IP_MAX = 5;
const LOGIN_EMAIL_MAX = 3;

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

  const ip = await getClientIp();
  const ipAllowed = await hitRateLimit({
    scope: "login:ip",
    subject: ip,
    windowSeconds: LOGIN_WINDOW_SECONDS,
    max: LOGIN_IP_MAX,
  });
  if (!ipAllowed) return { ok: false, code: "over_email_send_rate_limit" };

  // `toLowerCase()`: samma adress med annan skiftläge ska dela räknare.
  const emailAllowed = await hitRateLimit({
    scope: "login:email",
    subject: email.toLowerCase(),
    windowSeconds: LOGIN_WINDOW_SECONDS,
    max: LOGIN_EMAIL_MAX,
  });
  if (!emailAllowed) return { ok: false, code: "over_email_send_rate_limit" };

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
