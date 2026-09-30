/**
 * Svenska texter för inloggningen (marknad SE, D-026). Samma form som `acceso` och
 * `comun.algoSalioMal` i `es-CL.ts`; valet per marknad görs i `auth.ts`.
 */
import type {
  acceso as AccesoEs,
  invitacionNegocio as InvitacionEs,
} from "./es-CL";

type Widen<T> = T extends string
  ? string
  : T extends (...args: infer A) => infer R
    ? (...args: A) => Widen<R>
    : T extends object
      ? { readonly [K in keyof T]: Widen<T[K]> }
      : T;

export type AccesoCopy = Widen<typeof AccesoEs>;

export const acceso: AccesoCopy = {
  login: {
    titulo: "Logga in",
    emailLabel: "E-post",
    emailPlaceholder: "du@exempel.se",
    cta: "Skicka länken till mig",
    enviando: "Skickar…",
    sinContrasena: "Du behöver inget lösenord.",
    cuentaNueva: "Är det första gången skapar vi ditt konto direkt.",
  },
  enviado: {
    titulo: "Kolla din e-post",
    enviadoA: (p: { email: string }): string =>
      `Vi har skickat en länk till ${p.email}.`,
    codigoLabel: "Eller skriv in den sexsiffriga koden",
    reenviarEn: (p: { segundos: number }): string =>
      `Skicka igen om ${p.segundos} s`,
    reenviar: "Skicka igen",
    usarOtroCorreo: "Använd en annan e-post",
  },
  errores: {
    invalid_email: "Skriv en giltig e-postadress.",
    otp_expired: "Länken eller koden har gått ut. Be om en ny.",
    invalid_otp: "Koden stämmer inte. Kontrollera den eller be om en ny.",
    over_email_send_rate_limit: "Vänta en minut innan du ber om en ny länk.",
    pkce_mismatch:
      "Öppna länken i samma webbläsare som du bad om den i, eller använd koden.",
    captcha_failed:
      "Vi kunde inte verifiera att du är en människa. Försök igen.",
    session_expired: "Din session har gått ut. Logga in igen.",
    network:
      "Vi kunde inte ansluta. Kontrollera uppkopplingen och försök igen.",
  },
  sesionCerrada: "Du har loggat ut.",
};

export const algoSalioMal = "Något gick fel. Försök igen.";

type InvitacionCopy = Widen<typeof InvitacionEs>;

/** `/app/bienvenida/[token]` (F19/WP-36), se `es-CL.ts`. */
export const invitacionNegocio: InvitacionCopy = {
  titulo: "Slutför din registrering",
  cargando: "Bekräftar din inbjudan…",
  continuarCta: "Fortsätt med min e-post",
  enviando: "Skickar…",
  enviado: (p: { email: string }): string =>
    `Vi har skickat en länk till ${p.email}. Öppna den för att fortsätta.`,
  errores: {
    not_found: "Vi hittade inte den inbjudan.",
    accepted: "Den inbjudan är redan använd.",
    expired: "Den inbjudan har gått ut. Be om en ny.",
    email_mismatch:
      "Den inbjudan gäller ett annat konto. Logga in med e-postadressen den skickades till.",
    network: "Vi kunde inte ansluta. Försök igen.",
  },
};
