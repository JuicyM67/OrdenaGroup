import "server-only";

import { createHash, randomBytes } from "node:crypto";

/**
 * Inbjudningstoken (F19/WP-36, `private.business_invitations`): samma
 * mönster som `src/server/bookings/token.ts` (32 slumpbyte, base64url,
 * SHA-256-hash sparas — aldrig klartexten). `extensions.digest(token,
 * 'sha256')` i `accept_business_invitation` (Postgres, pgcrypto) ger samma
 * bytea som `hashInvitationToken` här (samma algoritm/kodning).
 */
export function createInvitationToken(): { token: string; hash: Buffer } {
  const token = randomBytes(32).toString("base64url");
  return { token, hash: hashInvitationToken(token) };
}

export function hashInvitationToken(token: string): Buffer {
  return createHash("sha256").update(token, "utf8").digest();
}
