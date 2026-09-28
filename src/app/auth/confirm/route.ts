// SSR-flödet (D-019: token_hash + type, inte PKCE-code). Mallarna i supabase/templates/
// bygger länken mot `{{ .SiteURL }}/auth/confirm?token_hash=…&type=…` (se
// docs/tasks/plans/WP-15.md). Efter verifiering går vi alltid till `/app`: ingen
// `next`-parameter, så rutten kan inte användas för öppen redirect.
import type { EmailOtpType } from "@supabase/supabase-js";
import { redirect } from "next/navigation";
import { type NextRequest } from "next/server";

import { createSupabaseServerClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

const ALLOWED_TYPES: readonly EmailOtpType[] = ["magiclink", "signup", "email"];

function parseOtpType(raw: string | null): EmailOtpType | null {
  return ALLOWED_TYPES.find((t) => t === raw) ?? null;
}

export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl;
  const tokenHash = searchParams.get("token_hash");
  const type = parseOtpType(searchParams.get("type"));

  if (tokenHash && type) {
    const supabase = await createSupabaseServerClient();
    const { error } = await supabase.auth.verifyOtp({
      type,
      token_hash: tokenHash,
    });
    if (!error) redirect("/app");
  }

  redirect("/login?error=otp_expired");
}
