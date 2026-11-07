import "server-only";

/**
 * Personalinbjudan (WP-46 steg 4, D-034): ägaren bjuder in en person till en
 * specifik personalrad. `member_invitations`/RLS/`accept_invitation` är
 * db-engineerns (se `supabase/migrations/20260930150{300,400}_*.sql`) — den
 * här filen är serverns MUTATIONSLAGER ovanpå den tabellen, i samma anda som
 * `src/server/privacy/business.ts`: `withServiceTx` (transaktionen behöver
 * också skriva `message_outbox`, som bara `service_role` får INSERT:a i,
 * `supabase/migrations/20260929110000_message_outbox.sql`) + en EGEN
 * `isOwner`-kontroll (RLS gäller inte för `service_role`) — inte
 * `withOwnerTx`.
 *
 * Utkorgen (regel hård 4): `createInvitation`/`resendInvitation` köar en rad
 * `recipient_kind = 'invitee'`, `template = 'invitacionEquipo'`. Payloaden
 * bär bara det som behövs för att RENDERA mejlet och som inte går att slå
 * upp billigt från tabellerna: `invitationId` (adressen/företagsnamnet slår
 * workern upp via den, ingen adress i utkorgen) + den nygenererade
 * klartext-token:en (D-029) + `invitadoPor` (den agerande ägarens
 * visningsnamn — se motivering i `./schemas.ts`, `createInvitationSchema`).
 * Precis som `motivo` i `src/server/messaging/outbox/enqueue.ts` töms hela
 * `payload` av workern när raden blir `sent`/`dead`/`cancelled`
 * (`finalizeSent`/`finalizeFailed`/`finalizeCancelled`, oförändrade här).
 *
 * Anroparen (ui-engineer, Ajustes → Equipo, utanför den här mappen) triggar
 * ett snabbt workerpass EFTER att mutationen lyckats, precis som
 * `src/app/[slug]/actions.ts` gör för bokningar
 * (`src/server/messaging/outbox/kick.ts`s `kickOutbox()`) — den här filen
 * anropar den INTE själv (samma lager-uppdelning som `src/server/bookings/`:
 * motorn skriver bara till kön, sidan/action:en kickar).
 */
import type { Queryable } from "@/server/db/pool";
import { pgErrorCode } from "@/server/db/errors";
import { withServiceTx } from "@/server/db/tx";
import { loadPlanIn, planCan } from "@/server/plans/entitlements";
import { isOwner } from "@/server/privacy/authz";

import {
  createInvitationSchema,
  resendInvitationSchema,
  revokeInvitationSchema,
  type CreateInvitationInput,
  type ResendInvitationInput,
  type RevokeInvitationInput,
} from "./schemas";
import { createInvitationToken } from "./token";

export type MutationResult = { ok: true } | { ok: false; code: string };
export type CreateInvitationResult =
  { ok: true; invitationId: string } | { ok: false; code: string };

// ---------------------------------------------------------------------------
// Feltolkning (bara SQLSTATE/constraint, aldrig `detail` — samma regel som
// `src/server/db/errors.ts`/`src/server/owner/ajustes.ts`s `mapDbError`).
// ---------------------------------------------------------------------------

function pgConstraint(e: unknown): string | undefined {
  if (typeof e !== "object" || e === null || !("constraint" in e)) {
    return undefined;
  }
  const v = (e as Record<string, unknown>).constraint;
  return typeof v === "string" ? v : undefined;
}

/**
 * - `23503`: sammansatt FK `(business_id, staff_id)` — i praktiken hinner
 *   `staffExists` nedan fånga det här innan insert, men försvar i djupet.
 * - `23505` på det partiella unika indexet (högst en levande inbjudan per
 *   personalrad, `20260930150300_member_invitations.sql`).
 * - `42501`: `private.member_invitations_guard_limit()` (plangränsen, i dag
 *   alltid `null` = obegränsad, se samma migration).
 */
function mapDbError(e: unknown): string {
  const code = pgErrorCode(e);
  const constraint = pgConstraint(e);
  if (code === "23503") return "staff_not_found";
  if (code === "23505") {
    return constraint === "member_invitations_business_staff_pending_uidx"
      ? "invitation_pending"
      : "unexpected";
  }
  if (code === "42501") return "plan_limit_reached";
  return "unexpected";
}

