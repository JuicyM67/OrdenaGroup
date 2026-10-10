// WP-66 (D-046): POST /api/import/extract — kör AI-importen och svarar med
// förhandsgranskningen. Route handler (inte server action) för att kunna
// avbrytas: klientens AbortController → `request.signal` → SDK-anropet.
// `maxDuration`: anropet tar normalt 20–60 s (web fetch + extraktion).
import { NextResponse } from "next/server";

import type { ImportExtractResponse } from "@/lib/validation/import";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { extractForImport } from "@/server/import/extract";
import { isImportEnabled } from "@/server/import/runs";
import {
  getCurrentMember,
  isOnboardingDraft,
} from "@/server/onboarding/owner-business";

export const maxDuration = 120;
export const dynamic = "force-dynamic";

function json(body: ImportExtractResponse, status = 200) {
  return NextResponse.json(body, { status });
}

export async function POST(request: Request) {
  // D-035: utan nyckel finns funktionen inte.
  if (!isImportEnabled()) {
    return json({ ok: false, code: "import.unavailable" }, 404);
  }
  // Försvar på djupet mot CSRF (cookien är redan SameSite=Lax).
  const origin = request.headers.get("origin");
  const host = request.headers.get("host");
  if (!origin || !host || new URL(origin).host !== host) {
    return json({ ok: false, code: "unauthorized" }, 403);
  }

  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return json({ ok: false, code: "unauthorized" }, 401);

  // Onboarding (inget företag, eller ett utkast från en admin-inbjudan):
  // räknas per användare. Annars bara ägaren av företaget.
  const current = await getCurrentMember(user.id);
  let businessId: string | null = null;
  if (current && !isOnboardingDraft(current.business)) {
    if (current.member.role !== "owner") {
      return json({ ok: false, code: "forbidden" }, 403);
    }
    businessId = current.business.id;
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return json({ ok: false, code: "invalid_input" }, 400);
  }

  const result = await extractForImport(
    user.id,
    businessId,
    body,
    request.signal,
  );
  return json(result);
}
