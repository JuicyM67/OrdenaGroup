import "server-only";

// "Nytt negocio" i /admin (F19/WP-36): skapar en rad i
// `private.business_invitations` och mejlar länken direkt via Resend (inte
// utkorgen — en engångsåtgärd av en admin, samma resonemang som
// `sendLoginLink`).
//
// WP-93 (D-078): företaget (utkast, comuna/category tomma) skapas direkt med
// inbjudan, så admin kan öppna det i /admin och hjälpa till innan kunden
// loggat in. Kunden blir ägare när hen loggar in med inbjudans e-post.
import {
  BILLING_NOTE_MAX,
  isBillingMode,
  type BillingMode,
} from "@/config/billing-mode";
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
  /** WP-80 (D-061): "Facturación manual" — följer med till företaget. */
  billingMode?: BillingMode;
  billingNote?: string | null;
};

export type InviteBusinessResult =
  | { ok: true; invitationId: string; businessId: string }
  | { ok: false; code: string };

/** Mejlet med länken till `/app/bienvenida/[token]`. Kastar om Resend fallerar. */
async function sendInvitationEmail(
  email: string,
  businessName: string,
  token: string,
): Promise<void> {
  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "";
  await sendEmail({
    to: email,
    template: "invitacionNegocio",
    data: {
      negocio: businessName,
      aceptarUrl: `${appUrl}${appHref("appBienvenida", token)}`,
    },
  });
}

export async function inviteBusiness(
  adminUserId: string,
  input: InviteBusinessInput,
): Promise<InviteBusinessResult> {
  const email = input.email.trim().toLowerCase();
  const businessName = input.businessName.trim();
  if (!email || !email.includes("@"))
    return { ok: false, code: "invalid_email" };
  if (!businessName) return { ok: false, code: "invalid_name" };
  const billingMode = input.billingMode ?? "app";
  if (!isBillingMode(billingMode)) return { ok: false, code: "invalid_input" };
  const billingNote = input.billingNote?.trim()
    ? input.billingNote.trim()
    : null;
  if (billingNote && billingNote.length > BILLING_NOTE_MAX)
    return { ok: false, code: "note_too_long" };

  const { token, hash } = createInvitationToken();

  const { invitationId, businessId } = await withServiceTx(async (q) => {
    const r = await q.query<{ id: string }>(
      `insert into private.business_invitations
         (email, business_name, plan, plan_override_until, token_hash, created_by,
          billing_mode, billing_note)
       values ($1, $2, $3, $4, $5, $6, $7, $8)
       returning id`,
      [
        email,
        businessName,
        input.plan,
        input.planOverrideUntil ?? null,
        hash,
        adminUserId,
        billingMode,
        billingNote,
      ],
    );
    const id = r.rows[0]!.id;
    const b = await q.query<{ business_id: string }>(
      `select private.create_invitation_business($1) as business_id`,
      [id],
    );
    const newBusinessId = b.rows[0]!.business_id;
    await writeAuditLog(q, {
      adminUserId,
      action: "invite_business",
      businessId: newBusinessId,
      details: {
        invitation_id: id,
        plan: input.plan,
        billing_mode: billingMode,
      },
    });
    return { invitationId: id, businessId: newBusinessId };
  });

  try {
    await sendInvitationEmail(email, businessName, token);
  } catch {
    // Inbjudan och företaget finns redan (loggen visar att de skapades) —
    // admin kan skicka en ny länk med "Reenviar invitación". Inget fel till
    // anroparen: engagemanget (raden/loggen) lyckades.
  }

  return { ok: true, invitationId, businessId };
}

export type PendingInvitation = {
  readonly email: string;
  readonly expiresAt: string;
  readonly expired: boolean;
};

/** WP-93: inbjudan till företaget som ingen accepterat än (senaste), eller null. */
export async function getPendingInvitation(
  businessId: string,
): Promise<PendingInvitation | null> {
  return withServiceTx(async (q) => {
    const r = await q.query<{ email: string; expires_at: Date | string }>(
      `select email, expires_at from private.business_invitations
        where business_id = $1 and accepted_at is null
        order by created_at desc limit 1`,
      [businessId],
    );
    const row = r.rows[0];
    if (!row) return null;
    const expiresAt = new Date(row.expires_at);
    return {
      email: row.email,
      expiresAt: expiresAt.toISOString(),
      expired: expiresAt.getTime() < Date.now(),
    };
  });
}

/** WP-93: ny länk (ny token, 7 dagar till) för en inbjudan som inte accepterats. */
export async function resendInvitation(
  adminUserId: string,
  businessId: string,
): Promise<{ ok: true } | { ok: false; code: string }> {
  const { token, hash } = createInvitationToken();
  const row = await withServiceTx(async (q) => {
    const r = await q.query<{ id: string; email: string; business_name: string }>(
      `update private.business_invitations
          set token_hash = $2, expires_at = now() + interval '7 days'
        where id = (select id from private.business_invitations
                     where business_id = $1 and accepted_at is null
                     order by created_at desc limit 1
                     for update)
        returning id, email, business_name`,
      [businessId, hash],
    );
    const inv = r.rows[0];
    if (!inv) return null;
    await writeAuditLog(q, {
      adminUserId,
      action: "resend_invitation",
      businessId,
      details: { invitation_id: inv.id },
    });
    return inv;
  });
  if (!row) return { ok: false, code: "not_found" };

  try {
    await sendInvitationEmail(row.email, row.business_name, token);
  } catch {
    return { ok: false, code: "email_failed" };
  }
  return { ok: true };
}
