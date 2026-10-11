/**
 * Alla produkttexter på svenska (marknad SE, D-025/D-026/D-027/D-028).
 * Samma exporter, samma nycklar och samma funktionssignaturer som
 * `es-CL.ts` (kontrolleras av `_check` längst ner i den här filen och av
 * `sv-SE.app.test.ts`).
 *
 * Skillnader mot es-CL som inte är bara översättning:
 * - Kanal: SMS/e-post i stället för WhatsApp (D-028). Nycklarna som heter
 *   `*Whatsapp*` eller `plantillasWhatsapp`/`whatsappSesion` finns kvar av
 *   typskäl (samma form som es-CL), men texten nämner aldrig "WhatsApp" och
 *   `plantillasWhatsapp` har inga knappar (SMS har ingen quick-reply).
 * - Inga kundbetalningar i SE (D-027): `abono`/`caja`-nycklarna finns av
 *   typskäl men texten är neutral, utan namnge en specifik betaltjänst.
 * - Telefon: svenskt mobilnummer i stället för chilenskt (070-123 45 67).
 * - Pengar: "kr" (beloppet i sig kommer redan formaterat utifrån, se
 *   `src/lib/format/`, som ägs av scheduling-engineer).
 * - RUT → organisationsnummer. Kinesiología → naprapat/fysioterapi.
 *
 * Namnet på produkten skrivs aldrig här (hård regel 10, kontrolleras av
 * `sv-SE.app.test.ts` mot `allBrandNames`): till skillnad från `es-CL.ts`
 * importerar den här filen inte `brand` och lånar aldrig in `brand.name` i en
 * sträng (varken direkt eller via en funktion som stänger över importen).
 * Det enda stället där `es-CL.ts` fortfarande skriver `brand.name` direkt är
 * `reserva.meta.vendidoPor`, som här är generiskt i stället. Ämnesraden i
 * `email.acceso.magicLink`/`confirmation` tar numera emot `marca` som
 * parameter i båda filerna (copywriter-es-cl, samma form överallt i appen),
 * så den behöver ingen egen lösning här.
 */
import type * as Es from "./es-CL";
import { CTA_BOKA, numeroEntero, type Widen } from "./sv-SE.compartido";
import type * as Sv from "./sv-SE.app";

// Texterna för företagets app och meddelandena: `sv-SE.panel.ts`
// (JS-budgeten för `/[slug]`, D-039). Samma exporter och namn som tidigare.
export {
  nav,
  estados,
  calendario,
  gestion,
  inicio,
  agenda,
  hoy,
  plantillasWhatsapp,
  whatsappSesion,
  email,
  validacion,
  acceso,
  invitacionNegocio,
  negocio,
  onboarding,
  servicios,
  profesionales,
  horarios,
  ajustes,
  clientes,
  campanas,
  CAJA_METODOS_MANUALES,
  caja,
  abono,
  sms,
  perfil,
  solicitudes,
  equipo,
  invitacion,
  redesSociales,
  baja,
  flashStory,
  flash,
  vOferta,
  uxTextos,
  resenas,
  importar,
  planes,
} from "./sv-SE.panel";
export type {
  VariablePlantilla,
  BotonPlantilla,
  Plantilla,
} from "./sv-SE.panel";
export { cuenta } from "./sv-SE.cuenta";
export { descubre } from "./sv-SE.descubre";
export { paraClientes } from "./sv-SE.clientes";
export { ofertas } from "./sv-SE.ofertas";
export { smsCreditos } from "./sv-SE.sms-creditos";
export { suscripcion } from "./sv-SE.suscripcion";
export { vales } from "./sv-SE.vales";
export { regalo } from "./sv-SE.regalo";
export { visita } from "./sv-SE.visita";

// ---------------------------------------------------------------------------
// comun
// ---------------------------------------------------------------------------

export const comun: Widen<typeof Es.comun> = {
  cargando: "Laddar…",
  sinConexion: "Du är offline. Kontrollera din uppkoppling.",
  algoSalioMal: "Något gick fel. Försök igen.",
  reintentar: "Försök igen",
  editar: "Redigera",
  volver: "Tillbaka",
  noMantener: "Nej, behåll",
  cancelarReserva: "Avboka tiden",
  guardar: "Spara",
  cerrar: "Stäng",
  confirmar: "Bekräfta",
  deshacer: "Ångra",
  visita: (p: { n: number }): string => `Besök ${p.n}`,
};

