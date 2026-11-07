import "server-only";

/**
 * Valideringsscheman för personalinbjudan (WP-46 steg 4). Samma mönster som
 * `src/server/owner/manual-booking.ts`: `z.guid()` (inte `z.uuid()`) för
 * id:n, eftersom seedens "vanity"-id:n (`aaaaaaaa-0000-…`) inte är giltiga
 * RFC 4122 v4-uuid:n; `z.strictObject` avvisar okända fält.
 *
 * Felkoder är `code: "custom"` med `message` = en punkterad kod
 * (`"invitation.email_invalid"` …), samma stil som
 * `src/server/onboarding/schemas.ts` — ingen spansk text här.
 */
import { z } from "zod";

import { PERMS, type Perm } from "@/server/db/permissions";

const uuid = z.guid();

const displayNameSchema = z
  .string({ error: "invitation.name_invalid_type" })
  .trim()
  .min(1, { error: "invitation.name_empty" })
  .max(120, { error: "invitation.name_too_long" });

// E-post: samma bas som `src/server/owner/manual-booking.ts`/
// `src/components/booking/form-schema.ts` (`z.email().max(254)`), plus
// normalisering (kvitt/gemener) — planen (steg 1): "Validering zod (e-post
// lowercase, staff tillhör företaget)".
const emailSchema = z
  .email({ error: "invitation.email_invalid" })
  .max(254, { error: "invitation.email_invalid" })
  .trim()
  .toLowerCase();

/**
 * De sju behörighetsflaggorna (samma kolumner/namn som
 * `memberships`/`member_invitations`, se `src/server/db/permissions.ts`).
 * Explicit uppräknade (inte härledda ur `PERMS`) för läsbarhet och en
 * riktig typ utan cast — `schemas.test.ts` håller de två listorna i synk
 * (samma mönster som `RUBRO_KEYS` mot `negocio.rubros` i
 * `src/server/onboarding/schemas.ts`).
 */
export const invitationFlagsSchema = z.strictObject({
  can_manage_own_bookings: z.boolean(),
  can_manage_all_bookings: z.boolean(),
  can_cancel_bookings: z.boolean(),
  can_edit_catalog: z.boolean(),
  can_manage_team: z.boolean(),
  can_view_reports: z.boolean(),
  can_edit_settings: z.boolean(),
  can_view_records: z.boolean(),
});

export type InvitationFlagsInput = z.infer<typeof invitationFlagsSchema>;

// Typkontroll (körs bara av `tsc`, ingen körtidskostnad): `InvitationFlagsInput`
// måste vara EXAKT `Record<Perm, boolean>` — om någon lägger till/tar bort en
// flagga i `src/server/db/permissions.ts` utan att uppdatera schemat ovan,
// felar den här raden. `schemas.test.ts` har motsvarande körtidskontroll.
type AssertFlagsMatchPerms = [Record<Perm, boolean>] extends [
  InvitationFlagsInput,
]
  ? [InvitationFlagsInput] extends [Record<Perm, boolean>]
    ? true
    : never
  : never;
const _assertFlagsMatchPerms: AssertFlagsMatchPerms = true;
void _assertFlagsMatchPerms;

/** Håller `invitationFlagsSchema`s nycklar i synk med `PERMS` (testat). */
export const INVITATION_FLAG_KEYS: readonly Perm[] = PERMS;

/**
 * `createInvitation`. `invitedByName`: ägarens visningsnamn/e-post — servern
 * kan inte läsa `auth.users` direkt (samma begränsning som
 * `private.owner_emails()`/`accept_invitation`s kommentarer, se
 * `supabase/migrations/20260929110000_message_outbox.sql`), så anroparen
 * (som redan har sin egen inloggade session, `auth.getUser()`) skickar in
 * det — samma mönster som `ownerNameParts(email)` i `src/server/owner/
 * shared.ts` härleder från den sessionens e-post. Sparas ALDRIG i databasen:
 * bara i `message_outbox.payload` tills raden är skickad (D-029).
 */
export const createInvitationSchema = z.strictObject({
  businessId: uuid,
  invitedBy: uuid,
  invitedByName: displayNameSchema,
  email: emailSchema,
  staffId: uuid,
  flags: invitationFlagsSchema,
});

export type CreateInvitationInput = z.input<typeof createInvitationSchema>;

/**
 * `resendInvitation`: ny token/förfallodatum, samma mejl skickas på nytt.
 * `invitedByName` är den NU agerande ägarens namn (kan skilja sig från den
 * som skapade inbjudan ursprungligen, om företaget har fler än en ägare).
 */
export const resendInvitationSchema = z.strictObject({
  businessId: uuid,
  invitationId: uuid,
  userId: uuid,
  invitedByName: displayNameSchema,
});

export type ResendInvitationInput = z.input<typeof resendInvitationSchema>;

export const revokeInvitationSchema = z.strictObject({
  businessId: uuid,
  invitationId: uuid,
  userId: uuid,
});

export type RevokeInvitationInput = z.input<typeof revokeInvitationSchema>;
