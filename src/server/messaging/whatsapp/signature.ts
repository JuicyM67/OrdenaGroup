import "server-only";

import { createHmac, timingSafeEqual } from "node:crypto";

/**
 * Metas webhook-signatur (D-063, regel 4): `X-Hub-Signature-256:
 * sha256=<hex>` = HMAC-SHA256 över den RÅA bodyn med appens hemlighet
 * (`WHATSAPP_APP_SECRET`). Måste kontrolleras innan bodyn parsas.
 * Jämförelsen tar konstant tid (även vid fel längd).
 */
const PREFIX = "sha256=";

export function computeWhatsAppSignature(
  rawBody: Uint8Array | string,
  secret: string,
): string {
  return `${PREFIX}${createHmac("sha256", secret).update(rawBody).digest("hex")}`;
}

export function verifyWhatsAppSignature(
  rawBody: Uint8Array | string,
  header: string | null | undefined,
  secret: string,
): boolean {
  if (!secret || typeof header !== "string") return false;
  const given = header.trim().toLowerCase();
  if (!given.startsWith(PREFIX)) return false;
  const expected = Buffer.from(computeWhatsAppSignature(rawBody, secret));
  const actual = Buffer.from(given);
  if (actual.length !== expected.length) {
    timingSafeEqual(expected, expected);
    return false;
  }
  return timingSafeEqual(actual, expected);
}

/** `hub.verify_token` i GET-verifieringen, konstant tid. */
export function safeTokenEqual(a: string, b: string): boolean {
  const bufA = Buffer.from(a);
  const bufB = Buffer.from(b);
  if (bufA.length !== bufB.length) {
    timingSafeEqual(bufA, bufA);
    return false;
  }
  return timingSafeEqual(bufA, bufB);
}
