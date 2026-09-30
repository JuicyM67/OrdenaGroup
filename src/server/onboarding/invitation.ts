import "server-only";

// `/app/bienvenida/[token]` (F19/WP-36): den publika sidan där någon
// inbjuden av en plattformsadmin accepterar sin inbjudan. `getInvitationPreview`
// körs INNAN inloggning (service_role, ingen session) — bara för att visa
// rätt text/skicka rätt magisk länk, aldrig för att avslöja mer än e-post
// och företagsnamn (redan det admin själv skrev in). `acceptInvitation`
// körs EFTER inloggning (`withOwnerTx`), och anropar bara den redan
// granskade `public.accept_business_invitation(token)` (säkerhetsgranskning
// hör till den funktionen, inte hit).
import { pgErrorCode } from "@/server/db/errors";
import { withOwnerTx, withServiceTx } from "@/server/db/tx";

import { hashInvitationToken } from "../admin/token";

/** Cookie som `/app/bienvenida/[token]/actions.ts` sätter innan den skickar
 * den magiska länken (personen är ännu inte inloggad) — `/app/page.tsx`
 * läser den efter inloggning för att veta VILKEN inbjudan som ska
 * accepteras (`/auth/confirm` skickar alltid till `/app`, aldrig till en
 * fri `next`-parameter, se den filens kommentar). 20 minuter: täcker
 * giltighetstiden för den magiska länken (15 min, `acceso.magicLink.
 * expira`) med marginal. */
export const INVITE_COOKIE_NAME = "llena_invite_token";
export const INVITE_COOKIE_MAX_AGE_SECONDS = 20 * 60;

export type InvitationPreview =
  | { ok: true; email: string; businessName: string }
  | { ok: false; code: "not_found" | "accepted" | "expired" };

export async function getInvitationPreview(
  token: string,
): Promise<InvitationPreview> {
  if (!token) return { ok: false, code: "not_found" };
  const hash = hashInvitationToken(token);
  return withServiceTx(async (q) => {
    const r = await q.query<{
      email: string;
      business_name: string;
      expires_at: string;
      accepted_at: string | null;
    }>(
      `select email, business_name, expires_at, accepted_at
         from private.business_invitations
        where token_hash = $1`,
      [hash],
    );
    const row = r.rows[0];
    if (!row) return { ok: false, code: "not_found" };
    if (row.accepted_at) return { ok: false, code: "accepted" };
    if (new Date(row.expires_at).getTime() < Date.now()) {
      return { ok: false, code: "expired" };
    }
    return { ok: true, email: row.email, businessName: row.business_name };
  });
}

export type AcceptInvitationResult =
  | { ok: true; businessId: string }
  | {
      ok: false;
      code: "not_found" | "used_or_expired" | "email_mismatch" | "unknown";
    };

export async function acceptInvitation(
  userId: string,
  token: string,
): Promise<AcceptInvitationResult> {
  try {
    return await withOwnerTx(userId, async (q) => {
      const r = await q.query<{ id: string }>(
        `select public.accept_business_invitation($1) as id`,
        [token],
      );
      return { ok: true, businessId: r.rows[0]!.id };
    });
  } catch (e) {
    const code = pgErrorCode(e);
    if (code === "P0002") return { ok: false, code: "not_found" };
    if (code === "22023") return { ok: false, code: "used_or_expired" };
    if (code === "42501") return { ok: false, code: "email_mismatch" };
    return { ok: false, code: "unknown" };
  }
}
