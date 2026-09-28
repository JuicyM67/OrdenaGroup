import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

import { readSupabaseAuthEnv } from "./env";

/**
 * Ingen `import "server-only"` här (till skillnad från `server.ts`): filen
 * körs i `src/proxy.ts`, som Next bygger för Edge-körtiden, inte Node —
 * samma resonemang som `src/app/design-lab/gate.ts`.
 *
 * Förnyar Supabase-sessionen i `src/proxy.ts` (D-019, WP-15): läser
 * request-cookien, byter en snart utgången access token mot en ny via
 * `getUser()` (validerar alltid mot Supabase Auth, till skillnad från
 * `getSession()` som bara läser den lokala cookien) och skriver tillbaka
 * de eventuellt uppdaterade cookierna på svaret. Samma mönster som
 * `@supabase/ssr`s Next.js-guide.
 */
export async function refreshSupabaseSession(
  request: NextRequest,
): Promise<{ response: NextResponse; userId: string | null }> {
  let response = NextResponse.next({ request });
  const { url, anonKey } = readSupabaseAuthEnv();

  const supabase = createServerClient(url, anonKey, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet) {
        for (const { name, value } of cookiesToSet) {
          request.cookies.set(name, value);
        }
        response = NextResponse.next({ request });
        for (const { name, value, options } of cookiesToSet) {
          response.cookies.set(name, value, options);
        }
      },
    },
  });

  const {
    data: { user },
  } = await supabase.auth.getUser();

  return { response, userId: user?.id ?? null };
}
