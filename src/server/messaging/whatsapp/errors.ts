import "server-only";

/**
 * Felklassning för WhatsApp Cloud API (D-063). Utkorgen behöver veta om ett
 * nytt försök kan hjälpa:
 *
 * - **permanent**: samma meddelande kommer aldrig att gå fram på WhatsApp
 *   (ogiltigt nummer, mottagaren har inte WhatsApp, mallen saknas/är pausad/
 *   avstängd eller parametrarna stämmer inte, token/behörighet fel). Utkorgen
 *   byter direkt till e-post om kunden har en (`worker.ts`).
 * - **temporary**: rate limit, Metas egna tillfälliga fel, 5xx, nätverk.
 *   Utkorgens backoff (1/5/15/60 min) försöker igen; efter sista försöket
 *   blir det e-post i stället för `dead`.
 *
 * Koderna kommer från Metas dokumentation "Cloud API Error Codes". En okänd
 * kod klassas efter HTTP-statusen (4xx = permanent, 5xx/429 = temporary).
 * `code` (det som sparas i `message_outbox.error`) är alltid en kort sträng
 * utan persondata: `wa_<metakod>`, `http_<status>` eller `wa_network`.
 */

export type WhatsAppErrorKind = "permanent" | "temporary";

const TEMPORARY_CODES: ReadonlySet<number> = new Set([
  1, // API Unknown
  2, // API Service (tillfälligt nere)
  4, // API Too Many Calls
  17, // User request limit reached
  341, // Application limit reached
  80007, // Rate limit issues (WABA)
  130429, // Rate limit hit (throughput)
  131000, // Something went wrong
  131016, // Service unavailable
  131048, // Spam rate limit hit
  131056, // (Business Account, Consumer Account) pair rate limit hit
  131057, // Account in maintenance mode
  133004, // Server temporarily unavailable
]);

const PERMANENT_CODES: ReadonlySet<number> = new Set([
  0, // AuthException
  3, // API Method (behörighet)
  10, // Permission denied
  100, // Invalid parameter (t.ex. ogiltigt nummer)
  190, // Access token expired
  200, // Permission
  368, // Temporarily blocked for policies violations
  130472, // User's number is part of an experiment
  131005, // Access denied
  131008, // Required parameter is missing
  131009, // Parameter value is not valid
  131021, // Recipient cannot be sender
  131026, // Message undeliverable (inte på WhatsApp m.m.)
  131030, // Recipient phone number not in allowed list (testnummer)
  131031, // Account has been locked
  131042, // Business eligibility payment issue
  131045, // Incorrect certificate
  131047, // Re-engagement message (24 h-fönstret)
  131049, // Meta chose not to deliver
  131050, // User stopped marketing messages
  131051, // Unsupported message type
  131052, // Media download error
  131053, // Media upload error
  132000, // Template param count mismatch
  132001, // Template does not exist
  132005, // Template hydrated text too long
  132007, // Template format character policy violated
  132012, // Template parameter format mismatch
  132015, // Template is paused
  132016, // Template is disabled
  132068, // Flow is blocked
  132069, // Flow is throttled
  133010, // Phone number not registered
]);

export function classifyWhatsAppError(input: {
  httpStatus?: number | undefined;
  code?: number | undefined;
}): { kind: WhatsAppErrorKind; code: string } {
  const { httpStatus, code } = input;
  if (typeof code === "number" && Number.isInteger(code)) {
    if (TEMPORARY_CODES.has(code))
      return { kind: "temporary", code: `wa_${code}` };
    if (PERMANENT_CODES.has(code))
      return { kind: "permanent", code: `wa_${code}` };
  }
  const label =
    typeof code === "number" && Number.isInteger(code)
      ? `wa_${code}`
      : typeof httpStatus === "number"
        ? `http_${httpStatus}`
        : "wa_unknown";
  if (httpStatus === undefined) {
    // Statuswebhooken (`failed`) har ingen HTTP-status: en okänd kod där
    // betyder att Meta redan gett upp meddelandet — e-post är bättre än
    // att försöka samma sak igen.
    return { kind: "permanent", code: label };
  }
  if (httpStatus === 429 || httpStatus >= 500) {
    return { kind: "temporary", code: label };
  }
  return { kind: "permanent", code: label };
}

/** Kastas av `sendWhatsAppTemplate`. `message` bär aldrig telefon/text. */
export class WhatsAppSendError extends Error {
  readonly kind: WhatsAppErrorKind;
  readonly code: string;

  constructor(kind: WhatsAppErrorKind, code: string) {
    super(`whatsapp: ${code}`);
    this.name = "WhatsAppSendError";
    this.kind = kind;
    this.code = code;
  }
}
