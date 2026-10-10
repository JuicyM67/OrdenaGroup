/** Kundkonton (WP-67, D-054), svenska. Samma form som `es-CL.cuenta.ts`. */
import type { cuenta as EsCuenta } from "./es-CL.cuenta";

type Widen<T> = T extends string
  ? string
  : T extends number
    ? number
    : T extends boolean
      ? boolean
      : T extends (...args: infer A) => infer R
        ? (...args: A) => Widen<R>
        : T extends readonly (infer U)[]
          ? readonly Widen<U>[]
          : T extends object
            ? { readonly [K in keyof T]: Widen<T[K]> }
            : T;

export const cuenta: Widen<typeof EsCuenta> = {
  meta: {
    perfil: "Min profil",
    ingresar: "Skapa konto",
    reservas: "Mina bokningar",
    favoritos: "Favoriter",
    privacidad: "Integritet",
    resena: "Lämna recension",
  },
  ingresar: {
    cerrar: "Stäng",
    titulo: "Skapa konto.",
    destacado: "Gratis.",
    texto: "Alla dina bokningar och favoritsalonger på ett ställe.",
    beneficios: {
      gestionar: "Avboka själv",
      historial: "Din bokningshistorik",
      favoritos: "Spara favoriter",
      resenas: "Betygsätt dina besök",
    },
    google: "Fortsätt med Google",
    separador: "eller med e-post",
    emailLabel: "E-post",
    emailPlaceholder: "namn@exempel.se",
    marketing: "Tipsa mig om erbjudanden nära mig (valfritt)",
    cta: "Skicka inloggningslänk",
    enviando: "Skickar…",
    legalAntes: "Inget lösenord behövs. Genom att fortsätta godkänner du ",
    legalTerminos: "villkoren",
    legalY: " och ",
    legalPrivacidad: "integritetspolicyn",
    legalDespues: ".",
    negocio: "Har du ett företag? Logga in här",
    googleError: "Det gick inte att logga in med Google. Prova med e-post.",
  },
  enviado: {
    titulo: "Kolla din inkorg",
    texto: (p) =>
      `Vi har skickat en länk till ${p.email}. Öppna den i samma webbläsare.`,
    otroCorreo: "Använd en annan e-post",
  },
  nav: {
    aria: "Huvudmeny",
    reservas: "Bokningar",
    perfil: "Profil",
    favoritos: "Favoriter",
  },
  perfil: {
    hola: (p) => `Hej ${p.nombre}!`,
    holaSinNombre: "Hej!",
    subtitulo: (p) => p.email,
    proxima: "Nästa bokning",
    verReserva: "Hantera",
    comoLlegar: "Vägbeskrivning",
    sinReservasTitulo: "Inga bokningar än",
    sinReservasTexto:
      "När du bokar med den här e-posten hos ett företag som använder oss dyker tiderna upp här.",
    resenaPregunta: (p) => `Hur var ${p.servicio} på ${p.negocio}?`,
    resenaTexto: "Betygsätt ditt besök – det tar 20 sekunder",
    favoritosTitulo: "Favoriter",
    favoritosVacio:
      "Tryck på hjärtat på ett företags sida för att spara det här.",
    verTodos: "Alla",
    menuAria: "Konto",
    menuReservas: "Bokningshistorik",
    menuFavoritos: "Mina favoriter",
    menuPrivacidad: "Integritet: exportera eller radera",
    cerrarSesion: "Logga ut",
    negocio: "Har du ett företag? Till din kalender",
  },
  estados: {
    requested: "Väntar på bekräftelse",
    pending_payment: "Väntar på betalning",
    confirmed: "Bekräftad",
    completed: "Genomförd",
    no_show: "Uteblev",
    cancelled: "Avbokad",
    cancel_requested: "Avbokning begärd",
    pagada: "Betald",
    reservada: "Kortet reserverat",
    reembolso: "Återbetald",
  },
  reservas: {
    titulo: "Mina bokningar",
    proximas: "Kommande",
    anteriores: "Tidigare",
    vacioProximas: "Du har inga kommande tider.",
    vacioAnteriores: "Inga tidigare besök än.",
    conProfesional: (p) => `med ${p.profesional}`,
    cancelar: "Avboka",
    solicitarCancelacion: "Begär avbokning",
    confirmarCancelar: "Säker? Det går inte att ångra.",
    confirmarSi: "Ja, avboka",
    confirmarNo: "Nej, tillbaka",
    cancelada: "Klart, tiden är avbokad.",
    solicitada: "Vi har bett företaget avboka tiden. Du får besked.",
    fueraDePlazo: (p) =>
      `Du kan avboka fram till ${p.horas} h innan. Kontakta företaget.`,
    errorCancelar: "Det gick inte att avboka. Försök igen.",
    dejarResena: "Lämna recension",
    editarResena: "Ändra recension",
    tuResena: (p) => `Ditt betyg: ${p.n} av 5`,
    reservarOtraVez: "Boka igen",
  },
  favoritos: {
    titulo: "Favoriter",
    vacio:
      "Du har inte sparat något företag än. Tryck på hjärtat på deras sida.",
    quitar: "Ta bort",
    guardar: "Spara som favorit",
    guardado: "Sparad som favorit",
    resenas: (p) =>
      `★ ${p.promedio} · ${p.n} ${p.n === 1 ? "recension" : "recensioner"}`,
  },
  resena: {
    titulo: "Hur var ditt besök?",
    verificada: "Verifierad",
    conProfesional: (p) => `med ${p.profesional} · ${p.fecha}`,
    cerrada:
      "Det har gått mer än 7 dagar sedan din recension, så den kan inte ändras. Tack för ditt omdöme!",
    volver: "Tillbaka till min profil",
  },
  privacidad: {
    titulo: "Integritet",
    texto:
      "Ditt konto är ditt. Ladda ner dina uppgifter eller radera kontot när du vill.",
    marketingTitulo: "Erbjudanden nära dig",
    marketingTexto:
      "Vi hör bara av oss om du säger ja. Du kan ändra dig när som helst.",
    marketingLabel: "Jag vill få erbjudanden via e-post",
    marketingGuardar: "Spara",
    marketingGuardado: "Klart, vi har sparat ditt val.",
    exportarTitulo: "Ladda ner mina uppgifter",
    exportarTexto:
      "En JSON-fil med ditt konto, dina bokningar, favoriter, recensioner och samtycken.",
    exportarCta: "Ladda ner",
    eliminarTitulo: "Radera mitt konto",
    eliminarTexto:
      "Vi raderar ditt konto, dina favoriter och kopplingen till dina bokningar. Dina recensioner blir kvar utan ditt namn. Uppgifterna som varje företag har om dig ansvarar företaget för – be dem direkt om du vill att de raderas.",
    eliminarLabel: (p) => `Skriv ${p.palabra} för att bekräfta`,
    palabra: "RADERA",
    eliminarCta: "Radera mitt konto",
    eliminarError: "Skriv ordet exakt som det står.",
    eliminada: "Ditt konto är raderat.",
    eliminadaNegocio:
      "Ditt kundkonto är raderat. Din inloggning till företagets kalender finns kvar.",
    volverInicio: "Till startsidan",
  },
};
