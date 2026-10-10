// SSR-flödet (D-019: token_hash + type, inte PKCE-code). Mallarna i supabase/templates/
// bygger länken mot `{{ .SiteURL }}/auth/confirm?token_hash=…&type=…` (se
// docs/tasks/plans/WP-15.md). Utan egna mallar kommer Supabases standardlänk
// tillbaka med `?code=` (PKCE) i stället. Ingen `next`-parameter, så rutten kan inte
// användas för öppen redirect: målet väljs av cookien `auth_intent` (WP-67, D-054,
// `finishSignIn`) — kundkontot eller `/app` som förut.
import type { EmailOtpType } from "@supabase/supabase-js";
import { type NextRequest } from "next/server";

import { createSupabaseServerClient } from "@/lib/supabase/server";

import { failSignIn, finishSignIn } from "../finish";

export const dynamic = "force-dynamic";

const ALLOWED_TYPES: readonly EmailOtpType[] = ["magiclink", "signup", "email"];

function parseOtpType(raw: string | null): EmailOtpType | null {
  return ALLOWED_TYPES.find((t) => t === raw) ?? null;
}

export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl;
  const tokenHash = searchParams.get("token_hash");
  const type = parseOtpType(searchParams.get("type"));
  const code = searchParams.get("code");

  // Supabases standardmejl (utan egna mallar) kommer tillbaka med `?code=` (PKCE).
  if (code) {
    const supabase = await createSupabaseServerClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) await finishSignIn(supabase);
    await failSignIn("otp_expired");
  }

  if (tokenHash && type) {
    const supabase = await createSupabaseServerClient();
    const { error } = await supabase.auth.verifyOtp({
      type,
      token_hash: tokenHash,
    });
    if (!error) await finishSignIn(supabase);
  }

  await failSignIn("otp_expired");
}
