import "server-only";

// "Nytt negocio" i /admin (F19/WP-36): skapar en rad i
// `private.business_invitations` och mejlar länken direkt via Resend (inte
// utkorgen — en engångsåtgärd av en admin, samma resonemang som
// `sendLoginLink`).
import { appHref } from "@/config/routes";
import { withServiceTx } from "@/server/db/tx";
import { sendEmail } from "@/server/messaging/email/send";

import { writeAuditLog } from "./audit";
import { createInvitationToken } from "./token";

export type InviteBusinessInput = {
  email: string;
  businessName: string;
  plan: "free" | "emprende" | "equipo" | "local";
  planOverrideUntil?: string | null;
};

export type InviteBusinessResult =
  { ok: true; invitationId: string } | { ok: false; code: string };

export async function inviteBusiness(
  adminUserId: string,
  input: InviteBusinessInput,
): Promise<InviteBusinessResult> {
  const email = input.email.trim().toLowerCase();
  const businessName = input.businessName.trim();
  if (!email || !email.includes("@"))
    return { ok: false, code: "invalid_email" };
  if (!businessName) return { ok: false, code: "invalid_name" };

  const { token, hash } = createInvitationToken();

  const invitationId = await withServiceTx(async (q) => {
    const r = await q.query<{ id: string }>(
      `insert into private.business_invitations
         (email, business_name, plan, plan_override_until, token_hash, created_by)
       values ($1, $2, $3, $4, $5, $6)
       returning id`,
      [
        email,
        businessName,
        input.plan,
        input.planOverrideUntil ?? null,
        hash,
        adminUserId,
      ],
    );
    const id = r.rows[0]!.id;
    await writeAuditLog(q, {
      adminUserId,
      action: "invite_business",
      details: { invitation_id: id, plan: input.plan },
    });
    return id;
  });

  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "";
  try {
    await sendEmail({
      to: email,
      template: "invitacionNegocio",
      data: {
        negocio: businessName,
        aceptarUrl: `${appUrl}${appHref("appBienvenida", token)}`,
      },
    });
  } catch {
    // Inbjudan finns redan sparad (loggen visar att den skapades) — admin
    // kan skicka en ny länk manuellt om mejlet inte gick fram. Inget fel
    // till anroparen: engagemanget (raden/loggen) lyckades.
    return { ok: true, invitationId };
  }

  return { ok: true, invitationId };
}