// ---------------------------------------------------------------------------
// errores
// ---------------------------------------------------------------------------

export const errores: Widen<typeof Es.errores> = {
  reserva: {
    slot_taken: "Någon tog just den tiden, välj en annan.",
    too_soon:
      "Det är för nära inpå för att boka den här tiden, välj en tid längre fram.",
    too_far: "Du kan inte boka så långt fram just nu, välj ett närmare datum.",
    service_not_offered: "Den tjänsten finns inte längre. Välj en annan.",
    not_found: "Vi hittade inte den bokningen.",
    invalid_status: "Den bokningen går inte att ändra längre.",
    outside_cancel_window:
      "Tiden för att avboka eller ändra utan kostnad har gått ut.",
    invalid_input: "Kontrollera uppgifterna och försök igen.",
    business_unavailable: "Det här företaget tar inte emot bokningar just nu.",
    outside_hours: "Den tiden är inte längre tillgänglig.",
    network:
      "Vi kunde inte ansluta. Kontrollera din uppkoppling och försök igen.",
    waitlist_duplicate: "Du står redan på väntelistan för den här dagen.",
    rate_limited: "För många försök. Försök igen om en stund.",
    payment_unavailable:
      "Vi kunde inte starta betalningen. Din bokning gjordes inte, försök igen.",
    nombreVacio: "Skriv ditt namn.",
    emailInvalido: "Kontrollera din e-postadress.",
    consentimientoRequerido: "Godkänn villkoren för att fortsätta.",
    telefono: {
      empty: "Skriv ditt telefonnummer.",
      invalid_chars: "Använd bara siffror, till exempel 070-123 45 67.",
      not_chilean: "Just nu tar vi bara emot svenska mobilnummer.",
      wrong_country: "Skriv ett svenskt mobilnummer.",
      invalid_length:
        "Ett svenskt mobilnummer har 10 siffror och börjar på 07. Kontrollera numret.",
      not_mobile: "Skriv ett svenskt mobilnummer, till exempel 070-123 45 67.",
      invalid_prefix: "Det numret är inte giltigt. Kontrollera riktnumret.",
    },
  },
  agenda: {
    slot_taken: "Den tiden är redan upptagen. Välj en annan.",
    outside_hours: "Den tiden ligger utanför öppettiderna.",
    too_soon: "Det är för nära inpå för att boka den tiden.",
    too_far: "Det datumet ligger utanför tillåtet intervall.",
    service_not_offered: "Den medarbetaren utför inte den här tjänsten.",
    not_found: "Den bokningen finns inte längre.",
    invalid_status: "Den bokningen går inte att ändra längre.",
    outside_cancel_window:
      "Tiden för att avboka eller ändra den här bokningen har gått ut.",
    invalid_input: "Kontrollera uppgifterna och försök igen.",
    business_unavailable:
      "Det går inte att skapa eller flytta bokningar just nu.",
    network:
      "Vi kunde inte ansluta. Kontrollera din uppkoppling och försök igen.",
  },
  permiso: {
    generico: "Du har inte behörighet att göra det här.",
    accion: (p: { accion: string }): string =>
      `Du har inte behörighet att ${p.accion}.`,
    redirigido:
      "Du har inte behörighet att se den sidan. Vi tar dig till din kalender.",
  },
};

// ---------------------------------------------------------------------------
// reserva
// ---------------------------------------------------------------------------

const TERMINOS_LISTA_ESPERA_SV = "Jag vill få ett sms om en tid blir ledig.";

