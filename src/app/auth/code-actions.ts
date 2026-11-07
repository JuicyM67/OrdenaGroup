"use server";

// WP-83 (D-068, BookingBuddy WP-96): inloggning med koden från mejlet (samma
// mejl som den magiska länken, `{{ .Token }}` i supabase/templates/es-CL/). Alternativ till länken för den som
// läser mejlet på en annan enhet. Målet väljs av samma `auth_intent`-cookie
// som länken (`signInTarget`, D-054), och klienten navigerar dit — ingen
// redirect i action:en, så att svaret går att läsa i formuläret.
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { getClientIp, hitRateLimit } from "@/server/db/rate-limit";

import { signInTarget } from "./finish";

export type VerifyEmailCodeResult =
  { ok: true; to: string } | { ok: false; code: VerifyEmailCodeErrorCode };

/** Delmängd av `acceso.errores` (src/i18n/es-CL.panel.ts). */
export type VerifyEmailCodeErrorCode =
  | "invalid_email"
  | "invalid_otp"
  | "over_email_send_rate_limit"
  | "too_many_attempts"
  | "network";

const EMAIL_MAX = 254;
/** Supabase skickar 6 siffror som standard (`otp_length`, upp till 10). */
const CODE_RE = /^\d{6,10}$/;

/** Egen gräns utöver Supabase Auths: en kod på 6 siffror ska inte gå att
 * gissa. Per e-post (snävt) och per IP. */
const WINDOW_SECONDS = 10 * 60;
const EMAIL_MAX_TRIES = 6;
const IP_MAX_TRIES = 20;

export async function verifyEmailCode(
  rawEmail: string,
  rawCode: string,
): Promise<VerifyEmailCodeResult> {
  const email = typeof rawEmail === "string" ? rawEmail.trim() : "";
  if (email === "" || email.length > EMAIL_MAX || !email.includes("@")) {
    return { ok: false, code: "invalid_email" };
  }
  const token = typeof rawCode === "string" ? rawCode.replace(/\s/g, "") : "";
  if (!CODE_RE.test(token)) return { ok: false, code: "invalid_otp" };

  const ip = await getClientIp();
  const ipAllowed = await hitRateLimit({
    scope: "login-code:ip",
    subject: ip,
    windowSeconds: WINDOW_SECONDS,
    max: IP_MAX_TRIES,
  });
  if (!ipAllowed) return { ok: false, code: "too_many_attempts" };
  const emailAllowed = await hitRateLimit({
    scope: "login-code:email",
    subject: email.toLowerCase(),
    windowSeconds: WINDOW_SECONDS,
    max: EMAIL_MAX_TRIES,
  });
  if (!emailAllowed) return { ok: false, code: "too_many_attempts" };

  try {
    const supabase = await createSupabaseServerClient();
    // `email` täcker både inloggning (magiclink) och nytt konto (signup).
    const { error } = await supabase.auth.verifyOtp({
      email,
      token,
      type: "email",
    });
    if (error) {
      if (error.status === 429) {
        return { ok: false, code: "too_many_attempts" };
      }
      // Fel eller utgången kod ger samma svar från Supabase (403).
      if (error.status && error.status < 500) {
        return { ok: false, code: "invalid_otp" };
      }
      console.error("login-kod: verifyOtp misslyckades", {
        code: error.code,
        status: error.status,
      });
      return { ok: false, code: "network" };
    }
    return { ok: true, to: await signInTarget(supabase) };
  } catch (e) {
    console.error("login-kod: undantag vid verifyOtp", {
      name: e instanceof Error ? e.name : "okänt",
    });
    return { ok: false, code: "network" };
  }
}
