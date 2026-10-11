// WP-69 (D-057): kunden tryckte "tillbaka" i Stripe Checkout vid köp av ett
// värdebevis. `o` är orderns uuid (bara i den länken). Sessionen avslutas hos
// Stripe och exemplaret lämnas tillbaka (se `abandonVoucherOrder`).
import { NextResponse, type NextRequest } from "next/server";

import { hrefMarketplace } from "@/config/routes";
import { getClientIp, hitRateLimit } from "@/server/db/rate-limit";
import { systemClock } from "@/server/scheduling/clock";
import { abandonVoucherOrder } from "@/server/vouchers";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest): Promise<NextResponse> {
  const allowed = await hitRateLimit({
    scope: "checkout:cancel",
    subject: await getClientIp(),
    windowSeconds: 10 * 60,
    max: 20,
  }).catch(() => false);
  if (!allowed) return NextResponse.redirect(new URL("/", request.url));
  const id = request.nextUrl.searchParams.get("o") ?? "";
  const slug = await abandonVoucherOrder(id, systemClock()).catch(
    () => undefined,
  );
  if (!slug) return NextResponse.redirect(new URL("/", request.url));
  return NextResponse.redirect(
    new URL(`${hrefMarketplace("oferta", slug)}?kop=avbrutet`, request.url),
  );
}
