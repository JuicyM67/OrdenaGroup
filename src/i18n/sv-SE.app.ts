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
import { acceso as accesoSv } from "./sv-SE.auth";

import type * as Es from "./es-CL";

/** Samma form som es-CL men med vanliga string/number/boolean i stället för
 * literaler, och med stöd för readonly-listor (CAJA_METODOS_MANUALES,
 * plantillasWhatsapp.*.variables/botones). */
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
// nav
// ---------------------------------------------------------------------------

export const nav: Widen<typeof Es.nav> = {
  principal: "Huvudmeny",
  inicio: "Start",
  hoy: "Idag",
  agenda: "Kalender",
  clientes: "Kunder",
  horasFlash: "Flashtider",
  cajaEInformes: "Kassa och rapporter",
  caja: "Kassa",
  ajustes: "Inställningar",
  cerrarSesion: "Logga ut",
  secciones: "Avsnitt",
  volverAlInicio: "Tillbaka till start",
  buscar: "Sök",
  notificaciones: "Aviseringar",
  notificacionesNuevas: (p: { n: number }): string =>
    `${p.n} ${p.n === 1 ? "ny avisering" : "nya aviseringar"}`,
  masOpciones: "Fler alternativ",
  menuUsuario: (p: { nombre: string }): string => `Meny för ${p.nombre}`,
};

// ---------------------------------------------------------------------------
// estados
// ---------------------------------------------------------------------------

export const estados: Widen<typeof Es.estados> = {
  confirmada: "Bekräftad",
  abonoPagado: "Förskott betalt",
  sinConfirmar: "Obekräftad",
  porConfirmar: "Väntar på bekräftelse",
  confirmo: "Bekräftade",
  confirmoPorWhatsapp: "Bekräftade via sms",
  llego: "Kom",
  noVino: "Kom inte",
  cancelada: "Avbokad",
  listaDeEspera: "Väntelista",
  desdeLista: "Från väntelistan",
  abono: "Förskott",
  flash: "Flash",
  flashConDescuento: (p: { porcentaje: number }): string =>
    `Flash −${p.porcentaje}%`,
  pendientePago: "Väntar på förskott",
};

// ---------------------------------------------------------------------------
// calendario
// ---------------------------------------------------------------------------

