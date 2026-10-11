"use server";

// WP-77 (D-058): "Ångra köp" i Mina presentkort. Köparen från sessionen,
// kortets id från formuläret (servern kontrollerar ägare, status, att kortet
// är oanvänt och 14-dagarsgränsen).
import { redirect } from "next/navigation";

import { regalosHref } from "@/config/routes";
import { isUuid } from "@/server/accounts/account";
import { withdrawGiftCard } from "@/server/gift-cards";
import { systemClock } from "@/server/scheduling/clock";

import { requireAccount } from "../session";

export async function withdrawGiftCardAction(
  formData: FormData,
): Promise<never> {
  const session = await requireAccount();
  const id = formData.get("tarjeta");
  const r = isUuid(id)
    ? await withdrawGiftCard(
        { userId: session.userId, cardId: id },
        systemClock(),
      )
    : { ok: false as const };
  redirect(`${regalosHref("cuenta")}?angra=${r.ok ? "klart" : "fel"}`);
}
