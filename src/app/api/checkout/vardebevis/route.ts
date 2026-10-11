// WP-69 (D-057): kunden tryckte "tillbaka" i Stripe Checkout vid köp av ett
// värdebevis. `o` är orderns uuid (bara i den länken); bara den inloggade
// köparen kan avbryta sin egen order (K1). Sessionen avslutas hos Stripe och
// exemplaret lämnas tillbaka (se `abandonVoucherOrder`). Utloggad: svepet
// släpper ordern när sessionen gått ut.
import { NextResponse, type NextRequest } from "next/server";

import { optionalAccount } from "@/app/(consumer)/cuenta/session";
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
  const account = await optionalAccount();
  const slug = account
    ? await abandonVoucherOrder(id, account.userId, systemClock()).catch(
        () => undefined,
      )
    : undefined;
  if (!slug) return NextResponse.redirect(new URL("/", request.url));
  return NextResponse.redirect(
    new URL(`${hrefMarketplace("oferta", slug)}?kop=avbrutet`, request.url),
  );
}
