import "server-only";

// WP-77 (D-058): köpet. Anropas av sidans server action (slug bunden på
// servern). Zod validerar formuläret; leveransdagens intervall räknas i
// företagets tidszon (och igen i `gift_card_open_order`). Lyckat köp →
// redirect till Stripe Checkout.
import { redirect } from "next/navigation";

import { optionalAccount } from "@/app/(consumer)/cuenta/session";
import type { GiftCardFormState } from "@/components/gift-cards/gift-card-form";
import { GIFT_CARD_DELIVERY_MAX_DAYS } from "@/config/gift-cards";
import { addLocalDays, toLocalDate } from "@/lib/format/dates";
import {
  giftCardFormInput,
  giftCardFormSchema,
} from "@/lib/validation/gift-cards";
import { createGiftCardCheckout } from "@/server/gift-cards";
import { loadGiftCardShop } from "@/server/gift-cards/shop";
import { systemClock } from "@/server/scheduling/clock";

export async function buyGiftCard(
  slug: string,
  fd: FormData,
): Promise<GiftCardFormState> {
  const shop = await loadGiftCardShop(slug);
  if (!shop?.canSell) return { error: "unavailable" };
  const parsed = giftCardFormSchema.safeParse(giftCardFormInput(fd));
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "failed" };
  }
  const now = systemClock();
  const form = parsed.data;
  if (form.deliverOn) {
    const today = toLocalDate(now, shop.timeZone);
    const max = addLocalDays(today, GIFT_CARD_DELIVERY_MAX_DAYS);
    if (form.deliverOn < today || form.deliverOn > max) {
      return { error: "date" };
    }
  }
  const account = await optionalAccount();
  const r = await createGiftCardCheckout({
    businessId: shop.id,
    businessName: shop.name,
    slug,
    form,
    userId: account?.userId ?? null,
    now,
  });
  if (!r.ok) return { error: r.code };
  redirect(r.url);
}