// ---------------------------------------------------------------------------
// Utkorgen
// ---------------------------------------------------------------------------

function invitationDedupeKey(invitationId: string, hash: Buffer): string {
  // `hash` (token_hash) är NY vid varje skapande/omsändning (`createInvitationToken`),
  // så nyckeln skiljer sig mellan "skicka igen"-försök trots att `invitationId`
  // är densamma — `message_outbox.dedupe_key` är unik för HELA tabellen (även
  // `sent`/`dead`-rader, inte bara väntande), se migrationskommentaren.
  return `invitacionEquipo:email:invitee:${invitationId}:${hash.toString("hex")}`;
}

async function enqueueInvitationEmail(
  q: Queryable,
  args: {
    businessId: string;
    invitationId: string;
    token: string;
    tokenHash: Buffer;
    invitadoPor: string;
  },
): Promise<void> {
  const payload = {
    invitationId: args.invitationId,
    token: args.token,
    invitadoPor: args.invitadoPor,
  };
  await q.query(
    `insert into public.message_outbox
       (business_id, channel, recipient_kind, template, payload, category, dedupe_key)
     values ($1, 'email', 'invitee', 'invitacionEquipo', $2::jsonb, 'utility', $3)
     on conflict (dedupe_key) do nothing`,
    [
      args.businessId,
      JSON.stringify(payload),
      invitationDedupeKey(args.invitationId, args.tokenHash),
    ],
  );
}

// ---------------------------------------------------------------------------
// createInvitation
// ---------------------------------------------------------------------------

async function staffExists(
  q: Queryable,
  businessId: string,
  staffId: string,
): Promise<boolean> {
  const r = await q.query(
    `select 1 from public.staff where business_id = $1 and id = $2`,
    [businessId, staffId],
  );
  return r.rows.length > 0;
}

/**
 * Bjuder in en person till en personalrad. Bara ägaren (`isOwner`, D-034/
 * "Ägarens svar" punkt 2: bara ägaren bjuder in och sätter behörigheter).
 * Genererar en klartext-token (32 byte), sparar bara hashen
 * (`member_invitations.token_hash`), köar utkorgsraden och returnerar
 * `invitationId` — ALDRIG klartext-token:en till anroparen (den finns bara
 * i mejlets länk).
 */
export async function createInvitation(
  input: CreateInvitationInput,
): Promise<CreateInvitationResult> {
  const parsed = createInvitationSchema.safeParse(input);
  if (!parsed.success) {
    return {
      ok: false,
      code: parsed.error.issues[0]?.message ?? "invalid_input",
    };
  }
  const { businessId, invitedBy, invitedByName, email, staffId, flags } =
    parsed.data;

  return withServiceTx(async (q) => {
    if (!(await isOwner(q, invitedBy, businessId))) {
      return { ok: false, code: "unauthorized" };
    }
    if (!(await staffExists(q, businessId, staffId))) {
      return { ok: false, code: "staff_not_found" };
    }
    // WP-73 (D-048): personalkonton ingår från Team. Antalet spärras också
    // i databasen (`member_invitations_guard_limit`, per företag).
    if (!planCan(await loadPlanIn(q, businessId), "staff_accounts")) {
      return { ok: false, code: "plan_limit_reached" };
    }

    const { token, hash } = createInvitationToken();

    let invitationId: string | undefined;
    try {
      const inserted = await q.query<{ id: string }>(
        `insert into public.member_invitations
           (business_id, email, staff_id, invited_by, token_hash,
            can_manage_own_bookings, can_manage_all_bookings, can_cancel_bookings,
            can_edit_catalog, can_manage_team, can_view_reports, can_edit_settings,
            can_view_records)
         values ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
         returning id`,
        [
          businessId,
          email,
          staffId,
          invitedBy,
          hash,
          flags.can_manage_own_bookings,
          flags.can_manage_all_bookings,
          flags.can_cancel_bookings,
          flags.can_edit_catalog,
          flags.can_manage_team,
          flags.can_view_reports,
          flags.can_edit_settings,
          flags.can_view_records,
        ],
      );
      invitationId = inserted.rows[0]?.id;
    } catch (e) {
      return { ok: false, code: mapDbError(e) };
    }
    if (!invitationId) return { ok: false, code: "unexpected" };

    await enqueueInvitationEmail(q, {
      businessId,
      invitationId,
      token,
      tokenHash: hash,
      invitadoPor: invitedByName,
    });

    return { ok: true, invitationId };
  });
}

