// WP-67 (D-054): OAuth-retur (Google) med PKCE. Supabase skickar tillbaka hit
// med `?code=` efter `signInWithOAuth` (`src/app/(consumer)/cuenta/ingresar/
// actions.ts`); kodverifieraren ligger i en cookie som `@supabase/ssr` satte i
// samma webbläsare. Ingen `next`-parameter (D-019): målet väljs av cookien
// `auth_intent` i `finishSignIn`. Google avbrutet (`?error=…`) eller fel kod →
// tillbaka till inloggningen med ett generellt fel.
import { type NextRequest } from "next/server";

import { createSupabaseServerClient } from "@/lib/supabase/server";

import { failSignIn, finishSignIn } from "../finish";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const code = request.nextUrl.searchParams.get("code");
  if (code && code.length <= 512) {
    const supabase = await createSupabaseServerClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) await finishSignIn(supabase);
  }
  await failSignIn("oauth_failed");
}
