// /app: enda jobbet är att skicka ägaren vidare (WP-15). Med företag → /app/inicio (D-020,
// fixtures tills WP-21). Utan företag → /app/onboarding. Inloggning krävs redan av
// src/app/(app)/layout.tsx.
//
// WP-46: om personen nyss bad om en magisk länk från /app/invitacion/[token]
// (utloggad, en inbjudan till ett BEFINTLIGT företags team), skickas hen hit
// av `/auth/confirm` som vanligt — den rutten stödjer medvetet ingen `?next=`
// (öppen omdirigering). En cookie (`pending_invitation`, satt av
// invitationssidans egen server action, bara ett redan formatvaliderat
// token) tar över härifrån i stället.
//
// F19/WP-36: samma mönster för en ANNAN inbjudan — en cookie satt av
// `/app/bienvenida/[token]/actions.ts` (innan inloggning) talar om att den
// precis inloggade personen ska acceptera en admin-inbjudan att skapa ett
// NYTT företag. `/auth/confirm` skickar i båda fallen alltid hit, aldrig
// till en fri `next`-parameter, så det här är enda stället någon av de två
// kedjorna kan fortsätta från.
//
// WP-56: tredje cookien, samma mönster — `pending_solicitud` (satt av
// `src/proxy.ts` när en utloggad öppnar /app/solicitudes/[id] via
// sms/mejl-länken) skickar tillbaka till just den förfrågan i stället för
// /app/inicio.
import { cookies } from "next/headers";
import { redirect } from "next/navigation";

import { appHref } from "@/config/routes";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import {
  getOwnerBusiness,
  isOnboardingDraft,
} from "@/server/onboarding/owner-business";
import {
  acceptInvitation,
  INVITE_COOKIE_NAME,
} from "@/server/onboarding/invitation";

export const dynamic = "force-dynamic";

const TOKEN_RE = /^[A-Za-z0-9_-]{20,64}$/;
const SOLICITUD_ID_RE = /^[0-9a-f-]{36}$/i;

export default async function AppIndexPage() {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const store = await cookies();

  const pending = store.get("pending_invitation")?.value;
  if (pending && TOKEN_RE.test(pending)) {
    // `cookies().delete()` kastar i en ren Server Component (bara Server
    // Actions/Route Handlers får skriva cookies) — samma tolerans som
    // `@/lib/supabase/server`s `setAll`. Cookien går ut av sig själv (15 min)
    // om den här raden inte får skriva; ingen loop (accept-sidan sätter den
    // aldrig på nytt av sig själv).
    try {
      store.delete("pending_invitation");
    } catch {
      // se kommentaren ovan
    }
    redirect(appHref("appInvitacion", pending));
  }

  const inviteToken = store.get(INVITE_COOKIE_NAME)?.value;
  if (inviteToken) {
    const result = await acceptInvitation(user.id, inviteToken);
    // Server Component: kan inte radera cookien (bara en Server Action eller
    // Route Handler kan det). Ligger kvar tills den går ut av sig själv (20
    // min) — ett omförsök inom fönstret ger bara "used_or_expired"
    // (idempotent) och fortsätter till det vanliga flödet nedan.
    if (result.ok) redirect(appHref("appOnboarding"));
  }

  const pendingSolicitud = store.get("pending_solicitud")?.value;
  if (pendingSolicitud && SOLICITUD_ID_RE.test(pendingSolicitud)) {
    try {
      store.delete("pending_solicitud");
    } catch {
      // se kommentaren vid `pending_invitation` ovan
    }
    redirect(appHref("appSolicitud", pendingSolicitud));
  }

  const business = await getOwnerBusiness(user.id);
  if (!business || isOnboardingDraft(business))
    redirect(appHref("appOnboarding"));
  redirect(appHref("appInicio"));
}
