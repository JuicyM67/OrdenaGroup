import "server-only";

import { createHash } from "node:crypto";

import { headers } from "next/headers";

import type { Queryable } from "./pool";
import { withServiceTx } from "./tx";

/**
 * Rate limiting utan extern tjänst (säkerhetsgranskning, pilotblockerare
 * WP-27): `private.hit_rate_limit()`
 * (supabase/migrations/20260930130000_rate_limits.sql) räknar försök i
 * fasta tidsfönster, i samma Postgres som allt annat.
 *
 * Nyckeln hashas HÄR (SHA-256, hex) innan den lämnar processen — ingen
 * klartext-IP/telefon/e-post når databasen eller loggarna (regel 8/Ley
 * 21.719). `scope` är ett kort, flödesspecifikt prefix (t.ex. "booking:ip",
 * "login:email") så att samma ämne (t.ex. samma IP) i två olika flöden
 * aldrig delar räknare.
 */

/** Bara SHA-256 (hex) — aldrig klartext i en logg eller i databasen. */
export function hashRateLimitSubject(subject: string): string {
  return createHash("sha256").update(subject, "utf8").digest("hex");
}

function rateLimitKey(scope: string, subject: string): string {
  return `${scope}:${hashRateLimitSubject(subject)}`;
}

export type RateLimitInput = {
  /** Kort, flödesspecifikt prefix, t.ex. "booking:ip" eller "login:email". */
  scope: string;
  /** Klartext (IP, telefon, e-post …) — hashas innan den skickas till databasen. */
  subject: string;
  windowSeconds: number;
  max: number;
};

/**
 * `true` = tillåten (under gränsen), `false` = blockerad. Öppnar sin egen
 * korta transaktion (`service_role`) om ingen `Queryable` ges — anroparen
 * kan skicka en befintlig transaktion för att slippa en extra roundtrip.
 */
export async function hitRateLimit(
  input: RateLimitInput,
  q?: Queryable,
): Promise<boolean> {
  const key = rateLimitKey(input.scope, input.subject);
  const run = async (query: Queryable): Promise<boolean> => {
    const r = await query.query<{ allowed: boolean }>(
      `select private.hit_rate_limit($1, $2::interval, $3) as allowed`,
      [key, `${input.windowSeconds} seconds`, input.max],
    );
    // `hit_rate_limit` returnerar alltid en rad — `?? true` är bara ett
    // skyddsnät mot ett oväntat tomt svar (öppnar hellre än stänger ute).
    return r.rows[0]?.allowed ?? true;
  };
  return q ? run(q) : withServiceTx(run);
}

/**
 * Anropande klients IP: första värdet i `x-forwarded-for` (Vercel/proxyn
 * sätter den, klienten kan inte skriva över den bakom proxyn). `"unknown"`
 * om headern saknas (t.ex. lokal `next dev` utan proxy) — räknas då som en
 * gemensam, delad "IP" i den lokala utvecklingsmiljön, vilket är avsiktligt
 * (bättre än att stänga av rate limiting helt lokalt).
 */
export async function getClientIp(): Promise<string> {
  const h = await headers();
  return firstForwardedIp(h.get("x-forwarded-for"));
}

/** Ren funktion (testbar utan `next/headers`): "1.2.3.4, 5.6.7.8" → "1.2.3.4". */
export function firstForwardedIp(headerValue: string | null): string {
  const first = headerValue?.split(",")[0]?.trim();
  return first && first.length > 0 ? first : "unknown";
}
