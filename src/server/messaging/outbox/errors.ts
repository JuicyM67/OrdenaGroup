import "server-only";

/**
 * Fel som workern kastar internt för fall utan ett SQLSTATE (t.ex. adressen
 * saknas eller mallen är okänd). `code` är alltid en kort, stabil sträng
 * utan persondata — det som hamnar i `message_outbox.error` (regel hård 8).
 */
export class OutboxSendError extends Error {
  readonly code: string;

  constructor(code: string) {
    super(`outbox: ${code}`);
    this.name = "OutboxSendError";
    this.code = code;
  }
}

/** Ett fel där fler försök inte hjälper (D-063: permanent WhatsApp-fel och
 * kunden saknar e-post att falla tillbaka på) → raden blir `dead` direkt. */
export class OutboxFinalError extends OutboxSendError {
  constructor(code: string) {
    super(code);
    this.name = "OutboxFinalError";
  }
}
