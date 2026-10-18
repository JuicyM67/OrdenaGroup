import "server-only";

// WP-80 (D-061): plattformsadmins hanteras i /admin/administradores.
// Anroparen har redan passerat `requireAdminForAction()` (aal2). Allt körs
// som service_role; regler som servern håller (och databasen backar upp):
//   - man kan inte ta bort sig själv (`cannot_remove_self`)
//   - den sista adminen kan inte tas bort (`last_admin`; trigger
//     `platform_admins_keep_one` i databasen som backstopp)
//   - varje ändring loggas i `admin_audit_log` i SAMMA transaktion.
//
// Inbjudan: finns ett auth-konto med e-postadressen läggs det till direkt;
// annars skapas kontot (`auth.admin.createUser`, bekräftad e-post) och läggs
// till. I båda fallen skickas en magisk länk (samma mekanism som
// `sendLoginLink`) i mejlet `invitacionAdmin`. Ingen väntande-tabell:
// kontot kan inte användas förrän mottagaren loggat in via sin e-post OCH
// skrivit in MFA på /admin/mfa (aal2 krävs för allt annat i /admin).
import { getStorageAdminClient } from "@/server/db/pool";
import { withServiceTx } from "@/server/db/tx";
import { sendEmail } from "@/server/messaging/email/send";

import { writeAuditLog } from "./audit";
import { emailsByUserId } from "./businesses";

export type PlatformAdmin = {
  readonly userId: string;
  readonly email: string | null;
  readonly addedBy: string | null;
  readonly createdAt: string;
  /** Har ett verifierat TOTP-faktor (kan nå aal2). `null` = okänt. */
  readonly mfaEnrolled: boolean | null;
};

export type AdminMutationResult =
  | { ok: true; createdAccount?: boolean; emailSent?: boolean }
  | { ok: false; code: AdminMutationError };

export type AdminMutationError =
  | "invalid_email"
  | "already_admin"
  | "create_user_failed"
  | "cannot_remove_self"
  | "last_admin"
  | "not_found";

const EMAIL_RE = /^[^@\s]+@[^@\s]+\.[^@\s]+$/;

export function normalizeAdminEmail(raw: string): string | null {
  const email = raw.trim().toLowerCase();
  return email.length <= 254 && EMAIL_RE.test(email) ? email : null;
}

async function mfaEnrolled(userId: string): Promise<boolean | null> {
  try {
    const { data, error } =
      await getStorageAdminClient().auth.admin.mfa.listFactors({ userId });
    if (error || !data) return null;
    return data.factors.some((f) => f.status === "verified");
  } catch {
    return null;
  }
}

export async function listPlatformAdmins(): Promise<readonly PlatformAdmin[]> {
  const rows = await withServiceTx(async (q) => {
    const r = await q.query<{
      user_id: string;
      added_by: string | null;
      created_at: string;
    }>(
      `select user_id, added_by, created_at
         from private.platform_admins
        order by created_at`,
    );
    return r.rows;
  });
  const emails = await emailsByUserId();
  return Promise.all(
    rows.map(async (row) => ({
      userId: row.user_id,
      email: emails.get(row.user_id) ?? null,
      addedBy: row.added_by,
      createdAt: row.created_at,
      mfaEnrolled: await mfaEnrolled(row.user_id),
    })),
  );
}

async function findUserIdByEmail(email: string): Promise<string | null> {
  const emails = await emailsByUserId();
  for (const [id, e] of emails) {
    if (e.toLowerCase() === email) return id;
  }
  return null;
}

async function sendAdminInvite(email: string): Promise<boolean> {
  const client = getStorageAdminClient();
  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "";
  const { data, error } = await client.auth.admin.generateLink({
    type: "magiclink",
    email,
    options: appUrl ? { redirectTo: `${appUrl}/auth/confirm` } : undefined,
  });
  if (error || !data) return false;
  const ingresarUrl = `${appUrl}/auth/confirm?token_hash=${encodeURIComponent(
    data.properties.hashed_token,
  )}&type=magiclink`;
  try {
    await sendEmail({
      to: email,
      template: "invitacionAdmin",
      data: { ingresarUrl, adminUrl: `${appUrl}/admin` },
    });
    return true;
  } catch {
    return false;
  }
}

export async function addPlatformAdmin(
  actorUserId: string,
  rawEmail: string,
): Promise<AdminMutationResult> {
  const email = normalizeAdminEmail(rawEmail);
  if (!email) return { ok: false, code: "invalid_email" };

  let userId = await findUserIdByEmail(email);
  let createdAccount = false;
  if (!userId) {
    const { data, error } = await getStorageAdminClient().auth.admin.createUser(
      {
        email,
        email_confirm: true,
      },
    );
    if (error || !data.user) return { ok: false, code: "create_user_failed" };
    userId = data.user.id;
    createdAccount = true;
  }
  const targetUserId = userId;

  const inserted = await withServiceTx(async (q) => {
    const r = await q.query(
      `insert into private.platform_admins (user_id, added_by)
       values ($1, $2)
       on conflict (user_id) do nothing`,
      [targetUserId, actorUserId],
    );
    if (!r.rowCount) return false;
    // Regel 7: bara id:n i loggen, aldrig e-postadressen.
    await writeAuditLog(q, {
      adminUserId: actorUserId,
      action: "add_admin",
      targetUserId,
      details: { created_account: createdAccount },
    });
    return true;
  });
  if (!inserted) return { ok: false, code: "already_admin" };

  const emailSent = await sendAdminInvite(email);
  return { ok: true, createdAccount, emailSent };
}

export async function removePlatformAdmin(
  actorUserId: string,
  targetUserId: string,
): Promise<AdminMutationResult> {
  if (actorUserId === targetUserId)
    return { ok: false, code: "cannot_remove_self" };

  return withServiceTx(async (q) => {
    // Lås alla rader: två admins som samtidigt tar bort varandra ska inte
    // kunna lämna tabellen tom (databasens trigger är backstopp).
    const r = await q.query<{ user_id: string }>(
      `select user_id from private.platform_admins for update`,
    );
    const ids = r.rows.map((row) => row.user_id);
    if (!ids.includes(targetUserId)) return { ok: false, code: "not_found" };
    if (ids.length <= 1) return { ok: false, code: "last_admin" };

    await q.query(`delete from private.platform_admins where user_id = $1`, [
      targetUserId,
    ]);
    await writeAuditLog(q, {
      adminUserId: actorUserId,
      action: "remove_admin",
      targetUserId,
    });
    return { ok: true };
  });
}