export const reserva: Widen<typeof Es.reserva> = {
  meta: {
    titulo: (p: { negocio: string }): string => `Boka tid hos ${p.negocio}`,
    vendidoPor: (p: { negocio: string }): string =>
      `Bokningen hanteras digitalt åt ${p.negocio}.`,
  },
  header: {
    confirmacionWhatsapp: "Bekräftelse via sms",
    horario: (p: { dias: string; rango: string }): string =>
      `${p.dias} · ${p.rango}`,
    ubicacion: (p: { comuna: string }): string => `${p.comuna}`,
  },
  pasos: {
    servicio: "1 · Välj tjänst",
    profesional: "2 · Med vem?",
    cualquiera: "Vem som helst",
    diaYHora: "3 · Dag och tid",
  },
  dia: {
    llenoOculto: "Fullbokad dag",
    flashOculto: "Har blixttid",
  },
  horaAria: (p: { hora: string }): string => `Välj tiden ${p.hora}`,
  descuento: (p: { porcentaje: number }): string => `−${p.porcentaje}%`,
  precioAnteriorAria: (p: { precio: string }): string =>
    `Pris före rabatt: ${p.precio}`,
  waitlist: {
    diaLleno: (p: { dia: string }): string => `${p.dia} är fullbokad`,
    cuerpo:
      "Gå med i väntelistan. Om någon avbokar hör vi av oss med sms, och tiden är din med en knapptryckning.",
    listo: "Klart, du står på listan",
    ctaAvisame: "Meddela mig",
    ctaUnirme: "Gå med i listan",
    ctaEnLaLista: "På listan",
    confirmacion: (p: { servicio: string; dia: string }): string =>
      `Du står på väntelistan för ${p.servicio} den ${p.dia}.`,
    terminos: TERMINOS_LISTA_ESPERA_SV,
    consentimientoVersion: "vantelista-2026-10-v1",
  },
  terminosListaEspera: TERMINOS_LISTA_ESPERA_SV,
  resumen: {
    conProfesional: (p: {
      servicio: string;
      dia: string;
      hora: string;
      profesional: string;
    }): string => `${p.servicio} · ${p.dia}, ${p.hora} · ${p.profesional}`,
    sinProfesional: (p: {
      servicio: string;
      dia: string;
      hora: string;
    }): string => `${p.servicio} · ${p.dia}, ${p.hora}`,
    listaEspera: (p: { servicio: string; dia: string }): string =>
      `${p.servicio} · ${p.dia} · väntelista`,
  },
  bookingBar: {
    ctaReservar: CTA_BOKA,
    ctaReservado: "Bokat!",
    ctaSolicitudEnviada: "Förfrågan skickad!",
  },
  clienteForm: {
    titulo: "Dina uppgifter",
    nombreLabel: "Namn",
    nombrePlaceholder: "Ditt namn",
    telefonoLabel: "Mobilnummer",
    telefonoPlaceholder: "070-123 45 67",
    emailLabel: "E-post (valfritt)",
    emailAyuda: "Vi frågar ifall sms:et inte skulle nå fram.",
    emailPlaceholder: "dinepost@exempel.se",
  },
  pago: {
    opcionalLabel: "Betala nu med kort",
    opcionalAyuda: "Du betalar säkert hos Stripe. Annars betalar du på plats.",
    obligatorioAviso:
      "För att boka den här tiden betalar du med kort. När du skickar tar vi dig till betalningssidan.",
    reservadoAviso:
      "Beloppet reserveras på ditt kort och dras när företaget bekräftar din tid. Om de inte bekräftar dras ingenting.",
    okAviso:
      "Klart, vi har tagit emot din betalning. Du får bekräftelsen i ett mejl.",
    canceladoAviso:
      "Ingen betalning gjordes. Din förfrågan är skickad och du betalar på plats.",
    liberadaAviso:
      "Ingen betalning gjordes, så tiden är ledig igen. Du kan boka på nytt.",
  },
  antesDeConfirmar: {
    politicaCancelacion: (p: { horas: number }): string =>
      `Du kan avboka eller ändra tiden fram till ${p.horas} h innan, utan kostnad.`,
    avisoWhatsapp: (p: { negocio: string }): string =>
      `Vi skickar bekräftelsen och en påminnelse om din tid hos ${p.negocio} via sms till det här numret.`,
    avisoWhatsappSolicitud: (p: { negocio: string }): string =>
      `Om din tid blir väntande mejlar vi dig; när ${p.negocio} bekräftar den får du bekräftelsen och påminnelsen via sms.`,
    ctaConfirmar: "Bekräfta bokning",
    ctaEnviarSolicitud: "Skicka förfrågan",
  },
  consentimientos: {
    version: "2026-10-v1",
    terminos:
      "Jag godkänner bokningsvillkoren och avbokningsreglerna, och att få bekräftelsen och påminnelser om den här tiden via sms.",
    terminosLinkTexto: "bokningsvillkoren",
    politicaLinkTexto: "avbokningsreglerna",
    privacidadLinkTexto: "integritetspolicyn",
    responsable: (p: { negocio: string }): string =>
      `${p.negocio} ansvarar för dina uppgifter; plattformen behandlar dem på uppdrag av företaget.`,
    marketing: (p: { negocio: string }): string =>
      `Jag vill få erbjudanden och nyheter från ${p.negocio} via sms. Jag kan svara STOPP när jag vill.`,
  },
  confirmacion: {
    titulo: "Klart, din tid är bokad!",
    resumenTitulo: "Sammanfattning av din bokning",
    avisoWhatsapp: "Vi har skickat bekräftelsen via sms.",
    descuentoSocio: (p: { descuento: string }): string =>
      `Medlemsrabatt: −${p.descuento}`,
    descuentoOferta: (p: { descuento: string }): string =>
      `Rabatt via erbjudande: −${p.descuento}`,
    verMiReserva: "Se min bokning",
  },
  oferta: {
    aviso: (p: { pct: number }): string => `${p.pct} % rabatt via erbjudande`,
  },
  confirmacionSolicitud: {
    titulo: "Förfrågan skickad!",
    resumenTitulo: "Sammanfattning av din förfrågan",
    aviso: (p: { negocio: string }): string =>
      `Vi mejlar dig när ${p.negocio} bekräftar din tid.`,
    verMiSolicitud: "Se min förfrågan",
  },
  vacios: {
    eligeServicio: "Välj en tjänst för att se lediga tider.",
    cargandoHorarios: "Söker lediga tider…",
    sinHorariosEseDia: "Inga lediga tider den dagen. Välj en annan.",
    sinHorariosEnRango: "Inga lediga tider de närmaste dagarna.",
    sinServicios: "Det här företaget har inte lagt in några tjänster än.",
    negocioNoDisponible: "Det här företaget tar inte emot bokningar just nu.",
    paginaNoExiste: "Vi hittade inte den här bokningssidan.",
  },
};

