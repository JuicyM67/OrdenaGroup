import "server-only";

/**
 * WP-46 steg 5–6 (ui-engineer): `/app/invitacion/[token]`. `public.
 * accept_invitation(token)` (db-engineer, 20260930150400) gör själva
 * mutationen (security definer, kräver `auth.uid()` — körs via `withOwnerTx`,
 * INTE `withServiceTx`, annars saknas JWT-claimsen och funktionen svarar
 * "Se requiere autenticación"). Den funktionen delar SQLSTATE mellan flera
 * olika fall (P0001 för utgången/återkallad/redan använd, 42501 för fel
 * e-post ELLER planens gräns) — och hård regel (`src/server/db/errors.ts`):
 * fel läses BARA via SQLSTATE/constraint, aldrig `message`/`detail` (kan
 * innehålla värden). Lösningen: läs inbjudningsraden DIREKT (service role,
 * `peekInvitation`) både FÖRE och (vid en krock) EFTER anropet, och härled
 * den exakta orsaken ur raden själv — aldrig ur undantagets text.
 */
import { withOwnerTx, withServiceTx } from "@/server/db/tx";
import { hashInvitationToken } from "./token";

export type InvitationPreview = {
  businessName: string;
  status: "valid" | "expired" | "revoked" | "accepted";
};

type PeekRow = {
  email: string;
  business_id: string;
  business_name: string;
  expires_at: string;
  accepted_at: string | null;
  revoked_at: string | null;
};

async function peekInvitation(token: string): Promise<PeekRow | null> {
  if (!token || token.trim() === "") return null;
  const hash = hashInvitationToken(token);
  return withServiceTx(async (q) => {
    const r = await q.query<PeekRow>(
      `select i.email, i.business_id, b.name as business_name,
              i.expires_at, i.accepted_at, i.revoked_at
         from public.member_invitations i
         join public.businesses b on b.id = i.business_id
        where i.token_hash = $1`,
      [hash],
    );
    return r.rows[0] ?? null;
  });
}

/** Läges för sidan INNAN inloggning/accept — visar rätt rubrik/felmeddelande
 * oavsett om besökaren redan är inloggad. */
export async function loadInvitationPreview(
  token: string,
): Promise<InvitationPreview | null> {
  const row = await peekInvitation(token);
  if (!row) return null;
  const status: InvitationPreview["status"] = row.revoked_at
    ? "revoked"
    : row.accepted_at
      ? "accepted"
      : new Date(row.expires_at).getTime() <= Date.now()
        ? "expired"
        : "valid";
  return { businessName: row.business_name, status };
}

export type AcceptInvitationResult =
  | { ok: true; businessId: string }
  | {
      ok: false;
      code:
        | "noEncontrada"
        | "expirada"
        | "revocada"
        | "yaUsada"
        | "limiteDelPlan"
        | "unknown";
    }
  | { ok: false; code: "otroCorreo"; email: string };

/** Delmängden `reasonFromRow` faktiskt returnerar (aldrig `ok: true`). */
type AcceptFailure = Extract<AcceptInvitationResult, { ok: false }>;

/** Härleder felkoden ur en (eventuellt nyss omlästa) rad — aldrig ur
 * undantagets text. `row === null` → inbjudan finns inte (längre). */
function reasonFromRow(
  row: PeekRow | null,
  userEmail: string,
  now: Date,
): AcceptFailure {
  if (!row) return { ok: false, code: "noEncontrada" };
  if (row.revoked_at) return { ok: false, code: "revocada" };
  if (row.accepted_at) return { ok: false, code: "yaUsada" };
  if (new Date(row.expires_at).getTime() <= now.getTime()) {
    return { ok: false, code: "expirada" };
  }
  if (row.email.toLowerCase() !== userEmail.toLowerCase()) {
    return { ok: false, code: "otroCorreo", email: row.email };
  }
  return { ok: false, code: "unknown" };
}

export async function acceptInvitation(
  userId: string,
  userEmail: string,
  token: string,
  now: Date,
): Promise<AcceptInvitationResult> {
  const before = await peekInvitation(token);
  const preCheck = reasonFromRow(before, userEmail, now);
  if (preCheck.code !== "unknown" || !before) return preCheck;

  try {
    const businessId = await withOwnerTx(userId, async (q) => {
      const r = await q.query<{ id: string }>(
        `select public.accept_invitation($1) as id`,
        [token],
      );
      return r.rows[0]!.id;
    });
    return { ok: true, businessId };
  } catch {
    // Krock mellan läsningen ovan och anropet (t.ex. en annan flik hann
    // återkalla/acceptera/planen ändrades): läs om raden och härled orsaken
    // ur den, inte ur undantaget. Fortfarande "unknown" här (raden ser giltig
    // och rätt adresserad ut) → det enda kvarvarande fallet i
    // accept_invitation är planens gräns.
    const after = await peekInvitation(token);
    const reason = reasonFromRow(after, userEmail, now);
    if (reason.code !== "unknown") return reason;
    return { ok: false, code: "limiteDelPlan" };
  }
}
