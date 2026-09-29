import "server-only";

import { after } from "next/server";

import { processOutbox } from "./worker";

/** Litet pass direkt efter en bokningshändelse: tar upp till 10 förfallna rader (vilka som
 * helst, inte bara den här bokningens); resten tas av cron. */
const KICK_LIMIT = 10;

/**
 * Triggar ett workerpass direkt efter svaret (regel hård 4 / D-030):
 * bekräftelsen går ut inom 1 min utan att vänta på GitHub Actions-cronen.
 * `after()` kastar om den anropas utanför en request (t.ex. ett skript eller
 * en bakgrundsjobb-kontext) — `kickOutbox` sväljer det och gör ingenting;
 * nästa cron-pass (var 5:e minut) tar hand om raden ändå.
 */
export async function kickOutbox(): Promise<void> {
  try {
    after(() => {
      processOutbox({ limit: KICK_LIMIT }).catch(() => undefined);
    });
  } catch {
    // Utanför en request: se kommentaren ovan.
  }
}
