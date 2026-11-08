// Stängd beta (`INVITE_ONLY_BETA`, src/config/beta.ts): ett konto utan företag hamnar på
// /app/beta i stället för onboarding, och bara en inbjudan från en plattformsadmin (F19/WP-36)
// öppnar onboarding. Den här hjälpen skapar en sådan inbjudan direkt i den LOKALA databasen
// (samma rad som /admin/nuevo skriver, `src/server/admin/invite.ts`) — aldrig mot moln
// (hård regel 8). Samma DATABASE_URL-mönster som e2e/owner-live.spec.ts.
import { createHash, randomBytes } from "node:crypto";

import pg from "pg";

import { INVITE_ONLY_BETA } from "../../src/config/beta";

const DATABASE_URL =
  process.env.DATABASE_URL ??
  "postgresql://postgres:postgres@127.0.0.1:54322/postgres";

/** Vart /app skickar ett inloggat konto utan företag (glob för `page.waitForURL`). */
export const SIN_NEGOCIO_URL = INVITE_ONLY_BETA
  ? "**/app/beta"
  : "**/app/onboarding";

/**
 * Skapar en inbjudan att skapa ett företag för `email` och returnerar klartext-token
 * (länken är `/app/bienvenida/<token>`). Kontot måste redan finnas (`created_by` pekar
 * på det: i testet bjuder kontot "in sig själv", vilket räcker för flödet).
 */
export async function createBusinessInvitation(
  email: string,
  businessName: string,
): Promise<string> {
  // Samma token/hash som src/server/admin/token.ts (32 slumpbyte, base64url, SHA-256).
  const token = randomBytes(32).toString("base64url");
  const hash = createHash("sha256").update(token, "utf8").digest();
  const client = new pg.Client({ connectionString: DATABASE_URL });
  await client.connect();
  try {
    const r = await client.query(
      `insert into private.business_invitations (email, business_name, token_hash, created_by)
       select $1, $2, $3, u.id from auth.users u where lower(u.email) = lower($1)`,
      [email, businessName, hash],
    );
    if (r.rowCount !== 1) throw new Error(`inget konto för ${email}`);
  } finally {
    await client.end();
  }
  return token;
}