export const calendario: Widen<typeof Es.calendario> = {
  hoy: "Idag",
  cerrado: "Stängt",
  diaConReservas: (p: { fecha: string }): string => `${p.fecha}, har bokningar`,
  vista: {
    mes: "Månad",
    semana: "Vecka",
    dia: "Dag",
  },
  mesAnterior: "Föregående månad",
  mesSiguiente: "Nästa månad",
  semanaAnterior: "Föregående vecka",
  semanaSiguiente: "Nästa vecka",
  diaAnterior: "Föregående dag",
  diaSiguiente: "Nästa dag",
  zonaHoraria: (p: { offset: number }): string =>
    `GMT${p.offset < 0 ? "−" : "+"}${Math.abs(p.offset)}`,
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
    flashOculto: "Har flashtid",
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
    ctaReservar: "Boka",
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
    verMiReserva: "Se min bokning",
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
// gestion
// ---------------------------------------------------------------------------

export const gestion: Widen<typeof Es.gestion> = {
  titulo: "Din bokning",
  campos: {
    servicio: "Tjänst",
    dia: "Dag",
    hora: "Tid",
    profesional: "Medarbetare",
    negocio: "Företag",
    direccion: "Adress",
  },
  ctaCambiarHora: "Ändra tid",
  ctaCancelarReserva: "Avboka tiden",
  pendienteAviso:
    "Företaget har inte bekräftat den här tiden än. Vi meddelar dig så fort de gör det.",
  confirmarCancelacion: {
    titulo: "Avboka tiden?",
    cuerpo: "Vi meddelar företaget och släpper tiden till någon annan.",
    ctaSi: "Ja, avboka",
    ctaNo: "Nej, behåll",
  },
  fueraDePlazo: (p: { horas: number; telefonoNegocio: string }): string =>
    `Fristen på ${p.horas} h för att avboka eller ändra härifrån har gått ut. Skriv till ${p.telefonoNegocio} för andra alternativ.`,
  yaCancelada: "Den här bokningen är redan avbokad.",
  yaPaso: "Den här bokningen har redan varit.",
  linkInvalido: "Den här länken är inte giltig.",
  linkVencido: "Den här länken har gått ut.",
  cambioConfirmado: "Klart, din tid är ändrad.",
  cancelacionConfirmada: "Klart, din bokning är avbokad.",
  ctaReservarOtraHora: "Boka en ny tid",
};

// ---------------------------------------------------------------------------
// inicio
// ---------------------------------------------------------------------------

function heroDestacadoSv(p: { horas: string; monto: string }): string {
  return `${p.horas} · ${p.monto}`;
}

export const inicio: Widen<typeof Es.inicio> = {
  titulo: "Start",
  resumenSemanaAria: "Veckans sammanfattning",
  calendarioAria: "Kalender",
  metaRow: (p: { fecha: string; negocio: string; comuna: string }): string =>
    `${p.fecha} · ${p.negocio}, ${p.comuna}`,
  hola: (p: { nombre: string }): string => `Hej, ${p.nombre}`,
  hero: {
    titulo: "Din kalender fyllde sig själv den här veckan",
    tituloVacio: "Den här veckan har du inte fyllt några tider än",
    horas: (p: { n: number }): string =>
      `${p.n} ${p.n === 1 ? "timme" : "timmar"}`,
    destacado: heroDestacadoSv,
    resumen: (p: { horas: string; monto: string }): string =>
      `Du fyllde ${heroDestacadoSv(p)} med väntelistan och flashtiderna.`,
    resumenVacio:
      "Aktivera väntelistan och flashtider för att börja fylla lediga tider.",
    verDetalle: "SE DETALJER",
  },
  features: {
    listaEspera: {
      titulo: "Väntelista",
      resumen: (p: { n: number; dia: string }): string =>
        `${p.n} ${p.n === 1 ? "person" : "personer"} · ${p.dia}`,
    },
    horasFlash: {
      titulo: "Flashtider",
      resumen: (p: { activas: number; reservadas: number }): string =>
        `${p.activas} ${p.activas === 1 ? "aktiv" : "aktiva"} · ${p.reservadas} ${p.reservadas === 1 ? "bokad" : "bokade"}`,
    },
    teEchamosDeMenos: {
      titulo: "Vi saknar dig",
      resumen: (p: { n: number }): string =>
        `${p.n} ${p.n === 1 ? "kund" : "kunder"} har inte kommit tillbaka`,
      enviarRecordatorio: "Skicka påminnelse",
    },
  },
  stats: {
    reservasHoy: (p: { n: number }): string =>
      `Bokningar idag · ${p.n} att bekräfta`,
    ingresosSemana: "Intäkter den här veckan",
    inasistencias: "Uteblivna besök · senaste 30 dagarna",
    tendencia: {
      bajando: "minskar",
      subiendo: "ökar",
      igual: "oförändrat",
    },
  },
  agendaHoy: {
    titulo: "Dagens schema",
    verAgenda: "Se kalendern",
    fila: (p: { servicio: string; profesional: string }): string =>
      `${p.servicio} · med ${p.profesional}`,
    vacio: "Du har inga bokningar idag än.",
    verEnAgenda: "Visa i kalendern",
  },
  proximasReservas: {
    titulo: "Kommande bokningar",
    verAgenda: "Se i kalendern",
    vacio: "Du har inga kommande bokningar.",
    fechaHora: (p: { fecha: string; hora: string }): string =>
      `${p.fecha} · ${p.hora}`,
  },
  solicitudes: {
    titulo: "Förfrågningar att bekräfta",
  },
  flashCard: {
    titulo: "Aktiv flashtid",
    vacio: "Du har ingen aktiv flashtid än.",
    compartir: "Dela flashtid",
    detalle: (p: { servicio: string; profesional: string }): string =>
      `${p.servicio} med ${p.profesional}`,
    fechaHoraDescuento: (p: {
      fecha: string;
      hora: string;
      porcentaje: number;
    }): string => `${p.fecha} · ${p.hora} · −${p.porcentaje}%`,
  },
  tuLink: {
    titulo: "Din bokningslänk",
    ayuda: "Klistra in den på Instagram och dela den via sms.",
    copiar: "Kopiera länk",
    copiado: "Länk kopierad",
    compartirWhatsapp: "Dela länken",
    mensajeWhatsapp: (p: { negocio: string; url: string }): string =>
      `Hej, du kan boka tid hos ${p.negocio} här: ${p.url}`,
    abrir: "Se min bokningssida",
    errorCopiar: "Vi kunde inte kopiera länken. Kopiera den manuellt.",
  },
};

// ---------------------------------------------------------------------------
// agenda
// ---------------------------------------------------------------------------

const NOTAS_AYUDA_SV =
  "Bara du och dina administratörer ser dem, och kunden kan be om en kopia av sina uppgifter. Skriv inte in hälsouppgifter eller annan känslig information.";

const AGREGA_EQUIPO_VACIO_SV =
  "Lägg till dem som tar emot kunder. Jobbar du själv, lägg till dig själv.";

const AGREGAR_PROFESIONAL_SV = "Lägg till medarbetare";

export const agenda: Widen<typeof Es.agenda> = {
  calendarioMensualAria: "Månadskalender",
  panel: {
    profesionales: "Medarbetare",
    reservasCount: (p: { n: number }): string =>
      `${p.n} ${p.n === 1 ? "bokning" : "bokningar"}`,
    mostrarAria: "Visa i kalendern",
    mostrar: "Visa",
    horasFlash: "Flashtider",
    desdeListaDeEspera: "Från väntelistan",
    bloqueosYAlmuerzo: "Blockeringar och lunch",
    esperanEl: (p: { n: number; dia: string }): string =>
      `${p.n} ${p.n === 1 ? "person väntar" : "personer väntar"} den ${p.dia}`,
    avisoWhatsapp: "Meddelas bara via sms",
    minimoUnProfesional: "Du måste lämna minst en medarbetare synlig.",
  },
  nuevaReserva: "Ny bokning",
  agregarProfesional: AGREGAR_PROFESIONAL_SV,
  verAgendaDe: (p: { nombre: string }): string => `Se ${p.nombre}s kalender`,
  vistaAria: "Vy",
  semana: (p: { desde: string; hasta: string }): string =>
    `Vecka från ${p.desde} till ${p.hasta}`,
  mes: {
    rejillaAria: "Månadsöversikt",
    celdaConReservasAria: (p: { fecha: string; n: number }): string =>
      `${p.fecha}, ${p.n} ${p.n === 1 ? "bokning" : "bokningar"}`,
    celdaSinReservasAria: (p: { fecha: string }): string =>
      `${p.fecha}, inga bokningar`,
    celdaCerradaAria: (p: { fecha: string }): string => `${p.fecha}, stängt`,
    verMesAria: "Visa månaden",
    verDiaAria: "Visa dagen",
  },
  bloqueo: {
    almuerzo: "Lunch",
    bloqueado: "blockerad",
  },
  bloque: {
    meta: (p: { hora: string; servicio: string }): string =>
      `${p.hora} · ${p.servicio}`,
    aria: (p: {
      cliente: string;
      servicio: string;
      hora: string;
      profesional: string;
    }): string => `${p.cliente}, ${p.servicio}, ${p.hora} med ${p.profesional}`,
  },
  diaCerrado: "Stängt",
  columnaVacia: "Inga bokningar under den här tiden.",
  popover: {
    titulo: "Bokningsdetaljer",
    conProfesional: (p: { profesional: string }): string =>
      `med ${p.profesional}`,
    telefonoYVisita: (p: { telefono: string; visita: string }): string =>
      `${p.telefono} · ${p.visita}`,
    fechaYRango: (p: { fecha: string; rango: string }): string =>
      `${p.fecha} · ${p.rango}`,
    pagoLinea: (p: { precio: string; monto: string }): string =>
      `${p.precio} · förskott ${p.monto} betalt`,
    acciones: {
      llego: "Kom",
      noVino: "Kom inte",
      mover: "Flytta",
    },
    cerrar: "Stäng",
  },
  mover: {
    titulo: "Flytta bokning",
    elegirNuevaHora: "Välj ny tid",
  },
  manual: {
    tituloNueva: "Ny bokning",
    campos: {
      servicio: "Tjänst",
      profesional: "Medarbetare",
      cliente: "Kund",
      telefono: "Mobilnummer",
      dia: "Dag",
      hora: "Tid",
      notas: "Anteckningar (valfritt)",
    },
    notasAyuda: NOTAS_AYUDA_SV,
    ctaGuardar: "Spara bokning",
  },
  confirmarAviso: {
    mover: {
      titulo: "Flytta den här bokningen?",
      cuerpo: "Kunden meddelas via sms med den nya tiden.",
      ctaSi: "Ja, flytta",
      ctaNo: "Nej, behåll",
    },
    cancelar: {
      titulo: "Avboka den här bokningen?",
      cuerpo: "Kunden meddelas via sms.",
      ctaSi: "Ja, avboka",
      ctaNo: "Nej, behåll",
    },
  },
  toast: {
    llego: "Markerad som Kom.",
    noVino: "Markerad som Kom inte.",
    movida: "Bokning flyttad.",
    cancelada: "Bokning avbokad.",
    deshacer: "Ångra",
  },
};

// ---------------------------------------------------------------------------
// hoy
// ---------------------------------------------------------------------------

export const hoy: Widen<typeof Es.hoy> = {
  titulo: "Idag",
  proximaReserva: "Nästa bokning",
  siguiente: (p: { relativo: string }): string => `Nästa · ${p.relativo}`,
  relativo: {
    ahora: "nu",
    enMin: (p: { n: number }): string => `om ${p.n} min`,
    enHoras: (p: { h: number; m: number }): string =>
      p.m === 0 ? `om ${p.h} h` : `om ${p.h} h ${p.m} min`,
    atrasado: (p: { n: number }): string => `${p.n} min försenad`,
  },
  sinProximaReserva: "Du har inga fler kunder inbokade idag.",
  detalleCliente: (p: {
    servicio: string;
    profesional: string;
    visita: string;
  }): string => `${p.servicio} · med ${p.profesional} · ${p.visita}`,
  acciones: {
    llego: "Kom",
    noVino: "Kom inte",
  },
  accionesRapidas: {
    crearHoraFlash: "Skapa flashtid",
    listaEspera: (p: { n: number }): string => `Väntelista · ${p.n}`,
    cobrar: "Ta betalt",
  },
  restoDia: {
    titulo: "Resten av dagen",
    resumen: (p: { n: number; monto: string }): string =>
      `${p.n} ${p.n === 1 ? "bokning" : "bokningar"} · ${p.monto}`,
    detalle: (p: { servicio: string; profesional: string }): string =>
      `${p.servicio} · ${p.profesional}`,
    vacio: "Du har inga fler bokningar idag.",
    diaCerrado: "Stängt idag.",
  },
};

// ---------------------------------------------------------------------------
// Interfaces/tipos: mismos que es-CL (contrato con integrations-engineer).
// ---------------------------------------------------------------------------

export type { VariablePlantilla, BotonPlantilla, Plantilla } from "./es-CL";

// ---------------------------------------------------------------------------
// plantillasWhatsapp: sex "mallar", omskrivna som sms utan knappar (D-028:
// SE har ingen WhatsApp-kanal, bara sms/e-post). Samma form som es-CL
// (samma sex nycklar, samma fält per mall), men `botones` är alltid tom och
// texten nämner aldrig "WhatsApp".
// ---------------------------------------------------------------------------

export const plantillasWhatsapp = {
  reservaConfirmada: {
    nombre: "bokning_bekraftad",
    categoria: "UTILITY",
    idioma: "sv",
    body: "Din tid hos {{1}} är bekräftad, {{2}}: {{3}} den {{4}} kl. {{5}} med {{6}}. Du kan avboka utan kostnad fram till {{7}} h innan.",
    variables: [
      {
        numero: 1,
        significado: "Företagets namn",
        ejemplo: "Salong Nord",
        fuente: "businesses.name",
      },
      {
        numero: 2,
        significado: "Kundens namn",
        ejemplo: "Erik",
        fuente: "första ordet i customers.name",
      },
      {
        numero: 3,
        significado: "Tjänst",
        ejemplo: "Klippning + skägg",
        fuente: "services.name",
      },
      {
        numero: 4,
        significado: "Datum, utskrivet och inte relativt",
        ejemplo: "fredag 2 oktober",
        fuente: "bookings.period, formaterat",
      },
      {
        numero: 5,
        significado: "Tid",
        ejemplo: "15:00",
        fuente: "bookings.period, formaterat",
      },
      {
        numero: 6,
        significado: "Medarbetare",
        ejemplo: "Diana",
        fuente: "staff.name",
      },
      {
        numero: 7,
        significado: "Antal timmar i avbokningsfristen",
        ejemplo: "4",
        fuente: "businesses.cancel_window_hours",
      },
    ],
    footer: null,
    botones: [],
    nota: "Utility: bekräftar en bokning som kunden själv precis gjorde. Ingen marknadsföring, bara bokningsdetaljer.",
  },
  recordatorio24h: {
    nombre: "paminnelse_24h",
    categoria: "UTILITY",
    idioma: "sv",
    body: "Påminnelse från {{1}}, {{2}}: din tid för {{3}} är den {{4}} kl. {{5}}. Svara Bekräfta eller Ändra.",
    variables: [
      {
        numero: 1,
        significado: "Företagets namn",
        ejemplo: "Salong Nord",
        fuente: "businesses.name",
      },
      {
        numero: 2,
        significado: "Kundens namn",
        ejemplo: "Erik",
        fuente: "första ordet i customers.name",
      },
      {
        numero: 3,
        significado: "Tjänst",
        ejemplo: "Klippning + skägg",
        fuente: "services.name",
      },
      {
        numero: 4,
        significado: "Datum, utskrivet",
        ejemplo: "fredag 2 oktober",
        fuente: "bookings.period, formaterat",
      },
      {
        numero: 5,
        significado: "Tid",
        ejemplo: "15:00",
        fuente: "bookings.period, formaterat",
      },
    ],
    footer: null,
    botones: [],
    nota: "Utility: påminner om en redan bekräftad bokning, utan att erbjuda något nytt.",
  },
  reservaCancelada: {
    nombre: "bokning_avbokad",
    categoria: "UTILITY",
    idioma: "sv",
    body: "Din tid hos {{1}} avbokades, {{2}}: den var den {{3}} kl. {{4}}. Du kan boka en ny tid när du vill.",
    variables: [
      {
        numero: 1,
        significado: "Företagets namn",
        ejemplo: "Salong Nord",
        fuente: "businesses.name",
      },
      {
        numero: 2,
        significado: "Kundens namn",
        ejemplo: "Erik",
        fuente: "första ordet i customers.name",
      },
      {
        numero: 3,
        significado: "Datum för den avbokade tiden",
        ejemplo: "fredag 2 oktober",
        fuente: "bookings.period, formaterat",
      },
      {
        numero: 4,
        significado: "Avbokad tid",
        ejemplo: "15:00",
        fuente: "bookings.period, formaterat",
      },
    ],
    footer: null,
    botones: [],
    nota: "Utility: bekräftar att kundens egen bokning avbokades. Inget erbjudande eller rabatt.",
  },
  reservaMovida: {
    nombre: "bokning_flyttad",
    categoria: "UTILITY",
    idioma: "sv",
    body: "Din tid hos {{1}} ändrades, {{2}}: nu är den {{3}} kl. {{4}} med {{5}}. Passar det inte kan du ändra eller avboka.",
    variables: [
      {
        numero: 1,
        significado: "Företagets namn",
        ejemplo: "Salong Nord",
        fuente: "businesses.name",
      },
      {
        numero: 2,
        significado: "Kundens namn",
        ejemplo: "Erik",
        fuente: "första ordet i customers.name",
      },
      {
        numero: 3,
        significado: "Nytt datum",
        ejemplo: "lördag 3 oktober",
        fuente: "bookings.period, formaterat",
      },
      {
        numero: 4,
        significado: "Ny tid",
        ejemplo: "11:30",
        fuente: "bookings.period, formaterat",
      },
      {
        numero: 5,
        significado: "Medarbetare",
        ejemplo: "Diana",
        fuente: "staff.name",
      },
    ],
    footer: null,
    botones: [],
    nota: "Utility: informerar om en ändring i kundens egen bokning, gjord av företaget.",
  },
  listaEsperaOferta: {
    nombre: "vantelista_erbjudande",
    categoria: "UTILITY",
    idioma: "sv",
    body: "En tid hos {{1}} blev ledig för dig, {{2}}: {{3}} den {{4}} kl. {{5}}. Du har {{6}} min på dig att svara; tiden går till den som bekräftar först.",
    variables: [
      {
        numero: 1,
        significado: "Företagets namn",
        ejemplo: "Salong Nord",
        fuente: "businesses.name",
      },
      {
        numero: 2,
        significado: "Kundens namn",
        ejemplo: "Erik",
        fuente: "första ordet i customers.name",
      },
      {
        numero: 3,
        significado: "Tjänst",
        ejemplo: "Klippning + skägg",
        fuente: "services.name",
      },
      {
        numero: 4,
        significado: "Datum",
        ejemplo: "fredag 2 oktober",
        fuente: "bookings.period, formaterat",
      },
      {
        numero: 5,
        significado: "Tid",
        ejemplo: "15:00",
        fuente: "bookings.period, formaterat",
      },
      {
        numero: 6,
        significado: "Minuter kvar att svara",
        ejemplo: "15",
        fuente: "waitlist_entries.offer_expires_at − now()",
      },
    ],
    footer: null,
    botones: [],
    nota: "Utility: meddelar om kundens egen plats på väntelistan, inte ett nytt erbjudande.",
  },
  listaEsperaTomada: {
    nombre: "vantelista_upptagen",
    categoria: "UTILITY",
    idioma: "sv",
    body: "Den tiden hos {{1}} är redan tagen, {{2}}. Du står kvar på väntelistan för {{3}} och vi hör av oss om en ny tid blir ledig.",
    variables: [
      {
        numero: 1,
        significado: "Företagets namn",
        ejemplo: "Salong Nord",
        fuente: "businesses.name",
      },
      {
        numero: 2,
        significado: "Kundens namn",
        ejemplo: "Erik",
        fuente: "första ordet i customers.name",
      },
      {
        numero: 3,
        significado: "Datum kunden fortfarande väntar på",
        ejemplo: "lördag 3 oktober",
        fuente: "waitlist_entries.date, formaterat",
      },
    ],
    footer: null,
    botones: [],
    nota: "Utility: informerar om resultatet av erbjudandet som gjordes till kunden.",
  },
} as const;

// ---------------------------------------------------------------------------
// whatsappSesion: sms-texter (D-028), inte plattformsmeddelanden i Metas
// mening. Namnet på exporten behålls (samma form som es-CL); innehållet
// nämner aldrig "WhatsApp".
// ---------------------------------------------------------------------------

export const whatsappSesion: Widen<typeof Es.whatsappSesion> = {
  confirmo: (p: { negocio: string }): string =>
    `Tack för att du bekräftade din tid hos ${p.negocio}! Vi ses.`,
  necesitoCambiar: (p: { negocio: string; linkGestion: string }): string =>
    `Inga problem. Ändra din tid hos ${p.negocio} här: ${p.linkGestion}`,
  listaEsperaConfirmada: (p: {
    negocio: string;
    servicio: string;
    fecha: string;
    hora: string;
  }): string =>
    `Klart! Din tid för ${p.servicio} hos ${p.negocio} blev den ${p.fecha} kl. ${p.hora}. Bekräftelsen med alla detaljer kommer strax.`,
  listaEsperaYaTomada: (p: { negocio: string }): string =>
    `Den tiden hos ${p.negocio} togs av någon annan. Du står kvar på väntelistan.`,
  listaEsperaNoGracias: (p: { negocio: string }): string =>
    `Klart, vi fortsätter att meddela dig om fler lediga tider hos ${p.negocio}.`,
  listaEsperaExpirada: (p: { negocio: string }): string =>
    `Tiden för att svara har gått ut. Vi meddelar dig om en ny tid blir ledig hos ${p.negocio}.`,
  noEntendido: (p: { negocio: string; telefonoNegocio: string }): string =>
    `Vi förstod inte ditt meddelande. Skriv direkt till ${p.negocio} på ${p.telefonoNegocio} om du behöver hjälp.`,
  baja: (p: { negocio: string }): string =>
    `Klart, du får inga fler erbjudanden från ${p.negocio}. Du får fortfarande bara avierna om dina bokningar.`,
  bajaTotal: (p: { negocio: string }): string =>
    `Klart, du får inga fler meddelanden alls från ${p.negocio}, varken erbjudanden eller påminnelser om dina bokningar. För att hantera en bokning, gå till din bokningslänk.`,
};

// ---------------------------------------------------------------------------
// email
// ---------------------------------------------------------------------------

export const email: Widen<typeof Es.email> = {
  reservaConfirmada: {
    asunto: (p: { negocio: string }): string =>
      `Din tid hos ${p.negocio} är bekräftad`,
    preheader: (p: { servicio: string; fecha: string; hora: string }): string =>
      `${p.servicio} den ${p.fecha} kl. ${p.hora}.`,
    cuerpo: (p: {
      cliente: string;
      negocio: string;
      servicio: string;
      fecha: string;
      hora: string;
      profesional: string;
      horasCancelacion: number;
      linkGestion: string;
    }): string =>
      `Hej ${p.cliente},\n\nDin tid hos ${p.negocio} är bekräftad.\n\nTjänst: ${p.servicio}\nDag: ${p.fecha}\nTid: ${p.hora}\nMedarbetare: ${p.profesional}\n\nDu kan avboka eller ändra utan kostnad fram till ${p.horasCancelacion} h innan, via den här länken: ${p.linkGestion}\n\nVi ses!`,
  },
  recordatorio24h: {
    asunto: (p: { negocio: string; fecha: string }): string =>
      `Påminnelse: din tid hos ${p.negocio} den ${p.fecha}`,
    preheader: (p: { fecha: string; hora: string }): string =>
      `Din tid är den ${p.fecha} kl. ${p.hora}.`,
    cuerpo: (p: {
      cliente: string;
      negocio: string;
      servicio: string;
      fecha: string;
      hora: string;
      linkGestion: string;
    }): string =>
      `Hej ${p.cliente},\n\nVi påminner om din tid hos ${p.negocio}.\n\nTjänst: ${p.servicio}\nDag: ${p.fecha}\nTid: ${p.hora}\n\nOm du behöver ändra den, gå in här: ${p.linkGestion}`,
  },
  reservaCancelada: {
    asunto: (p: { negocio: string }): string =>
      `Din tid hos ${p.negocio} avbokades`,
    preheader: (p: { fecha: string; hora: string }): string =>
      `Din tid den ${p.fecha} kl. ${p.hora} avbokades.`,
    cuerpo: (p: {
      cliente: string;
      negocio: string;
      fecha: string;
      hora: string;
      linkNuevaReserva: string;
    }): string =>
      `Hej ${p.cliente},\n\nDin tid hos ${p.negocio} den ${p.fecha} kl. ${p.hora} avbokades.\n\nDu kan boka en ny tid när du vill: ${p.linkNuevaReserva}`,
  },
  reservaMovida: {
    asunto: (p: { negocio: string }): string =>
      `Din tid hos ${p.negocio} bytte tidpunkt`,
    preheader: (p: { fecha: string; hora: string }): string =>
      `Nu är den ${p.fecha} kl. ${p.hora}.`,
    cuerpo: (p: {
      cliente: string;
      negocio: string;
      fecha: string;
      hora: string;
      profesional: string;
      linkGestion: string;
    }): string =>
      `Hej ${p.cliente},\n\nDin tid hos ${p.negocio} ändrades.\n\nNy dag: ${p.fecha}\nNy tid: ${p.hora}\nMedarbetare: ${p.profesional}\n\nSe detaljerna här: ${p.linkGestion}`,
  },
  pie: (p: { negocio: string; plataforma: string }): string =>
    `Du får det här mejlet eftersom du bokade hos ${p.negocio} via ${p.plataforma}.`,
  comun: {
    saludo: (p: { nombre: string }): string => `Hej ${p.nombre},`,
    piePagina: (p: { marca: string; negocio: string }): string =>
      `Skickat av ${p.marca} för ${p.negocio}.`,
    porQueRecibes:
      "Du får det här mejlet eftersom du har ett konto eller en bokning hos oss.",
    ayuda: "Har du frågor? Svara på det här mejlet, så hjälper vi dig.",
    verReserva: "Se min bokning",
    cambiarHora: "Ändra tid",
    cancelar: "Avboka tiden",
    agregarCalendario: "Lägg till i kalendern",
    comoLlegar: "Hitta hit",
  },
  bienvenida: {
    asunto: (p: { marca: string }): string => `Välkommen till ${p.marca}`,
    preheader: "Din bokningssida är redo att ta emot kunder.",
    titulo: "Din kalender är redo!",
    texto:
      "Nu kan du dela din bokningslänk och börja ta emot tider. Här är tre saker att göra idag:",
    pasos: {
      link: "Kopiera din bokningslänk: den finns under Start och Inställningar.",
      compartir: "Dela den via sms eller klistra in den på Instagram.",
      recordatorios:
        "De automatiska påminnelserna är redan aktiverade, så dina kunder glömmer inte sin tid.",
    },
    cta: "Gå till min kalender",
  },
  nuevaReservaDueno: {
    asunto: (p: { cliente: string; fecha: string }): string =>
      `Ny bokning från ${p.cliente} den ${p.fecha}`,
    preheader: (p: { servicio: string; hora: string }): string =>
      `${p.servicio} kl. ${p.hora}.`,
    titulo: "Du har en ny bokning",
    texto: (p: {
      cliente: string;
      servicio: string;
      fecha: string;
      hora: string;
    }): string =>
      `${p.cliente} bokade ${p.servicio} den ${p.fecha} kl. ${p.hora}.`,
    cta: "Se min kalender",
  },
  cancelacionDueno: {
    asunto: (p: { cliente: string; fecha: string }): string =>
      `${p.cliente} avbokade sin tid den ${p.fecha}`,
    preheader: (p: { servicio: string; hora: string }): string =>
      `Tiden kl. ${p.hora} för ${p.servicio} blev ledig.`,
    titulo: "En bokning avbokades",
    texto: (p: {
      cliente: string;
      servicio: string;
      fecha: string;
      hora: string;
    }): string =>
      `${p.cliente} avbokade sin tid för ${p.servicio} den ${p.fecha} kl. ${p.hora}. Tiden är nu ledig i din kalender.`,
    cta: "Se min kalender",
  },
  nuevaSolicitud: {
    asunto: (p: { cliente: string; fecha: string }): string =>
      `Förfrågan från ${p.cliente} den ${p.fecha}`,
    preheader: (p: { servicio: string; hora: string }): string =>
      `${p.servicio} kl. ${p.hora}. Bekräfta eller neka den.`,
    titulo: "Du har en förfrågan att bekräfta",
    texto: (p: {
      cliente: string;
      servicio: string;
      fecha: string;
      hora: string;
    }): string =>
      `${p.cliente} skickade en förfrågan om ${p.servicio} för ${p.fecha} kl. ${p.hora}. Bekräfta eller neka den innan den hinner gå ut.`,
    cta: "Se förfrågan",
  },
  solicitudRecibida: {
    asunto: (p: { negocio: string }): string =>
      `Vi tog emot din förfrågan hos ${p.negocio}`,
    preheader: (p: { servicio: string; fecha: string; hora: string }): string =>
      `${p.servicio} den ${p.fecha} kl. ${p.hora}.`,
    titulo: "Vi tog emot din förfrågan",
    texto: (p: {
      negocio: string;
      servicio: string;
      fecha: string;
      hora: string;
    }): string =>
      `Din förfrågan om ${p.servicio} hos ${p.negocio} för ${p.fecha} kl. ${p.hora} väntar på bekräftelse. Vi mejlar dig så fort ${p.negocio} bekräftar den.`,
    cta: "Se min förfrågan",
  },
  solicitudRechazada: {
    asunto: (p: { negocio: string }): string =>
      `Din förfrågan hos ${p.negocio} kunde inte bekräftas`,
    preheader: (p: { fecha: string; hora: string }): string =>
      `Tiden den ${p.fecha} kl. ${p.hora} blev inte bekräftad.`,
    cuerpo: (p: {
      cliente: string;
      negocio: string;
      fecha: string;
      hora: string;
      linkNuevaReserva: string;
      motivo?: string;
    }): string =>
      `Hej ${p.cliente},\n\n${p.negocio} kunde inte bekräfta din förfrågan om tiden den ${p.fecha} kl. ${p.hora}.${p.motivo ? ` Anledning: ${p.motivo}.` : ""}\n\nDu kan boka en ny tid när du vill: ${p.linkNuevaReserva}`,
  },
  solicitudVencida: {
    asunto: (p: { negocio: string }): string =>
      `Din förfrågan hos ${p.negocio} hann gå ut`,
    preheader: (p: { fecha: string; hora: string }): string =>
      `Tiden den ${p.fecha} kl. ${p.hora} är inte längre ledig.`,
    cuerpo: (p: {
      cliente: string;
      negocio: string;
      fecha: string;
      hora: string;
      linkNuevaReserva: string;
    }): string =>
      `Hej ${p.cliente},\n\nDin förfrågan hos ${p.negocio} om tiden den ${p.fecha} kl. ${p.hora} hann gå ut innan vi bekräftade den.\n\nDu kan boka en ny tid när du vill: ${p.linkNuevaReserva}`,
  },
  listaEsperaCupo: {
    asunto: (p: { negocio: string }): string =>
      `En tid hos ${p.negocio} blev ledig`,
    preheader: (p: { servicio: string; fecha: string }): string =>
      `${p.servicio} den ${p.fecha}. Bekräfta innan tiden går ut.`,
    titulo: "Din tid blev ledig!",
    texto: (p: { servicio: string; fecha: string }): string =>
      `Det finns en ledig tid för ${p.servicio} den ${p.fecha}. Den är din om du bekräftar i tid.`,
    cta: "Bekräfta tiden",
    expira: (p: { minutos: number }): string =>
      `Du har ${p.minutos} min på dig att bekräfta innan vi erbjuder den till någon annan.`,
  },
  horaFlash: {
    asunto: (p: { negocio: string; pct: number }): string =>
      `Flashtid hos ${p.negocio}: −${p.pct}%`,
    preheader: "Det är ont om tid att utnyttja den.",
    titulo: (p: { pct: number }): string => `−${p.pct}% under en begränsad tid`,
    texto: (p: { servicio: string; fecha: string; hora: string }): string =>
      `Passa på med ${p.servicio} den ${p.fecha} kl. ${p.hora} med rabatt. Den tar snart slut.`,
    cta: "Boka nu",
  },
  acceso: {
    magicLink: {
      asunto: (p: { marca: string }): string =>
        `Din inloggningslänk till ${p.marca}`,
      preheader: "Klicka på länken för att logga in på ditt konto.",
      titulo: "Logga in på ditt konto",
      texto:
        "Klicka på knappen för att logga in. Länken går bara att använda en gång.",
      cta: "Logga in",
      codigo: "Eller använd den här koden:",
      ignorar:
        "Om du inte bad om det här mejlet kan du bortse från det. Dela aldrig koden med någon.",
      expira: "Länken och koden gäller i 15 minuter.",
    },
    confirmation: {
      asunto: (p: { marca: string }): string =>
        `Bekräfta ditt konto hos ${p.marca}`,
      preheader: "Bekräfta ditt konto för att komma igång.",
      titulo: "Bekräfta ditt konto",
      texto: "Klicka på knappen för att bekräfta ditt konto och logga in.",
      cta: "Bekräfta mitt konto",
      codigo: "Eller använd den här koden:",
      ignorar:
        "Om du inte skapade det här kontot kan du bortse från mejlet. Dela aldrig koden med någon.",
      expira: "Länken och koden gäller i 15 minuter.",
    },
  },
  abono: {
    lineaConfirmacion: (p: {
      monto: string;
      saldo: string;
      condiciones: string;
    }): string =>
      `Du betalade ${p.monto} i förskott. Resten (${p.saldo}) betalar du på plats. ${p.condiciones}`,
  },
};

// ---------------------------------------------------------------------------
// validacion
// ---------------------------------------------------------------------------

export const validacion: Widen<typeof Es.validacion> = {
  clp: {
    empty: "Skriv ett belopp.",
    invalid_format: "Använd bara siffror, utan decimaler.",
    out_of_range: "Det beloppet är för högt.",
    invalid_type: "Det beloppet är inte giltigt.",
  },
  rut: {
    empty: "Skriv ett organisationsnummer.",
    invalid_format: "Det organisationsnumret har fel format.",
    invalid_check_digit: "Kontrollera sista siffran.",
    out_of_range: "Det organisationsnumret är inte giltigt.",
  },
  date: {
    invalid_format: "Välj ett giltigt datum.",
    invalid_date: "Det datumet finns inte.",
    invalid_type: "Det datumet är inte giltigt.",
  },
  time: {
    invalid_format: "Använd formatet timme:minut, till exempel 15:00.",
    out_of_range: "Den tiden finns inte. Kontrollera timme och minut.",
    invalid_type: "Den tiden är inte giltig.",
  },
  horaLocal: {
    nonexistent_local_time:
      "Den tiden finns inte den dagen på grund av tidsomställningen. Välj en annan.",
    ambiguous_local_time:
      "Den tiden förekommer två gånger den dagen på grund av tidsomställningen. Välj före eller efter omställningen.",
  },
  telefonoNegocio: {
    empty: "Skriv företagets telefonnummer.",
    invalid_chars: "Använd bara siffror, till exempel 070-123 45 67.",
    not_chilean: "Just nu tar vi bara emot svenska nummer.",
    wrong_country: "Skriv ett svenskt mobilnummer.",
    invalid_length:
      "Det numret har inte rätt antal siffror för ett svenskt telefonnummer. Kontrollera numret.",
    not_mobile: "Skriv ett svenskt mobilnummer, till exempel 070-123 45 67.",
    invalid_prefix:
      "Det numret är inte giltigt. Det ska börja med 07 (mobil) eller ett riktnummer (fast telefon).",
    invalid_type: "Det telefonnumret är inte giltigt.",
    invalid_format: "Kontrollera företagets telefonnummer.",
  },
  telefonoCliente: {
    empty: "Skriv kundens mobilnummer.",
    invalid_chars: "Använd bara siffror, till exempel 070-123 45 67.",
    not_chilean: "Just nu tar vi bara emot svenska mobilnummer.",
    wrong_country: "Skriv ett svenskt mobilnummer.",
    invalid_length:
      "Ett svenskt mobilnummer har 10 siffror. Kontrollera numret.",
    not_mobile: "Skriv ett svenskt mobilnummer, till exempel 070-123 45 67.",
    invalid_prefix: "Det numret är inte giltigt. Kontrollera riktnumret.",
    invalid_type: "Det mobilnumret är inte giltigt.",
    invalid_format: "Kontrollera kundens mobilnummer.",
  },
  email: {
    invalid: "Kontrollera e-postadressen.",
  },
  requerido: "Fyll i det här fältet.",
  numeroEntero: (p: { min: number; max: number }): string =>
    `Skriv ett heltal mellan ${p.min} och ${p.max}.`,
};

// ---------------------------------------------------------------------------
// acceso: identisk med sv-SE.auth.ts (samma marknad använder samma text).
// ---------------------------------------------------------------------------

export const acceso: Widen<typeof Es.acceso> = accesoSv;

// ---------------------------------------------------------------------------
// negocio
// ---------------------------------------------------------------------------

export const negocio: Widen<typeof Es.negocio> = {
  campos: {
    nameLabel: "Företagets namn",
    namePlaceholder: "T.ex: Salong Nord",
    comunaLabel: "Ort",
    categoryLabel: "Bransch",
    phoneLabel: "Företagets telefonnummer",
    phoneAyuda:
      "Mobil eller fast telefon. Dina kunder ser det i bekräftelsen och använder det för att kontakta dig om de inte kan ändra tiden själva.",
    phonePlaceholder: "070-123 45 67",
    addressLabel: "Adress (valfritt)",
    addressPlaceholder: "Gata och nummer",
  },
  rubros: {
    barberia: "Barberare",
    peluqueria: "Frisör",
    estetica: "Hudvård",
    unas: "Naglar",
    cejas_pestanas: "Bryn och fransar",
    masajes: "Massage",
    kinesiologia: "Naprapat/fysioterapi",
    otro: "Annat",
  },
  slug: {
    label: "Din bokningslänk",
    ayuda:
      "Så ser länken ut som du delar med dina kunder. Du kan ändra den senare i Inställningar.",
    vistaPrevia: (p: { url: string }): string => `Din länk: ${p.url}`,
  },
  errores: {
    slug_taken:
      "Den länken används redan av ett annat företag. Prova en annan.",
    slug_reserved: "Den länken är inte tillgänglig. Prova en annan.",
    slug_invalid:
      "Använd 3–40 små bokstäver, siffror eller bindestreck, utan mellanslag.",
  },
};

// ---------------------------------------------------------------------------
// onboarding
// ---------------------------------------------------------------------------

export const onboarding: Widen<typeof Es.onboarding> = {
  bienvenida: "Ställ in din kalender i 4 steg, det tar mindre än 10 minuter.",
  paso: (p: { n: number; total: number }): string =>
    `Steg ${p.n} av ${p.total}`,
  pasos: {
    servicios: "Tjänster",
    equipo: "Personal",
    horario: "Öppettider",
    link: "Din länk",
  },
  ctaContinuar: "Fortsätt",
  ctaVolver: "Tillbaka",
  ctaSaltar: "Hoppa över det här steget",
  loHagoDespues: "Jag gör det senare",
  intro: {
    servicios: "Lägg till det du erbjuder: namn, tid och pris.",
    equipo: AGREGA_EQUIPO_VACIO_SV,
    horario: "Berätta när du har öppet varje dag.",
    link: "Nu har du din bokningssida klar.",
  },
  listo: {
    titulo: "Din länk är klar",
    ctaCopiar: "Kopiera länk",
    copiado: "Kopierad",
    ctaCompartirWhatsapp: "Dela länken",
    ctaVerPagina: "Se min sida",
    ctaIrAgenda: "Gå till min kalender",
    mensajeCompartir: (p: { negocio: string; url: string }): string =>
      `Hej, nu kan du boka tid hos ${p.negocio} här: ${p.url}`,
  },
  checklist: {
    titulo: "Slutför din inställning",
    pasosPendientes: (p: { n: number }): string => `${p.n} steg kvar`,
  },
  avisoSinServicios:
    "Din sida tar inte emot bokningar förrän du lagt till en tjänst.",
  pasoOmitidoAviso: (p: { seccion: string }): string =>
    `Du hoppade över det här steget. Du kan slutföra det senare i Inställningar → ${p.seccion}.`,
  terminos: {
    prefijo: "Jag godkänner",
    terminosLinkTexto: "villkoren",
    medio: "och",
    encargoLinkTexto: "biträdesavtalet",
    sufijo: ".",
    error: "Du måste godkänna villkoren och biträdesavtalet för att fortsätta.",
  },
};

// ---------------------------------------------------------------------------
// servicios
// ---------------------------------------------------------------------------

export const servicios: Widen<typeof Es.servicios> = {
  campos: {
    nameLabel: "Tjänstens namn",
    namePlaceholder: "T.ex: Klippning",
    nombreAyuda:
      "Namnet skickas till kunden via sms och e-post. Använd ett allmänt namn, utan hälsouppgifter.",
    nombreAyudaExtendida:
      'Skriv till exempel "Naprapatbehandling" eller "Behandling (60 min)", inte diagnos eller specifik behandling.',
    durationLabel: "Tid (min)",
    priceLabel: "Pris",
    pricePlaceholder: "100 kr",
    bufferLabel: "Extra tid efteråt",
    bufferAyuda: "För städning eller förberedelse. Kunden ser den inte.",
    categoryLabel: "Kategori (valfritt)",
    profesionalesLabel: "Vem utför den?",
    mostrarEnPaginaLabel: "Visa på bokningssidan",
    descripcionLabel: "Beskrivning (valfritt)",
    descripcionPlaceholder: "Berätta för kunden vad som ingår i tjänsten.",
    descripcionAyuda: "Visas på din bokningssida.",
    subirAria: "Flytta upp",
    bajarAria: "Flytta ner",
  },
  errores: {
    nombreVacio: "Skriv tjänstens namn.",
    duracionInvalida: "Tiden måste vara mer än 0.",
    bufferInvalido: "Extra tiden kan inte vara negativ.",
    service_in_use:
      "Den tjänsten har bokningar. Inaktivera den i stället för att ta bort den.",
    descripcionMuyLarga: "Beskrivningen får inte vara längre än 500 tecken.",
  },
  vacio: "Lägg till de tjänster du erbjuder.",
  contador: (p: { n: number }): string =>
    `${p.n} ${p.n === 1 ? "tjänst" : "tjänster"}`,
  ctaAgregar: "Lägg till tjänst",
  ctaEliminar: "Ta bort tjänst",
  ctaDesactivar: "Inaktivera tjänst",
  ctaActivar: "Aktivera tjänst",
};

// ---------------------------------------------------------------------------
// profesionales
// ---------------------------------------------------------------------------

export const profesionales: Widen<typeof Es.profesionales> = {
  campos: {
    nameLabel: "Namn",
    tituloLabel: "Roll eller specialitet (valfritt)",
    tituloPlaceholder: "T.ex: Färgspecialist",
    tituloAyuda: "Visas på din bokningssida.",
    fotoLabel: "Profilbild (valfritt)",
    colorLabel: "Färg",
    serviciosLabel: "Tjänster hen utför",
    horarioLabel: "Öppettider",
    horarioIgualNegocio: "Samma som företaget",
    horarioPropio: "Egna tider",
    activoLabel: "Aktiv",
  },
  colores: {
    "staff-1": "Lavendel",
    "staff-2": "Himmelsblå",
    "staff-3": "Lila",
    "staff-4": "Persika",
    "staff-5": "Mint",
    "staff-6": "Lime",
  },
  horarioAyuda:
    "Egna tider kan bara krympa företagets öppettider, aldrig utöka dem.",
  horarioAvisoFueraDeNegocio:
    "Den tiden ligger utanför företagets öppettider. Inga tider erbjuds där.",
  errores: {
    nombreVacio: "Skriv medarbetarens namn.",
    staff_has_future_bookings: (p: { n: number }): string =>
      `Har ${p.n} ${p.n === 1 ? "kommande bokning" : "kommande bokningar"}, flytta eller avboka dem först.`,
  },
  vacio: AGREGA_EQUIPO_VACIO_SV,
  ctaAgregar: AGREGAR_PROFESIONAL_SV,
  ctaEliminar: "Ta bort medarbetare",
  ctaDesactivar: "Inaktivera medarbetare",
  ctaActivar: "Aktivera medarbetare",
};

// ---------------------------------------------------------------------------
// horarios
// ---------------------------------------------------------------------------

export const horarios: Widen<typeof Es.horarios> = {
  abierto: "Öppet",
  cerrado: "Stängt",
  ctaAgregarHorario: "Lägg till öppettid",
  ctaQuitarHorario: "Ta bort öppettid",
  ctaCopiarATodosLosDias: "Kopiera till alla dagar",
  intervalos: (p: { rangos: readonly string[] }): string => {
    const r = p.rangos;
    if (r.length === 0) return "";
    if (r.length === 1) return r[0] ?? "";
    if (r.length === 2) return `${r[0]} och ${r[1]}`;
    return `${r.slice(0, -1).join(", ")} och ${r[r.length - 1]}`;
  },
  errores: {
    business_hours_start_before_end: "Starttiden måste vara innan sluttiden.",
    business_hours_no_overlap: "Den tiden krockar med en annan samma dag.",
  },
  bloqueos: {
    tituloNuevo: "Ny blockering",
    kind: {
      block: "Blockering",
      lunch: "Lunch",
      vacation: "Semester",
      holiday: "Helgdag",
    },
    alcance: {
      negocio: "Hela företaget",
      profesional: "En medarbetare",
    },
    campos: {
      desde: "Från",
      hasta: "Till",
      nota: "Anteckning (valfritt)",
    },
    notaAyuda: "Bara din personal ser den. Skriv inte in hälsouppgifter.",
    ctaAgregar: "Lägg till blockering",
    ctaGuardar: "Spara blockering",
    ctaEliminar: "Ta bort blockering",
    overlapsBookings: (p: { n: number }): string =>
      `Den blockeringen krockar med ${p.n} ${p.n === 1 ? "bokning" : "bokningar"}. Flytta dem innan du sparar.`,
  },
};

// ---------------------------------------------------------------------------
// ajustes
// ---------------------------------------------------------------------------

export const ajustes: Widen<typeof Es.ajustes> = {
  secciones: {
    negocio: "Ditt företag",
    link: "Din bokningslänk",
    reglas: "Bokningsregler",
    servicios: "Tjänster",
    equipo: "Personal",
    horario: "Öppettider",
    mercadopago: "Betalningar",
    cuenta: "Konto",
    formularioReserva: "Bokningsformulär",
    privacidad: "Integritet och data",
  },
  reglas: {
    minNoticeLabel: "Minsta förvarning",
    maxDaysAheadLabel: (p: { n: number }): string =>
      `Bokningar upp till ${p.n} dagar i förväg`,
    cancelWindowLabel: "Frist för att avboka eller ändra",
    cancelWindowAyuda:
      "Det här antalet visas för kunden innan bekräftelse och i sms-bekräftelsen.",
    slotIntervalLabel: "Hur ofta tider erbjuds",
    confirmarAutomatico: "Bekräfta bokningar automatiskt",
    confirmarAutomaticoAyuda:
      "Om du stänger av den här väntar varje bokning från din sida tills du bekräftar eller nekar den. Under tiden är tiden blockerad så att ingen annan kan ta den.",
  },
  waitlistMode: {
    sequential: "En i taget, i ordning",
    broadcast: "Till alla samtidigt",
  },
  waitlistModeAyuda: {
    sequential: "Vi meddelar en kund i taget och väntar på svar.",
    broadcast:
      "Vi meddelar alla som väntar samtidigt, och den som svarar först får tiden.",
  },
  slugAviso:
    'Om du ändrar din länk slutar den gamla att fungera. Redan skickade sms med knappen "Boka igen" pekar fortfarande på den gamla länken.',
  guardarCambios: "Spara ändringar",
  guardando: "Sparar…",
  cambiosGuardados: "Ändringar sparade",
  cambiosSinGuardar: "Du har osparade ändringar",
  seguirEditando: "Fortsätt redigera",
  salirSinGuardar: "Avsluta utan att spara",
  conflictoEdicion:
    "Någon annan ändrade det här. Ladda om för att se senaste versionen.",
  cuenta: {
    sesionComo: (p: { email: string }): string => `Inloggad som ${p.email}`,
  },
  privacidad: {
    exportarTitulo: "Exportera ditt företags data",
    exportarAyuda:
      "Ladda ner en fil med information om ditt företag, dina kunder och dina bokningar.",
    exportarCta: "Exportera data",
    eliminarTitulo: "Radera ditt konto",
    eliminarAyuda:
      "Vi rekommenderar att du exporterar dina data innan du raderar kontot.",
    eliminarCta: "Radera konto",
    eliminarDialogTitulo: "Radera ditt konto?",
    eliminarDialogCuerpo: (p: { n: number }): string =>
      `Din bokningssida stängs av direkt. Du har ${p.n} dagar på dig att ångra dig; därefter raderar vi allt permanent.`,
    eliminarConfirmarSi: "Ja, radera kontot",
    eliminarConfirmarNo: "Nej, behåll kontot",
    solicitadaAviso: (p: { fecha: string }): string =>
      `Ditt konto raderas ${p.fecha}.`,
    solicitadaCtaDeshacer: "Ångra",
    solicitadaDeshecha: "Raderingen avbröts.",
    error: "Vi kunde inte slutföra åtgärden. Försök igen.",
  },
};

// ---------------------------------------------------------------------------
// clientes
// ---------------------------------------------------------------------------

export const clientes: Widen<typeof Es.clientes> = {
  lista: {
    buscarPlaceholder: "Sök på namn eller mobilnummer",
    columnaUltimaVisita: "Senaste besök",
    columnaVisitas: "Besök",
    columnaInasistencias: "Uteblivna besök",
    vacio: "Du har inga kunder än.",
    sinResultados: (p: { busqueda: string }): string =>
      `Vi hittade inga kunder för "${p.busqueda}".`,
  },
  ficha: {
    clienteDesde: (p: { fecha: string }): string => `Kund sedan ${p.fecha}`,
    visitas: (p: { n: number }): string => `${p.n} besök`,
    inasistencias: (p: { n: number }): string =>
      `${p.n} ${p.n === 1 ? "uteblivet besök" : "uteblivna besök"}`,
    historialTitulo: "Historik",
    proximasTitulo: "Kommande bokningar",
    ctaNuevaReserva: "Ny bokning",
    ctaLlamar: "Ring",
    ctaWhatsapp: "Skicka sms",
    ctaVerFicha: "Se kundkort",
  },
  notas: {
    label: "Anteckningar",
    ayuda: NOTAS_AYUDA_SV,
  },
  editar: {
    tituloNuevo: "Ny kund",
    tituloEditar: "Redigera kund",
    nameLabel: "Namn",
    phoneLabel: "Mobilnummer",
    emailLabel: "E-post (valfritt)",
    ctaGuardar: "Spara kund",
  },
  errores: {
    customer_phone_taken: "Du har redan en kund med det numret.",
  },
  consentimientos: {
    canal: {
      web: "På din bokningssida",
      whatsapp: "Via sms",
      manual: "Registrerad av dig",
    },
    canalEnFrase: {
      web: "på din bokningssida",
      whatsapp: "via sms",
      manual: "registrerad av dig",
    },
    aceptoEl: (p: { fecha: string; canal: string }): string =>
      `Godkände den ${p.fecha} (${p.canal})`,
    sinRegistro: "Har inte gett sitt samtycke än.",
    baja: "Svarade STOPP på erbjudanden.",
  },
  consentimientoManual: {
    version: "manuell-2026-10-v1",
    texto:
      "Kunden godkände att få bekräftelsen och påminnelser om den här tiden och kommande tider via sms.",
    ayuda: (p: { negocio: string }): string =>
      `Berätta att hen kommer få sms från ${p.negocio} och att hen kan be om att slippa fler meddelanden.`,
    marketingRechazado: "Kunden vill inte få erbjudanden.",
  },
  anonimizado: "Anonymiserad kund",
  privacidad: {
    ctaExportar: "Exportera data",
    ctaAnonimizar: "Anonymisera kund",
    confirmarTitulo: "Anonymisera den här kunden?",
    confirmarCuerpo:
      "Namn, mobilnummer, e-post och anteckningar tas bort. Bokningar och betalningar behålls, utan de uppgifterna. Går inte att ångra.",
    confirmarSi: "Ja, anonymisera",
    confirmarNo: "Nej, behåll",
    error: "Vi kunde inte slutföra åtgärden. Försök igen.",
  },
};

// ---------------------------------------------------------------------------
// caja: koder oförändrade (samma DB-enum oavsett marknad), etiketter
// neutrala utan namnge en specifik betaltjänst (D-027).
// ---------------------------------------------------------------------------

export const CAJA_METODOS_MANUALES = [
  "cash",
  "card_terminal",
  "transfer",
] as const;

export const caja: Widen<typeof Es.caja> = {
  periodos: {
    hoy: "Idag",
    semana: "Vecka",
    mes: "Månad",
  },
  periodo: (p: { desde: string; hasta: string }): string =>
    `Från ${p.desde} till ${p.hasta}`,
  resumen: {
    cobrado: "Inkommet",
    porCobrar: "Ej betalt",
    abonosMercadopago: "Förskott online",
    reservasCount: (p: { n: number }): string =>
      `${p.n} ${p.n === 1 ? "bokning" : "bokningar"}`,
    explicacion:
      "Summerar godkända betalningar inom perioden, minus återbetalningar.",
  },
  metodo: {
    cash: "Kontant",
    card_terminal: "Kort",
    transfer: "Överföring",
    mercadopago: "Automatisk betalning",
  },
  tipo: {
    deposit: "Förskott",
    balance: "Resterande belopp",
    full: "Full betalning",
  },
  estado: {
    pending: "Väntande",
    approved: "Godkänd",
    rejected: "Nekad",
    refunded: "Återbetald",
  },
  marcarPagada: {
    titulo: "Markera som betald",
    aPagar: (p: { total: string; desglose?: string }): string =>
      p.desglose ? `${p.total} (${p.desglose})` : p.total,
    metodoLabel: "Betalsätt",
    cta: "Markera som betald",
    confirmacion: (p: { metodo: string }): string => `Betald med ${p.metodo}.`,
  },
  anular: {
    cta: "Ogiltigförklara betalning",
    tituloConfirmacion: "Ogiltigförklara den här betalningen?",
    cuerpoConfirmacion: "Det här går inte att ångra.",
  },
  soloLecturaMercadopago: "Betald automatiskt online, går inte att ändra här.",
  errores: {
    already_paid:
      "Den här bokningen är redan markerad som betald. Ladda om för att se statusen.",
  },
  vacioPeriodo: "Inga betalningar under den här perioden.",
  vacioDia: "Du har inga bokningar den här dagen.",
};

// ---------------------------------------------------------------------------
// abono: förskottsbetalning, neutralt formulerat utan att namnge en
// specifik betaltjänst (D-027: inga kundbetalningar i SE, nycklarna finns
// bara av typskäl).
// ---------------------------------------------------------------------------

export const abono: Widen<typeof Es.abono> = {
  ajustes: {
    titulo: "Ta emot förskott",
    explicacion:
      "Förskottet går direkt till ditt eget betalkonto. Det går aldrig via oss.",
    ctaConectar: "Anslut onlinebetalning",
    conectadaComo: (p: { cuenta: string }): string =>
      `Ansluten som ${p.cuenta}`,
    ctaDesconectar: "Koppla från",
    confirmarDesconectar:
      "Tjänster med förskott slutar begära det tills du ansluter igen.",
    errores: {
      oauth_cancelled: "Du avbröt anslutningen.",
      oauth_denied: "Anslutningen nekades. Försök igen.",
      token_expired: "Din anslutning har gått ut. Anslut igen.",
      mp_unavailable: "Tjänsten svarar inte just nu. Försök igen senare.",
    },
  },
  servicio: {
    depositKindLabel: "Förskott",
    depositKind: {
      none: "Inget förskott",
      fixed: "Fast belopp",
      percent: "Procent av priset",
    },
    depositValueLabel: "Förskottsbelopp",
    depositValuePercentLabel: "Förskottets procentandel",
    vistaPrevia: (p: { monto: string }): string =>
      `Kunden betalar ${p.monto} för att boka.`,
    errores: {
      porcentajeFueraDeRango: "Procentandelen måste vara mellan 1 och 100.",
      montoMayorAlPrecio: "Förskottet kan inte vara högre än tjänstens pris.",
      mp_not_connected: "Anslut en betaltjänst för att begära förskott.",
    },
  },
  reserva: {
    requiereAbono: (p: { monto: string }): string =>
      `Kräver förskott på ${p.monto}`,
    explicacion: (p: { monto: string; saldo: string }): string =>
      `Betala ${p.monto} nu online. Resten (${p.saldo}) betalar du på plats.`,
    condiciones: (p: { negocio: string; horas: number }): string =>
      `Om du avbokar fram till ${p.horas} h innan betalar ${p.negocio} tillbaka förskottet. Om du avbokar senare eller uteblir behåller ${p.negocio} förskottet. Om du ändrar tiden behålls förskottet. Om ${p.negocio} avbokar får du tillbaka förskottet.`,
    ctaPagar: "Betala förskott",
    redirigiendo: "Vi tar dig vidare för betalning…",
    tiempoParaPagar: (p: { minutos: number }): string =>
      `Du har ${p.minutos} min på dig att betala. Sen släpper vi tiden.`,
    retorno: {
      aprobado: "Förskottet är betalt, din tid är bekräftad.",
      pendiente: "Vi bekräftar din betalning…",
      rechazado: "Betalningen gick inte igenom. Du kan försöka igen.",
      expirado: "Tiden gick ut och platsen släpptes.",
    },
    pagoTardio: (p: { negocio: string; telefonoNegocio: string }): string =>
      `${p.negocio} fick din betalning, men tiden hade redan släppts. ${p.negocio} betalar tillbaka förskottet. Skriv till ${p.telefonoNegocio} för att lösa det.`,
  },
  gestion: {
    abonoPagado: (p: { monto: string }): string =>
      `Förskott betalt: ${p.monto}`,
    cancelarConAbonoDentroPlazo: (p: {
      monto: string;
      negocio: string;
    }): string => `${p.negocio} betalar tillbaka ${p.monto}.`,
    cancelarConAbonoFueraPlazo: (p: { monto: string }): string =>
      `Förskottet på ${p.monto} betalas inte tillbaka.`,
  },
  dueno: {
    abonoPorDevolver: "Förskott att betala tillbaka",
    devolverEnMercadopago: "Betala tillbaka det via din betaltjänst.",
  },
};

// ---------------------------------------------------------------------------
// sms: samma nio meddelanden som es-CL, för sms i stället för WhatsApp/
// e-post (D-028): en enda kanal här, så till skillnad från
// `plantillasWhatsapp`/`whatsappSesion` ovan (som redan är sms i sak men
// behåller sina gamla exportnamn av formskäl) heter den här exporten helt
// enkelt `sms`. Samma format som es-CL: ≤ 160 tecken, ingen emoji, en länk
// per meddelande. `pie` läggs bara till marknadsförings-sms (idag
// `horaFlash`); avsändarnamnet sätts av sms-leverantören, inte av texten.
// ---------------------------------------------------------------------------

export const sms: Widen<typeof Es.sms> = {
  reservaConfirmada: (p: {
    negocio: string;
    fecha: string;
    hora: string;
    link: string;
  }): string =>
    `Din tid hos ${p.negocio} är bekräftad: ${p.fecha} kl. ${p.hora}. Detaljer: ${p.link}`,
  recordatorio: (p: {
    negocio: string;
    fecha: string;
    hora: string;
    link: string;
  }): string =>
    `Påminnelse från ${p.negocio}: din tid är ${p.fecha} kl. ${p.hora}. Detaljer: ${p.link}`,
  recordatorioHoy: (p: {
    negocio: string;
    hora: string;
    link: string;
  }): string =>
    `Påminnelse från ${p.negocio}: din tid är idag kl. ${p.hora}. Detaljer: ${p.link}`,
  reservaMovida: (p: {
    negocio: string;
    fecha: string;
    hora: string;
    link: string;
  }): string =>
    `Din tid hos ${p.negocio} ändrades: nu är den ${p.fecha} kl. ${p.hora}. Detaljer: ${p.link}`,
  reservaCancelada: (p: {
    negocio: string;
    fecha: string;
    hora: string;
    link: string;
  }): string =>
    `Din tid hos ${p.negocio} den ${p.fecha} kl. ${p.hora} avbokades. Boka ny tid: ${p.link}`,
  solicitudRechazada: (p: {
    negocio: string;
    fecha: string;
    hora: string;
    link: string;
  }): string =>
    `Din förfrågan hos ${p.negocio} för ${p.fecha} kl. ${p.hora} kunde inte bekräftas. Boka en ny tid: ${p.link}`,
  solicitudVencida: (p: {
    negocio: string;
    fecha: string;
    hora: string;
    link: string;
  }): string =>
    `Din förfrågan hos ${p.negocio} för ${p.fecha} kl. ${p.hora} hann gå ut. Boka en ny tid: ${p.link}`,
  listaEsperaCupo: (p: {
    negocio: string;
    servicio: string;
    fecha: string;
    hora: string;
    link: string;
    minutos: number;
  }): string =>
    `En tid hos ${p.negocio} blev ledig! ${p.servicio}, ${p.fecha} kl. ${p.hora}. Du har ${p.minutos} min: ${p.link}`,
  horaFlash: (p: {
    negocio: string;
    hora: string;
    pct: number;
    link: string;
  }): string =>
    `Flashtid hos ${p.negocio}: -${p.pct}% om du bokar idag kl. ${p.hora}. ${p.link}`,
  nuevaReservaDueno: (p: {
    cliente: string;
    servicio: string;
    fecha: string;
    hora: string;
  }): string =>
    `Ny bokning: ${p.cliente} bokade ${p.servicio} ${p.fecha} kl. ${p.hora}.`,
  codigoAcceso: (p: { codigo: string }): string =>
    `Din inloggningskod är ${p.codigo}. Dela den aldrig med någon.`,
  pie: "Svara STOPP för att avsluta.",
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
      out_of_range: validacion.numeroEntero,
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

// ---------------------------------------------------------------------------
// perfil: WP-41 — företagets publika profil (`/[slug]`) och Inställningar →
// "Profil" (omslagsbild, logga, galleri, om oss, Instagram). Samma nycklar
// som `Es.perfil`; texten är hämtad direkt ur designutkasten
// (`.visual-diff/ref/ProfilDesktop.dc.html`, `ProfilMobil.dc.html`) där de
// redan är på svenska.
// ---------------------------------------------------------------------------

export const perfil: Widen<typeof Es.perfil> = {
  publico: {
    chips: {
      abiertoAhora: (p: { hasta: string }): string =>
        `Öppet nu · till ${p.hasta}`,
      cerrado: "Stängt",
      abreA: (p: { dia: string; hora: string }): string =>
        `Öppnar ${p.dia} kl. ${p.hora}`,
      proximaHora: (p: { cuando: string }): string =>
        `Nästa lediga tid: ${p.cuando}`,
    },
    secciones: {
      reservarHora: "Boka tid",
      profesionales: onboarding.pasos.equipo,
      sobreNosotros: "Om oss",
      horario: "Öppettider",
      comoLlegar: email.comun.comoLlegar,
      contacto: "Kontakt",
    },
    verRuta: "Vägbeskrivning →",
    tabs: {
      servicios: "Tjänster",
      equipo: onboarding.pasos.equipo,
      nosotros: "Om oss",
      info: "Info",
    },
    reservar: reserva.bookingBar.ctaReservar,
    reservarAhora: "Boka nu",
    servicioDetalle: (p: { duracion: string; descripcion?: string }): string =>
      p.descripcion ? `${p.duracion} · ${p.descripcion}` : p.duracion,
    masRapido: "Snabbast in",
    masRapidoDetalle: (p: { dia: string; servicio: string }): string =>
      `${p.dia} · ${p.servicio}`,
    nFotos: (p: { n: number }): string =>
      `+${p.n} ${p.n === 1 ? "bild" : "bilder"}`,
    instagramAria: (p: { negocio: string }): string =>
      `Instagram för ${p.negocio}`,
  },
  ajustes: {
    titulo: "Profil",
    ayuda: "Så här ser dina kunder dig på din bokningssida.",
    campos: {
      sobreNosotrosLabel: "Om oss",
      sobreNosotrosPlaceholder:
        "Berätta för dina kunder vilka ni är, vad ni är bra på och vad de kan förvänta sig.",
      sobreNosotrosAyuda: "Visas på din bokningssida.",
      instagramLabel: "Instagram",
      instagramPlaceholder: "@dittforetag",
      instagramAyuda: "Bara ditt användarnamn, utan hela länken.",
      portadaLabel: "Omslagsbild",
      portadaAyuda: "Visas högst upp på din bokningssida.",
      logoLabel: "Logga",
      logoAyuda: "Laddar du inte upp en visar vi ditt företags initialer.",
      galeriaLabel: "Galleri",
      galeriaAyuda: "Upp till 12 bilder från din lokal eller ditt arbete.",
    },
    botones: {
      subir: "Ladda upp bild",
      cambiar: "Byt",
      eliminar: "Ta bort",
      moverArriba: "Flytta upp",
      moverAbajo: "Flytta ner",
    },
    errores: {
      tipoInvalido: "Den filen är inte en bild. Använd JPG, PNG eller WEBP.",
      demasiadoGrande: "Bilden väger mer än 2 MB. Använd en lättare bild.",
      maxImagenes:
        "Du har redan 12 bilder i ditt galleri. Ta bort en för att lägga till en till.",
      subidaFallida: "Vi kunde inte ladda upp bilden. Försök igen.",
    },
    toast: {
      imagenSubida: "Bilden har lagts till.",
      imagenEliminada: "Bilden har tagits bort.",
      cambiosGuardados: ajustes.cambiosGuardados,
    },
  },
};

// ---------------------------------------------------------------------------
// solicitudes: WP-45 (D-033), samma nycklar som Es.solicitudes.
// ---------------------------------------------------------------------------

export const solicitudes: Widen<typeof Es.solicitudes> = {
  campana: {
    titulo: inicio.solicitudes.titulo,
    vacio: "Du har inga väntande förfrågningar.",
  },
  fila: (p: {
    cliente: string;
    servicio: string;
    fecha: string;
    hora: string;
  }): string => `${p.cliente} · ${p.servicio} · ${p.fecha}, ${p.hora}`,
  acciones: {
    confirmar: "Bekräfta",
    rechazar: "Neka",
  },
  rechazarDialog: {
    titulo: "Neka den här förfrågan?",
    cuerpo: "Kunden meddelas och kan boka en ny tid.",
    motivoLabel: "Anledning (valfritt)",
    motivoPlaceholder: "Till exempel: vi har ingen tid den dagen.",
    ctaSi: "Ja, neka",
    ctaNo: "Nej, behåll",
  },
  toast: {
    confirmada: "Förfrågan bekräftad.",
    rechazada: "Förfrågan nekad.",
  },
};

// ---------------------------------------------------------------------------
// Typkontroll: en nyckel som saknas eller ett fel i en funktionssignatur ger
// typfel här (körs av `npm run typecheck`).
// ---------------------------------------------------------------------------

const _check: { [K in keyof typeof Es]: Widen<(typeof Es)[K]> } = {
  comun,
  nav,
  estados,
  calendario,
  errores,
  reserva,
  gestion,
  inicio,
  agenda,
  hoy,
  plantillasWhatsapp,
  whatsappSesion,
  email,
  sms,
  validacion,
  acceso,
  negocio,
  onboarding,
  servicios,
  profesionales,
  horarios,
  ajustes,
  clientes,
  CAJA_METODOS_MANUALES,
  caja,
  abono,
  formulario,
  perfil,
  solicitudes,
};
void _check;
