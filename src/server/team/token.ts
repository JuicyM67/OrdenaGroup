import "server-only";

import { createHash, randomBytes } from "node:crypto";

/**
 * Inbjudningens länk-token (WP-46 steg 4, D-034): 32 slumpbyte som
 * base64url (43 tecken) — samma form som `src/server/bookings/token.ts`s
 * `createManageToken` (FRÅGA 9/WP-01 FRÅGA 6). Bara SHA-256 (32 byte) sparas
 * i `member_invitations.token_hash`; klartexten returneras en gång (köas i
 * `message_outbox.payload`, D-029) och loggas aldrig.
 *
 * Hashalgoritmen MÅSTE matcha `public.accept_invitation(token)`
 * (supabase/migrations/20260930150400_accept_invitation.sql):
 * `extensions.digest(token, 'sha256')`, dvs SHA-256 av UTF-8-bytena i
 * token-strängen — samma som `createHash("sha256").update(token, "utf8")`
 * här (token är ren ASCII/base64url, så UTF-8-kodningen är entydig).
 */
export function createInvitationToken(): { token: string; hash: Buffer } {
  const token = randomBytes(32).toString("base64url");
  return { token, hash: hashInvitationToken(token) };
}

export function hashInvitationToken(token: string): Buffer {
  return createHash("sha256").update(token, "utf8").digest();
}
