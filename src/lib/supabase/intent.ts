/**
 * WP-67 (D-054): vart en inloggning ska landa. Ingen `next`-parameter (D-019:
 * ingen öppen omdirigering) — i stället en kort cookie som respektive
 * inloggningssida sätter innan länken/Google-flödet startar. Bara två värden
 * (whitelist); allt okänt eller saknat räknas som `business` (som förut).
 */
export type AuthIntent = "customer" | "business";

export const AUTH_INTENT_COOKIE = "auth_intent";
/** Kunden kryssade i erbjudande-rutan på Skapa konto (aldrig förkryssad). */
export const ACCOUNT_MARKETING_COOKIE = "account_marketing";
/** 15 min: samma livslängd som övriga inloggningscookies (`pending_*`). */
export const AUTH_INTENT_MAX_AGE = 60 * 15;

export function parseAuthIntent(raw: string | undefined | null): AuthIntent {
  return raw === "customer" ? "customer" : "business";
}

export const authIntentCookieOptions = {
  path: "/",
  maxAge: AUTH_INTENT_MAX_AGE,
  sameSite: "lax",
  httpOnly: true,
  secure: process.env.NODE_ENV === "production",
} as const;
