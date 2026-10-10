/** Guidad visning (WP-72), svenska. Samma form som `es-CL.visita.ts`. */
import type { visita as EsVisita } from "./es-CL.visita";

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

export const visita: Widen<typeof EsVisita> = {
  comun: {
    saltar: "Hoppa över",
    atras: "Tillbaka",
    siguiente: "Nästa",
    reiniciar: "Visa mig runt igen",
    progreso: "Hur långt visningen har kommit",
    contador: (p) => `STEG ${p.n} AV ${p.total}`,
  },
  rubros: {
    etiqueta: "Välj din bransch",
    items: [
      { id: "peluqueria", label: "Frisör", slug: "din-salong" },
      { id: "barberia", label: "Barberare", slug: "din-barberare" },
      { id: "unas", label: "Naglar", slug: "din-nagelstudio" },
      { id: "estetica", label: "Hudvård", slug: "din-klinik" },
      { id: "otro", label: "Annat", slug: "ditt-foretag" },
    ],
  },
  cliente: {
    bienvenida: {
      aria: "Välkommen till demot",
      titulo: "Så här kan din sida se ut",
      texto:
        "Det här är ett exempelföretag. Vi visar dig runt på 40 sekunder – välj din bransch så anpassar vi exemplen.",
      empezar: "Visa mig runt",
      saltar: "Titta själv",
    },
    pasos: {
      servicios: {
        titulo: "Dina tjänster",
        texto:
          "Varje tjänst fälls ut med beskrivning, tid, pris och vem som utför den – så kunden vet exakt vad hen bokar. Du lägger upp dem på några minuter, eller importerar från ditt gamla system.",
        corto: "Pris, tid och beskrivning – kunden väljer direkt.",
        chips: ["Beskrivning", "Pris och tid", "Vem som utför"],
      },
      equipo: {
        titulo: "Ditt team",
        texto:
          "Varje medarbetare får egen profil och eget schema. Kunden kan välja vem – eller låta systemet hitta första lediga.",
        corto: "Varje medarbetare har egen profil och eget schema.",
        chips: ["Egna scheman", "Personalkonton"],
      },
      flash: {
        titulo: "Blixttider",
        texto:
          "Blev en tid ledig? Släpp den med rabatt – väntelistan får besked direkt och luckan fylls.",
        corto: "Släpp en ledig tid med rabatt – väntelistan får besked direkt.",
        chips: ["Väntelista", "Rabatt du väljer"],
      },
      resenas: {
        titulo: "Verifierade omdömen",
        texto:
          "Efter varje besök ber vi kunden om ett omdöme. Bara riktiga kunder kan recensera – så betyget går att lita på.",
        corto: "Bara riktiga kunder kan recensera.",
        chips: ["Bara riktiga kunder", "Du kan svara"],
      },
      pago: {
        titulo: "Betalt direkt vid bokningen",
        texto:
          "Kunden betalar med kort, Apple Pay eller Google Pay när hen bokar – pengarna landar på ditt konto. Uteblivna besök kostar dig inte längre en hel timme, och avbokningar återbetalas automatiskt.",
        corto:
          "Kort eller Apple Pay via Stripe – pengarna landar på ditt konto, och uteblivna besök kostar dig inget.",
        chips: [
          "Säkert via Stripe",
          "Pengarna direkt till dig",
          "1 % – ingen provision",
        ],
      },
      reservar: {
        titulo: "Bokat på en minut",
        texto:
          "Kunden väljer tid och fyller i namn och nummer. Bekräftelse och påminnelse skickas automatiskt – du behöver inte lyfta ett finger.",
        corto:
          "Välj tid och fyll i namn – bekräftelse och påminnelse skickas automatiskt.",
        chips: ["Bekräftelse direkt", "Påminnelse innan"],
      },
    },
    final: {
      aria: "Ska vi bli buddies?",
      etiqueta: "Din sida · klar på 5 min",
      live: "Live",
      titulo: "Ska vi bli buddies?",
      texto:
        "Vi fixar din egen bokningssida på fem minuter – eller två, om du flyttar från ett annat system. Gratis för en person.",
      corto: "Din egen bokningssida på fem minuter. Gratis för en person.",
      cta: "Ja, skapa min sida",
      seguir: "Fortsätt titta",
      negocio: "Se hur det ser ut för dig som företagare",
    },
    pagoNota: {
      texto: "Betala direkt · kort, Apple Pay, Google Pay",
      via: "Stripe",
    },
  },
  negocio: {
    aria: "Välkommen till företagsvyn",
    nombre: "Salong Norrsken",
    plan: "Team-planen",
    volver: "Till startsidan",
    nav: [
      "Idag",
      "Agenda",
      "Kunder",
      "Kassa",
      "Blixttider",
      "Omdömen",
      "Inställningar",
    ],
    navMenu: "Meny",
    agenda: "Agenda",
    semana: "Vecka 42 · 13–17 okt",
    dia: "Onsdag 15 okt",
    nuevaReserva: "+ Ny bokning",
    campanaAria: "Väntande förfrågningar",
    dias: ["Mån 13", "Tis 14", "Ons 15", "Tor 16", "Fre 17"],
    pagada: "Betald",
    flashLibre: "Blixttid 16:30",
    flashLibreSub: "−25 % · 12 i kön",
    flashTomada: "Blixttid · bokad!",
    flashTomadaSub: "Maja från väntelistan",
    servicios: {
      barba: "Skägg",
      corte: "Klippning",
      corteHombre: "Herrklipp",
      color: "Färgning",
      esmaltado: "Gellack",
      fade: "Fade",
      lash: "Lash lift",
      mechas: "Slingor",
      masaje: "Massage",
      facial: "Ansikte",
    },
    campana: {
      titulo: "Väntar på dig (2)",
      uno: "Sara L. vill boka Gellack · lör 12:00",
      confirmar: "Bekräfta",
      rechazar: "Neka",
      dos: "Jonas K. vill avboka tor 10:00 ·",
      aprobar: "Godkänn?",
    },
    pagos: {
      titulo: "BETALNINGAR IDAG",
      via: "via Stripe",
      monto: "3 250 kr",
      detalle: "5 kortbetalningar · utbetalning till ditt konto i morgon",
    },
    resenas: {
      titulo: "Omdömen",
      nota: "4,9 · 3 nya",
      cita: "”Precis den klippning jag ville ha!” – Sara L.",
      responder: "Svara",
    },
    caja: {
      titulo: "Kassa & beläggning",
      periodo: "denna vecka",
      ingresos: "18 400 kr",
      ingresosEtiqueta: "intäkter",
      ocupacion: "86 %",
      ocupacionEtiqueta: "bokat",
      graficoAria: "Beläggning per dag",
    },
    hoy: {
      titulo: "Idag",
      filas: [
        { hora: "10:00", texto: "Amir · Skägg", estado: "Betald" },
        { hora: "13:00", texto: "Elin · Färgning", estado: "Betalar på plats" },
        { hora: "16:30", texto: "Blixttid", estado: "−25 %" },
      ],
    },
    pasos: {
      semana: {
        titulo: "Hela veckan på en blick",
        texto:
          "Alla bokningar, för hela teamet, på ett ställe. Klicka för att flytta, se vem som betalt och lägg in egna bokningar.",
        chips: ["Alla medarbetare", "Dator och mobil"],
      },
      solicitudes: {
        titulo: "Förfrågningar och avbokningar",
        texto:
          "Du bestämmer: bekräfta eller neka nya bokningar och avbokningar med ett klick – kunden får besked direkt.",
        chips: ["Notis på mobilen", "SMS till kunden"],
      },
      flash: {
        titulo: "Blixttider fyller luckorna",
        texto:
          "En tid blev ledig? Släpp den med rabatt – väntelistan får ett SMS och den som är snabbast bokar.",
        chips: ["Rabatt du väljer", "Väntelista"],
      },
      pagos: {
        titulo: "Betalt innan kunden kommer",
        texto:
          "Kunderna betalar med kort eller Apple Pay när de bokar. Pengarna går direkt till ditt konto via Stripe – vi tar bara 1 %, ingen provision på bokningar.",
        chips: ["Färre uteblivna besök", "Automatisk återbetalning"],
      },
      resenas: {
        titulo: "Omdömen som säljer åt dig",
        texto:
          "Efter varje besök ber vi kunden om ett omdöme. Svara direkt härifrån – betyget syns på din sida.",
        chips: ["Bara riktiga kunder", "Svara offentligt"],
      },
      caja: {
        titulo: "Kassa och statistik",
        texto:
          "Se intäkter, beläggning och vem som är din bästa kund – utan Excel.",
        chips: ["Rapporter", "Kundkort"],
      },
    },
    bienvenida: {
      titulo: "Så ser det ut för dig",
      texto: (p) =>
        `Det här är ${p.negocio}s vy i ${p.nombre} – kalendern, betalningarna och omdömena. Vi visar de viktigaste delarna på en minut.`,
      empezar: "Visa mig runt",
      saltar: "Titta själv",
    },
    final: {
      aria: "Ska vi bli buddies?",
      etiqueta: "Klart på 5 minuter",
      titulo: "Ska vi bli buddies?",
      texto:
        "Din egen kalender på fem minuter – gratis för en person, utan kort. Har du redan ett system flyttar vi över allt åt dig.",
      cta: "Ja, skapa min kalender",
      seguir: "Titta mer",
    },
    meta: {
      titulo: (p) => `Så ser ${p.nombre} ut för dig som företagare`,
      descripcion: (p) =>
        `Prova en demo av ${p.nombre}: kalender, betalningar, omdömen och blixttider.`,
    },
    enlaceInicio: "Se hur det ser ut för dig som företagare",
  },
};
