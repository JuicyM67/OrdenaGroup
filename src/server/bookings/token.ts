import "server-only";

import { createHash, randomBytes } from "node:crypto";

/**
 * Kundens länk-token (FRÅGA 9, WP-01 FRÅGA 6): 32 slumpbyte som base64url
 * (43 tecken). Bara SHA-256 (32 byte) sparas i `manage_token_hash`.
 * Klartexten returneras en gång och loggas aldrig.
 */
export function createManageToken(): { token: string; hash: Buffer } {
  const token = randomBytes(32).toString("base64url");
  return { token, hash: hashManageToken(token) };
}

export function hashManageToken(token: string): Buffer {
  return createHash("sha256").update(token, "utf8").digest();
}
