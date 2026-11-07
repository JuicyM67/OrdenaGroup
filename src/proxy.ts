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
// kan skickas vidare av sidan själv (page.tsx), med färska cookies. Samma för
// registreringen `/comenzar` (WP-83, D-068).
//
// F19/WP-36: `/app/bienvenida/[token]` är PUBLIK (utanför `(app)`-layoutens
// inloggningskrav, se src/app/app/bienvenida/[token]/page.tsx) — en person
// utan session ska kunna öppna den och be om sin inloggningslänk, så den
// undantas uttryckligen från "/app/*"-redirecten nedan. `/admin/*` matchas
// bara för att förnya sessionscookien (samma som `/app`); ingen redirect
// här — varje admin-sida gör sin egen `requireAdminPage()`-kontroll
// (404/redirect till /admin/mfa), som inte får avslöja att ytan finns för
// icke-admins (ett proxy-redirect till /login skulle göra det).

import { NextResponse, type NextRequest } from "next/server";

import { isDesignLabEnabled } from "@/app/design-lab/gate";
import {
  appRoutePrefix,
  CUENTA_INGRESAR_PATH,
  CUENTA_ROOT,
  cuentaHref,
} from "@/config/routes";
import { refreshSupabaseSession } from "@/lib/supabase/proxy";

const INVITACION = appRoutePrefix("appInvitacion");
const BIENVENIDA = appRoutePrefix("appBienvenida");
const SOLICITUD_RE = new RegExp(
  `^${appRoutePrefix("appSolicitud")}([0-9a-f-]{36})$`,
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
  const isInvitationPage = pathname.startsWith(INVITACION);

  // F19/WP-36: samma undantag för /app/bienvenida/[token] (en ANNAN
  // inbjudan, att skapa ett nytt företag — se src/app/app/bienvenida/
  // [token]/page.tsx).
  const isPublicInviteRoute = pathname.startsWith(BIENVENIDA);

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
    // öppnar mejl-länken utloggad ska ändå hamna rätt efter inloggning.
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

  // WP-67 (D-054): kundkontots sidor (`/cuenta/*`) kräver inloggning, utom
  // själva inloggningssidan. Utloggad → kontots inloggning, inte företagens `/login`.
  const isCuenta =
    pathname === CUENTA_ROOT || pathname.startsWith(`${CUENTA_ROOT}/`);
  const isCuentaIngresar =
    pathname === CUENTA_INGRESAR_PATH ||
    pathname.startsWith(`${CUENTA_INGRESAR_PATH}/`);
  if (isCuenta && !isCuentaIngresar && userId === null) {
    const url = request.nextUrl.clone();
    url.pathname = cuentaHref("cuentaIngresar");
    url.search = "";
    return NextResponse.redirect(url);
  }

  return response;
}

export const config = {
  matcher: [
    "/design-lab/:path*",
    "/app/:path*",
    "/admin/:path*",
    "/login",
    "/comenzar",
    "/auth/:path*",
    "/cuenta/:path*",
  ],
};
