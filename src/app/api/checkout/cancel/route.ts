// WP-64 (D-044): kunden tryckte "tillbaka" i Stripe Checkout. `c` är en
// slumpmässig uuid som bara finns i den länken (se `abandonCheckout`).
import { NextResponse, type NextRequest } from "next/server";

import { abandonCheckout } from "@/server/payments/stripe/checkout";
import { systemClock } from "@/server/scheduling/clock";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest): Promise<NextResponse> {
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
