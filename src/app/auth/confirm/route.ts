// SSR-flödet (D-019: token_hash + type, inte PKCE-code). `{{ .ConfirmationURL }}` pekar i
// Supabase på det plattformshostade `/auth/v1/verify` (implicit grant, verifierat lokalt
// under WP-15) — inte på den här rutten. Mallarna (supabase/templates/*.html) bygger därför
// länken själva mot `{{ .SiteURL }}/auth/confirm?token_hash={{ .TokenHash }}&type={{ .Type }}`,
// samma mönster som Supabases officiella Next.js-guide för @supabase/ssr (se
// docs/tasks/plans/WP-15.md för avvikelsen mot email-templates.md, som inte gäller den synliga
// spansk texten). `next` är alltid `/app` (ingen `redirect_to` skickas längre).
import type { EmailOtpType } from "@supabase/supabase-js";
import { redirect } from "next/navigation";
import { type NextRequest } from "next/server";

import { createSupabaseServerClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

function safeNext(raw: string | null): string {
  if (!raw || !raw.startsWith("/") || raw.startsWith("//")) return "/app";
  return raw;
}

export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl;
  const tokenHash = searchParams.get("token_hash");
  const type = searchParams.get("type") as EmailOtpType | null;
  const next = safeNext(searchParams.get("next"));

  if (tokenHash && type) {
    const supabase = await createSupabaseServerClient();
    const { error } = await supabase.auth.verifyOtp({
      type,
      token_hash: tokenHash,
    });
    if (!error) redirect(next);
  }

  redirect("/login?error=otp_expired");
}
