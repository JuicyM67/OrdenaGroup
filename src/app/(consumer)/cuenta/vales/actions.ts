"use server";

// WP-69 (D-057): "Ångra köp" i Mina värdebevis. Köparen från sessionen,
// värdebevisets id från formuläret (servern kontrollerar ägare, status och
// 14-dagarsgränsen).
import { redirect } from "next/navigation";

import { cuentaHref } from "@/config/routes";
import { isUuid } from "@/server/accounts/account";
import { systemClock } from "@/server/scheduling/clock";
import { withdrawVoucher } from "@/server/vouchers";

import { requireAccount } from "../session";

export async function withdrawVoucherAction(
  formData: FormData,
): Promise<never> {
  const session = await requireAccount();
  const id = formData.get("vale");
  const r = isUuid(id)
    ? await withdrawVoucher(session.userId, id, systemClock())
    : { ok: false as const };
  redirect(`${cuentaHref("cuentaVales")}?angra=${r.ok ? "klart" : "fel"}`);
}
