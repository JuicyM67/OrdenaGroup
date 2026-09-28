// Litet klientbibliotek mot lokala Mailpit (127.0.0.1:54324, se supabase/config.toml) för
// e2e-tester av inloggningsflödet (WP-15). Bara lokalt: `npm run db:start` startar Mailpit
// som SMTP-fånge för alla mejl (magisk länk, F1).
const MAILPIT_URL = process.env.MAILPIT_URL ?? "http://127.0.0.1:54324";

type MailpitMessageSummary = {
  ID: string;
  To: { Address: string }[];
  Created: string;
};

type MailpitMessagesResponse = { messages: MailpitMessageSummary[] };

type MailpitFullMessage = { HTML: string; Text: string };

async function listMessages(): Promise<MailpitMessageSummary[]> {
  const res = await fetch(`${MAILPIT_URL}/api/v1/messages?limit=50`);
  if (!res.ok) throw new Error(`Mailpit /messages: ${res.status}`);
  const body = (await res.json()) as MailpitMessagesResponse;
  return body.messages;
}

async function fetchMessage(id: string): Promise<MailpitFullMessage> {
  const res = await fetch(`${MAILPIT_URL}/api/v1/message/${id}`);
  if (!res.ok) throw new Error(`Mailpit /message/${id}: ${res.status}`);
  return (await res.json()) as MailpitFullMessage;
}

/**
 * Väntar på det senaste mejlet till `email` (max `timeoutMs`) och läser ut
 * `/auth/confirm?token_hash=...&type=...`-länken ur HTML-kroppen
 * (supabase/templates/magic_link.html, WP-15).
 */
export async function waitForConfirmLink(
  email: string,
  opts: { timeoutMs?: number; pollMs?: number } = {},
): Promise<string> {
  const timeoutMs = opts.timeoutMs ?? 15_000;
  const pollMs = opts.pollMs ?? 500;
  const deadline = Date.now() + timeoutMs;

  for (;;) {
    const messages = await listMessages();
    const forEmail = messages
      .filter((m) => m.To.some((t) => t.Address === email))
      .sort((a, b) => b.Created.localeCompare(a.Created));
    const latest = forEmail[0];
    if (latest) {
      const full = await fetchMessage(latest.ID);
      const match = /href="([^"]*\/auth\/confirm\?[^"]+)"/.exec(full.HTML);
      if (match?.[1]) return match[1].replace(/&amp;/g, "&");
    }
    if (Date.now() > deadline) {
      throw new Error(
        `Inget mejl med /auth/confirm-länk till ${email} inom ${timeoutMs}ms`,
      );
    }
    await new Promise((r) => setTimeout(r, pollMs));
  }
}

/** Städar Mailpits inkorg (mellan tester, för deterministiska sökningar). */
export async function deleteAllMessages(): Promise<void> {
  await fetch(`${MAILPIT_URL}/api/v1/messages`, { method: "DELETE" });
}