// ---------------------------------------------------------------------------
// formulario: tjänstekategorier och frågor i bokningsformuläret (WP-40,
// D-031). Samma nycklar som `Es.formulario`; texten är hämtad direkt ur
// designutkasten (`.visual-diff/ref/falt-A-bokningsformular.html`,
// `falt-B-per-tjanst.html`, `falt-kategorier.html`) där de finns, eftersom
// de utkasten redan är på svenska.
// ---------------------------------------------------------------------------

export const formulario: Widen<typeof Es.formulario> = {
  sinPreguntas: "Du har inte lagt till några frågor än.",
  candado: {
    titulo: "Namn, telefon, e-post",
    ayuda: "Alltid med i formuläret.",
    etiqueta: "Låst",
  },
  preguntasContador: (p: { n: number; max: number }): string =>
    `Frågor till kunden · ${p.n} av ${p.max}`,
  sugerencias: {
    titulo: (p: { bransch: string }): string => `Förslag för ${p.bransch}`,
    cuerpo: (p: { n: number }): string =>
      `${p.n} ${p.n === 1 ? "vanlig fråga" : "vanliga frågor"} du kan slå på. Du bestämmer vilka.`,
    ctaVer: "Visa förslag",
    ctaOcultar: "Dölj förslag",
  },
  ctaNuevaPregunta: "+ Ny fråga",
  tipos: {
    short_text: "Kort text",
    long_text: "Lång text",
    single_choice: "Val i lista",
    multi_choice: "Flera val",
    number: "Siffra",
    yes_no: "Ja/nej",
    date: "Datum",
  },
  obligatoria: "Obligatorisk",
  opcional: "Valfri",
  todosLosServicios: "Alla tjänster",
  guardaEnFicha: "Sparas på kundkortet",
  preview: {
    titulo: (p: { servicio: string }): string =>
      `Så ser kunden det · ${p.servicio}`,
  },
  categorias: {
    titulo: "Kategorier",
    ctaNueva: "+ Ny kategori",
    nameLabel: "Kategorins namn",
    namePlaceholder: "T.ex: Dam",
    ayuda:
      "Dra för att ändra ordning. Kategorierna syns som flikar för kunden.",
    vacia: "Har inga tjänster än.",
    sinAsignar: "Utan kategori",
    ctaRenombrar: "Byt namn",
    ctaEliminar: "Ta bort kategori",
    confirmarEliminar: {
      titulo: "Ta bort den här kategorin?",
      cuerpo:
        "Tjänsterna blir utan kategori. Du kan ge dem en annan när du vill.",
      ctaSi: "Ja, ta bort",
      ctaNo: comun.noMantener,
    },
    pestanaTodas: "Alla",
  },
  servicioPregunta: {
    pestanaDetalles: "Tid och pris",
    sinPreguntas: "Tjänsten har inga frågor än.",
    sinMasSugerencias: "Inga fler förslag för den här tjänsten.",
    pestana: "Frågor vid bokning",
    ctaDesdeSugerencias: (p: { bransch: string }): string =>
      `+ Från förslag för ${p.bransch}`,
    ctaPreguntaPropia: "+ Egen fråga",
    tambienUsadaEn: (p: { servicios: string }): string =>
      `används även i ${p.servicios}`,
    usarEnOtrosServicios: "Använd frågan även i andra tjänster",
    ctaQuitar: "Ta bort",
  },
  aplicaA: {
    titulo: "Gäller för",
    todos: "Alla tjänster",
    elegidos: "Valda tjänster",
    buscarPlaceholder: "Sök tjänst",
    todaLaCategoria: (p: { nombre: string }): string =>
      `Hela kategorin ${p.nombre}`,
    seleccion: (p: { x: number; y: number }): string => `${p.x} av ${p.y}`,
    autoNuevosServicios:
      "Lägg till automatiskt på nya tjänster i valda kategorier.",
    ctaGuardar: (p: { n: number }): string =>
      `Spara · ${p.n} ${p.n === 1 ? "tjänst" : "tjänster"}`,
  },
  editor: {
    tituloNueva: "Ny fråga",
    etiquetaPropia: "Egen fråga",
    preguntaLabel: "Frågan kunden ser",
    preguntaPlaceholder: "T.ex: Vilken nyans vill du ha?",
    ayudaLabel: "Hjälptext (valfritt)",
    tipoLabel: "Typ",
    obligatoriaLabel: "Obligatorisk",
    alternativosLabel: "Alternativ",
    ctaAgregarAlternativa: "+ Lägg till",
    ctaGuardar: "Spara fråga",
    ctaEliminar: "Ta bort fråga",
  },
  siNo: {
    si: "Ja",
    no: "Nej",
  },
  avisoDatosSensibles:
    "Fråga inte om hälsa, diagnoser eller personnummer. Sådana uppgifter kräver extra skydd enligt GDPR.",
  errores: {
    too_many_questions:
      "Den tjänsten har redan 5 frågor, det maximala antalet. Ta bort en innan du lägger till en till.",
    respuesta: {
      required: "Svara på den här frågan för att boka.",
      invalid_option: "Välj ett alternativ i listan.",
      empty_selection: "Välj minst ett alternativ.",
      duplicate_option: "Välj inte samma alternativ två gånger.",
      too_long: (p: { max: number }): string => `Skriv högst ${p.max} tecken.`,
      invalid_number: "Skriv ett heltal, utan decimaler.",
      out_of_range: numeroEntero,
      invalid_date: "Det datumet finns inte.",
      invalid_date_format: "Välj ett giltigt datum.",
    },
  },
  visualizacion: {
    titulo: "Svar vid bokning",
    par: (p: { etiqueta: string; valor: string }): string =>
      `${p.etiqueta}: ${p.valor}`,
    sinRespuestas: "Inga svar för den här bokningen.",
  },
  toast: {
    categoriaCreada: "Kategori skapad.",
    categoriaRenombrada: "Kategorin uppdaterad.",
    categoriaEliminada: "Kategorin borttagen.",
    preguntaGuardada: "Frågan sparad.",
    preguntaEliminada: "Frågan borttagen.",
    deshacer: comun.deshacer,
  },
};

// Kontraktet mot es-CL (samma exporter, samma form): typkontroll mot hela
// modulen inklusive reexporterna, utan att referera panelens värden vid
// körning (då skulle `sv-SE.panel.ts` dras in i `/[slug]` igen).
type Kontrakt = { [K in keyof typeof Es]: Widen<(typeof Es)[K]> };
function _check(sv: typeof Sv): Kontrakt {
  return sv;
}
void _check;
const _ingaExtraExporter: [Exclude<keyof typeof Sv, keyof typeof Es>] extends [
  never,
]
  ? true
  : false = true;
void _ingaExtraExporter;
