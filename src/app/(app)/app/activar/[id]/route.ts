// WP-98 (D-082): efter en accepterad admin-inbjudan blir det nya företaget det
// aktiva. Cookien kan inte sättas i `/app/page.tsx` (Server Component) och inte
// i onboardingens server action — en cookie som sätts där renderar om
// onboardingsidan, som då ser ett färdigt företag och skickar till Inicio mitt
// i flödet. Bara kontots EGET utkast (ägare, onboarding inte klar) godtas, så en
// främmande länk kan inte byta aktivt företag åt någon.
import { NextResponse, type NextRequest } from "next/server";

import { createSupabaseServerClient } from "@/lib/supabase/server";
import {
  isMyDraftBusiness,
  setActiveBusinessCookie,
} from "@/server/onboarding/owner-business";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.redirect(new URL("/login", request.url));
  if (await isMyDraftBusiness(user.id, id)) {
    await setActiveBusinessCookie(id);
    return NextResponse.redirect(new URL("/app/onboarding", request.url));
  }
  return NextResponse.redirect(new URL("/app", request.url));
}