// ---------------------------------------------------------------------------
// resendInvitation
// ---------------------------------------------------------------------------

/**
 * Skickar en NY token (roterar länken, gamla mejlets länk slutar gälla —
 * samma D-029-mönster som bokningens flytt) och ett nytt förfallodatum
 * (+7 dagar från nu), bara för en inbjudan som varken accepterats eller
 * återkallats. Bara ägaren.
 */
export async function resendInvitation(
  input: ResendInvitationInput,
): Promise<MutationResult> {
  const parsed = resendInvitationSchema.safeParse(input);
  if (!parsed.success) {
    return {
      ok: false,
      code: parsed.error.issues[0]?.message ?? "invalid_input",
    };
  }
  const { businessId, invitationId, userId, invitedByName } = parsed.data;

  return withServiceTx(async (q) => {
    if (!(await isOwner(q, userId, businessId))) {
      return { ok: false, code: "unauthorized" };
    }

    const { token, hash } = createInvitationToken();
    const updated = await q.query(
      `update public.member_invitations
          set token_hash = $3, expires_at = now() + interval '7 days'
        where business_id = $1 and id = $2
          and accepted_at is null and revoked_at is null`,
      [businessId, invitationId, hash],
    );
    if (!updated.rowCount) {
      const exists = await q.query<{
        accepted_at: string | null;
        revoked_at: string | null;
      }>(
        `select accepted_at, revoked_at from public.member_invitations
          where business_id = $1 and id = $2`,
        [businessId, invitationId],
      );
      const row = exists.rows[0];
      if (!row) return { ok: false, code: "not_found" };
      return {
        ok: false,
        code: row.accepted_at ? "already_accepted" : "already_revoked",
      };
    }

    await enqueueInvitationEmail(q, {
      businessId,
      invitationId,
      token,
      tokenHash: hash,
      invitadoPor: invitedByName,
    });

    return { ok: true };
  });
}

// ---------------------------------------------------------------------------
// revokeInvitation
// ---------------------------------------------------------------------------

/** Återkallar en väntande inbjudan (inte accepterad, inte redan återkallad).
 * Ingen rad tas bort (audit-spår, samma anda som `member_invitations`s
 * RLS-kommentar: ingen delete-policy för `authenticated`). En redan köad
 * `invitacionEquipo`-rad som inte hunnit skickas avbryts av workern själv
 * vid sändningstillfället (`isPending`-kontrollen i `outbox/worker.ts`) —
 * ingen proaktiv städning behövs här. Bara ägaren. */
export async function revokeInvitation(
  input: RevokeInvitationInput,
): Promise<MutationResult> {
  const parsed = revokeInvitationSchema.safeParse(input);
  if (!parsed.success) {
    return {
      ok: false,
      code: parsed.error.issues[0]?.message ?? "invalid_input",
    };
  }
  const { businessId, invitationId, userId } = parsed.data;

  return withServiceTx(async (q) => {
    if (!(await isOwner(q, userId, businessId))) {
      return { ok: false, code: "unauthorized" };
    }

    const updated = await q.query(
      `update public.member_invitations
          set revoked_at = now()
        where business_id = $1 and id = $2
          and accepted_at is null and revoked_at is null`,
      [businessId, invitationId],
    );
    if (updated.rowCount) return { ok: true };

    const exists = await q.query<{
      accepted_at: string | null;
      revoked_at: string | null;
    }>(
      `select accepted_at, revoked_at from public.member_invitations
        where business_id = $1 and id = $2`,
      [businessId, invitationId],
    );
    const row = exists.rows[0];
    if (!row) return { ok: false, code: "not_found" };
    return {
      ok: false,
      code: row.accepted_at ? "already_accepted" : "already_revoked",
    };
  });
}
