"use server";

// WP-69 (D-057): "Köp och välj tid" på erbjudandesidan. Kräver kundkonto:
// utloggad → kontots inloggning, och efter inloggningen tillbaka hit (cookien
// `account_return`, whitelist). Beloppet räknas på servern ur erbjudandet;
// formuläret skickar bara erbjudandets slug.
import { cookies } from "next/headers";
import { redirect } from "next/navigation";

import { requireAccount } from "@/app/(consumer)/cuenta/session";
import { hrefMarketplace } from "@/config/routes";
import {
  ACCOUNT_RETURN_COOKIE,
  authIntentCookieOptions,
} from "@/lib/supabase/intent";
import { loadOffer } from "@/server/marketplace/public";
import { systemClock } from "@/server/scheduling/clock";
import { createVoucherCheckout, vouchersEnabled } from "@/server/vouchers";

export async function buyOffer(formData: FormData): Promise<never> {
  const raw = formData.get("oferta");
  const slug = typeof raw === "string" ? raw : "";
  const offer = vouchersEnabled() ? await loadOffer(slug) : undefined;
  if (!offer) redirect(hrefMarketplace("descubre"));
  const back = hrefMarketplace("oferta", offer.slug);

  // Före `requireAccount` (som skickar utloggade till inloggningen).
  const store = await cookies();
  store.set(ACCOUNT_RETURN_COOKIE, back, authIntentCookieOptions);
  const session = await requireAccount();
  store.delete(ACCOUNT_RETURN_COOKIE);

  const r = await createVoucherCheckout({
    offerId: offer.id,
    userId: session.userId,
    email: session.email || null,
    now: systemClock(),
  });
  if (r.ok) redirect(r.url);
  redirect(`${back}?kop=${r.code === "sold_out" ? "slut" : "fel"}`);
}
