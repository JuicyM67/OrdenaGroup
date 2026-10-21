// D-063 (WP-16): WhatsApp Cloud API-webhooken (Meta).
//
// GET  = Metas verifiering när webhooken registreras: `hub.mode=subscribe`
//        + `hub.verify_token` (jämförs i konstant tid mot
//        WHATSAPP_VERIFY_TOKEN) → `hub.challenge` som ren text, annars 403.
// POST = händelser (statusar, knappsvar, inkommande meddelanden). Signaturen
//        `X-Hub-Signature-256` kontrolleras över den RÅA bodyn med
//        WHATSAPP_APP_SECRET innan något parsas (regel 4). Idempotens via
//        `inbound_events`, se `src/server/messaging/whatsapp/webhook.ts`.
//        Fel → 500 så att Meta skickar om (hanteringen är idempotent).
//
// Loggar bara räknare och SQLSTATE — aldrig telefonnummer, namn, text eller
// hemligheter (regel 7).
import { NextResponse, type NextRequest } from "next/server";

import { pgErrorCode } from "@/server/db/errors";
import { kickOutbox } from "@/server/messaging/outbox";
import {
  safeTokenEqual,
  verifyWhatsAppSignature,
} from "@/server/messaging/whatsapp/signature";
import { processWhatsAppWebhook } from "@/server/messaging/whatsapp/webhook";
import { systemClock } from "@/server/scheduling/clock";

export const dynamic = "force-dynamic";

/** Meta skickar små JSON-kroppar; allt större är inte från Meta. */
const MAX_BODY_BYTES = 1024 * 1024;

export async function GET(request: NextRequest): Promise<NextResponse> {
  const expected = process.env.WHATSAPP_VERIFY_TOKEN ?? "";
  const params = request.nextUrl.searchParams;
  const mode = params.get("hub.mode");
  const token = params.get("hub.verify_token") ?? "";
  const challenge = params.get("hub.challenge") ?? "";
  if (
    expected === "" ||
    mode !== "subscribe" ||
    !safeTokenEqual(token, expected) ||
    !/^[A-Za-z0-9_-]{1,128}$/.test(challenge)
  ) {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }
  return new NextResponse(challenge, {
    status: 200,
    headers: { "Content-Type": "text/plain; charset=utf-8" },
  });
}

export async function POST(request: NextRequest): Promise<NextResponse> {
  const secret = process.env.WHATSAPP_APP_SECRET ?? "";
  if (secret === "") {
    return NextResponse.json({ error: "not_configured" }, { status: 503 });
  }
  const signature = request.headers.get("x-hub-signature-256");
  if (!signature) {
    return NextResponse.json({ error: "missing_signature" }, { status: 401 });
  }
  // Säkerhetsgranskning: avvisa en uppenbart för stor body innan den läses.
  const declared = Number(request.headers.get("content-length") ?? "0");
  if (Number.isFinite(declared) && declared > MAX_BODY_BYTES) {
    return NextResponse.json({ error: "too_large" }, { status: 413 });
  }
  // Rå body (bytes): signaturen gäller exakt det Meta skickade.
  const raw = new Uint8Array(await request.arrayBuffer());
  if (raw.byteLength > MAX_BODY_BYTES) {
    return NextResponse.json({ error: "too_large" }, { status: 413 });
  }
  if (!verifyWhatsAppSignature(raw, signature, secret)) {
    return NextResponse.json({ error: "invalid_signature" }, { status: 401 });
  }
  let body: unknown;
  try {
    body = JSON.parse(new TextDecoder().decode(raw));
  } catch {
    // Signerad men inte JSON: inget att göra igen — 200 så att Meta inte
    // skickar om samma sak i en vecka.
    return NextResponse.json({ received: true, ignored: 1 });
  }
  try {
    const result = await processWhatsAppWebhook(body, systemClock());
    if (result.queued) void kickOutbox();
    console.log("whatsapp webhook: hanterad", {
      handled: result.handled,
      duplicates: result.duplicates,
      ignored: result.ignored,
    });
    return NextResponse.json({ received: true, ...result });
  } catch (e) {
    console.error("whatsapp webhook: hantering misslyckades", {
      code: pgErrorCode(e) ?? "unknown",
    });
    return NextResponse.json({ error: "processing_failed" }, { status: 500 });
  }
}
