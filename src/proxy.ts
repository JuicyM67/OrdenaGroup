// Stänger /design-lab/* helt vid källan i produktion (VERCEL_ENV=production), innan App
// Router hinner rendera något. layout.tsx anropar notFound() också (försvar i djupet), men
// det räcker inte ensamt: Next kan fortfarande strömma en delvis exekverad RSC/flight-payload
// för sidan i samma svar som 404-statusen (granskningsfynd — "Corte clásico" syntes i
// svarskroppen trots status 404). proxy.ts (Next 16:s efterträdare till middleware.ts, se
// https://nextjs.org/docs/messages/middleware-to-proxy) kör innan routing/rendering och kan
// därför svara med en tom 404 utan att någon sida någonsin renderas.
//
// WP-15: samma fil förnyar nu även Supabase-sessionen (`refreshSupabaseSession`) och
// stänger `/app/*` för utloggade (redirect till `/login`) — matcher utökad nedan, medvetet
// snävt (bara de rutter som behöver det), inte alla rutter (D-019/§"Delade mappar").
// `/login` och `/auth/*` matchas också, så att en redan inloggad ägare som öppnar `/login`
// kan skickas vidare av sidan själv (page.tsx), med färska cookies.
//
// F19/WP-36: `/app/bienvenida/[token]` är PUBLIK (utanför `(app)`-layoutens
// inloggningskrav, se src/app/app/bienvenida/[token]/page.tsx) — en person
// utan session ska kunna öppna den och be om sin inloggningslänk, så den
// undantas uttryckligen från "/app/*"-redirecten nedan. `/admin/*` matchas
// bara för att förnya sessionscookien (samma som `/app`); ingen redirect
// här — varje admin-sida gör sin egen `requireAdminPage()`-kontroll
// (404/redirect till /admin/mfa), som inte får avslöja att ytan finns för
// icke-admins (ett proxy-redirect till /login skulle göra det).
//
// WP-58: SE:s installation har svenska permalänkar (`/app/inbjudan`,
// `/app/valkommen`, `/app/forfragningar`, se `src/config/routes.ts`) som
// `next.config.ts`s `rewrites`/`redirects` skriver om/omdirigerar till de
// här spanska filsystemsrutterna — men proxy.ts körs FÖRE det steget, så
// pathname kan vara i endera formen (den här installationens marknad, eller
// en delad/gammal länk i den andra). Undantagen nedan matchar därför BÅDA
// formerna via `appRoutePrefixes()`, oavsett vilken marknad som är igång.
import { NextResponse, type NextRequest } from "next/server";

import { isDesignLabEnabled } from "@/app/design-lab/gate";
import { appRoutePrefixes } from "@/config/routes";
import { refreshSupabaseSession } from "@/lib/supabase/proxy";

const [INVITACION_CL, INVITACION_SE] = appRoutePrefixes("appInvitacion");
const [BIENVENIDA_CL, BIENVENIDA_SE] = appRoutePrefixes("appBienvenida");
const [SOLICITUD_CL, SOLICITUD_SE] = appRoutePrefixes("appSolicitud");
const SOLICITUD_RE = new RegExp(
  `^(?:${SOLICITUD_CL}|${SOLICITUD_SE})([0-9a-f-]{36})$`,
  "i",
);

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  if (pathname.startsWith("/design-lab")) {
    if (
      !isDesignLabEnabled({
        VERCEL_ENV: process.env.VERCEL_ENV,
        DESIGN_LAB: process.env.DESIGN_LAB,
      })
    ) {
      return new NextResponse(null, { status: 404 });
    }
    return NextResponse.next();
  }

  const { response, userId } = await refreshSupabaseSession(request);

  // WP-46: /app/invitacion/[token] måste kunna visas för en UTLOGGAD person
  // (den inbjudna, innan hen begärt sin magiska länk) — sidan hanterar själv
  // inloggat/utloggat läge (`src/app/(app-public)/app/invitacion/[token]/page.tsx`),
  // ingen sessionsdata läcker härifrån (bara en generell status/negocio-namn,
  // läst med service role, inte bunden till den besökandes identitet).
  const isInvitationPage =
    pathname.startsWith(INVITACION_CL) || pathname.startsWith(INVITACION_SE);

  // F19/WP-36: samma undantag för /app/bienvenida/[token] (en ANNAN
  // inbjudan, att skapa ett nytt företag — se src/app/app/bienvenida/
  // [token]/page.tsx).
  const isPublicInviteRoute =
    pathname.startsWith(BIENVENIDA_CL) || pathname.startsWith(BIENVENIDA_SE);

  if (
    pathname.startsWith("/app") &&
    userId === null &&
    !isInvitationPage &&
    !isPublicInviteRoute
  ) {
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    url.search = "";
    const redirect = NextResponse.redirect(url);
    // WP-56: /app/solicitudes/[id] kräver inloggning (`(app)/layout.tsx`),
    // till skillnad från /app/invitacion/bienvenida ovan — men ägaren som
    // öppnar sms/mejl-länken utloggad ska ändå hamna rätt efter inloggning.
    // `/auth/confirm` stödjer medvetet ingen `?next=` (öppen omdirigering,
    // D-019), så samma cookie-mönster som `pending_invitation`
    // (`/app/invitacion/[token]/page.tsx`): ett redan formatvaliderat id,
    // kort livslängd, `/app` (`src/app/(app)/app/page.tsx`) skickar vidare.
    const solicitudMatch = SOLICITUD_RE.exec(pathname);
    const solicitudId = solicitudMatch?.[1];
    if (solicitudId) {
      redirect.cookies.set("pending_solicitud", solicitudId, {
        path: "/",
        maxAge: 60 * 15,
        sameSite: "lax",
      });
    }
    return redirect;
  }

  return response;
}

export const config = {
  matcher: [
    "/design-lab/:path*",
    "/app/:path*",
    "/admin/:path*",
    "/login",
    "/auth/:path*",
  ],
};
