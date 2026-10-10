// WP-64 (D-044): kunden tryckte "tillbaka" i Stripe Checkout. `c` är en
// slumpmässig uuid som bara finns i den länken (se `abandonCheckout`).
import { NextResponse, type NextRequest } from "next/server";

import { getClientIp, hitRateLimit } from "@/server/db/rate-limit";
import { abandonCheckout } from "@/server/payments/stripe/reconcile";
import { systemClock } from "@/server/scheduling/clock";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest): Promise<NextResponse> {
  // Skydd mot att loopa sessioner: högst 20 försök per IP och 10 min.
  const allowed = await hitRateLimit({
    scope: "checkout:cancel",
    subject: await getClientIp(),
    windowSeconds: 10 * 60,
    max: 20,
  }).catch(() => false);
  if (!allowed) return NextResponse.redirect(new URL("/", request.url));
  const id = request.nextUrl.searchParams.get("c") ?? "";
  const result = await abandonCheckout(id, systemClock()).catch(
    () => undefined,
  );
  if (!result) return NextResponse.redirect(new URL("/", request.url));
  const flag = result.released ? "liberada" : "cancelado";
  return NextResponse.redirect(
    new URL(`/${result.slug}?pago=${flag}`, request.url),
  );
}
