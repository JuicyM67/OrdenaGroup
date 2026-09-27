// Stänger /design-lab/* helt vid källan i produktion (VERCEL_ENV=production), innan App
// Router hinner rendera något. layout.tsx anropar notFound() också (försvar i djupet), men
// det räcker inte ensamt: Next kan fortfarande strömma en delvis exekverad RSC/flight-payload
// för sidan i samma svar som 404-statusen (granskningsfynd — "Corte clásico" syntes i
// svarskroppen trots status 404). proxy.ts (Next 16:s efterträdare till middleware.ts, se
// https://nextjs.org/docs/messages/middleware-to-proxy) kör innan routing/rendering och kan
// därför svara med en tom 404 utan att någon sida någonsin renderas.
import { NextResponse } from "next/server";

import { isDesignLabEnabled } from "@/app/design-lab/gate";

export function proxy() {
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

export const config = {
  matcher: "/design-lab/:path*",
};
