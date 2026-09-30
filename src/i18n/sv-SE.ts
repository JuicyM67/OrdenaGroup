/**
 * Texterna på svenska för den publika hemsidan, marknaden Sverige (D-026).
 * Undantagsuppdrag i worktree `web` (wp/hemsida): den här filen är svensk,
 * resten av `src/i18n/` är chilensk spanska (D-016).
 *
 * Samma nycklar och samma funktionssignaturer som i `es-CL.ts` för `nav`,
 * `estados`, `hoy`, `landing`, `sitio`, `SITIO_FUNCIONALIDADES`,
 * `SITIO_PRECIOS_TABLA`, `SITIO_PARA_INDUSTRIAS` och `PLANES`
 * (`PLANES_LANDING` utan `precioClp`), så att `satisfies MarketingCopy`
 * (`./marketing.ts`) bevisar formen vid typkontroll.
 *
 * Varumärkesnamnet skrivs aldrig här (hård regel 10): det bor bara i
 * `src/config/brand.ts` och kommer in som `{ nombre }`/`{ tagline }`,
 * precis som i `es-CL.ts`.
 *
 * Marknadsanpassningar mot den chilenska originaltexten:
 * - Inga kundbetalningar i systemet (D-027): ingen handpenning/abono, inget
 *   Mercado Pago, inget RUT/CLP. Abonnemanget (planen) betalas med kort via
 *   Stripe, det nämns bara i en FAQ om fakturering.
 *   Nyckeln `abono` finns kvar där formen kräver den (samma nyckelnamn som
 *   `es-CL.ts`, av typskäl): i `SITIO_FUNCIONALIDADES` och
 *   `landing.beneficios.items` handlar den om "Vi saknar dig"-påminnelser
 *   (F14), inte om betalning.
 * - Inget digitalt stämpelkort i produkten: det är en egen tjänst,
 *   Stampello (stampello.se), som `sitio.partner.stampello` rekommenderar
 *   i stället för att låtsas att det är en funktion härifrån.
 * - Påminnelser går via sms (ClickSend, D-028) och mejl, inte WhatsApp.
 *   Support sker via mejl (ingen chattsupport ännu).
 * - Inga ortsreferenser (Santiago/Providencia/Ñuñoa): neutralt, "svenska
 *   småföretag".
 * - Branscher: barberare, frisörer, hud & skönhet, naprapati & fysioterapi.
 *   Samma id:n som i `es-CL.ts` (`barberias`, `peluquerias`, `estetica`,
 *   `kinesiologia`), bara texten är ny.
 * - Priser nämns aldrig som belopp i klartext: de kommer som redan
 *   formaterade strängar via parametrar (`{ precio }`), som i `es-CL.ts`.
 */
import type { MarketingCopy } from "./marketing";
import type {
  PlanLanding,
  SitioComparacion,
  SitioFuncionalidadSeccion,
  SitioParaIndustria,
  SitioPrecioFila,
} from "./es-CL.marketing";
import type { Trad } from "./index";

// ---------------------------------------------------------------------------
// nav: delad navigering/aria-label (samma nycklar som es-CL.nav)
// ---------------------------------------------------------------------------

export const nav = {
  principal: "Huvudmeny",
  inicio: "Hem",
  hoy: "Idag",
  agenda: "Kalender",
  clientes: "Kunder",
  horasFlash: "Flashtider",
  cajaEInformes: "Kassa och rapporter",
  caja: "Kassa",
  ajustes: "Inställningar",
  cerrarSesion: "Logga ut",
  secciones: "Avsnitt",
  volverAlInicio: "Tillbaka till startsidan",
  buscar: "Sök",
  notificaciones: "Aviseringar",
  notificacionesNuevas: (p: { n: number }): string =>
    `${p.n} ${p.n === 1 ? "ny avisering" : "nya aviseringar"}`,
  masOpciones: "Fler alternativ",
} as const satisfies Trad;

// ---------------------------------------------------------------------------
// estados: statuschips för en bokning (samma nycklar som es-CL.estados)
// ---------------------------------------------------------------------------

export const estados = {
  confirmada: "Bekräftad",
  /** Nyckeln finns av typskäl (samma som es-CL): i Sverige finns ingen
   * handpenning i systemet (D-027), texten är en generisk delbetalning. */
  abonoPagado: "Delbetalning betald",
  sinConfirmar: "Obekräftad",
  confirmo: "Bekräftade",
  confirmoPorWhatsapp: "Bekräftade via sms",
  llego: "Kom",
  noVino: "Kom inte",
  cancelada: "Avbokad",
  listaDeEspera: "Väntelista",
  desdeLista: "Från väntelistan",
  abono: "Delbetalning",
  flash: "Flash",
  flashConDescuento: (p: { porcentaje: number }): string =>
    `Flash −${p.porcentaje}%`,
  pendientePago: "Väntar på betalning",
} as const satisfies Trad;

// ---------------------------------------------------------------------------
// hoy: Hoy.dc.html — ägarens mobilvy (samma nycklar som es-CL.hoy)
// ---------------------------------------------------------------------------

export const hoy = {
  titulo: "Idag",
  proximaReserva: "Nästa bokning",
  siguiente: (p: { relativo: string }): string => `Nästa · ${p.relativo}`,
  relativo: {
    ahora: "nu",
    enMin: (p: { n: number }): string => `om ${p.n} min`,
    enHoras: (p: { h: number; m: number }): string =>
      p.m === 0 ? `om ${p.h} tim` : `om ${p.h} tim ${p.m} min`,
    atrasado: (p: { n: number }): string => `${p.n} min sen`,
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
    diaCerrado: "Du har stängt idag.",
  },
} as const satisfies Trad;

// ---------------------------------------------------------------------------
// landing: engångssidan (samma nycklar som es-CL.landing)
// ---------------------------------------------------------------------------

/** Samma knapp i hero och i sidans avslutning (en enda källa). */
const LANDING_CTA_SKAPA_GRATIS = "Skapa min kalender gratis";

/** Samma råd som i `sitio.inicio` (mejl/sms i stället för WhatsApp, D-028). */
const LANDING_DELA_LANKEN =
  "Lägg den på Instagram och dela den via sms eller mejl.";

export const landing = {
  meta: {
    titulo: (p: { nombre: string }): string =>
      `${p.nombre} — onlinebokning för ditt företag`,
    descripcion: (p: { nombre: string }): string =>
      `${p.nombre} är bokningssystemet för barberare, frisörer, hud & skönhet och naprapater. Dina kunder bokar själva med en länk. Prova gratis.`,
  },
  nav: {
    precios: "Priser",
    preguntas: "Vanliga frågor",
    entrar: "Logga in",
    ctaCrearAgenda: "Skapa min kalender",
  },
  hero: {
    etiqueta: "Bokning för ditt företag",
    titulo: (p: { tagline: string }): string => p.tagline,
    subtitulo:
      "Bokningssystemet för barberare, frisörer, hud & skönhet och naprapater. Dina kunder bokar själva med en länk, utan samtal eller sms fram och tillbaka.",
    ctaPrimario: LANDING_CTA_SKAPA_GRATIS,
    ctaSecundario: "Se en exempelkalender",
    vistaPreviaAria: "Förhandsvisning av kalendern och en bokning",
  },
  heroStats: {
    siempreAbierto: {
      valor: "24/7",
      etiqueta: "Dina kunder bokar när de vill, dag som natt.",
    },
    minutos: {
      valor: "10 min",
      etiqueta:
        "Så lång tid tar det att sätta upp din kalender med de guidade stegen.",
    },
    comision: {
      valor: "0 kr",
      etiqueta: "Vi tar ingen avgift per bokning du får in.",
    },
    texto:
      "Bokningar dygnet runt, utan samtal eller sms fram och tillbaka. Du ser varje tid ordnad i din kalender.",
    cta: "Se hur det funkar",
  },
  comoFunciona: {
    titulo: "Så funkar det",
    pasos: {
      crear: {
        titulo: "Skapa din kalender",
        texto:
          "Lägg upp den på minuter: dina tjänster, ditt team och dina öppettider.",
      },
      compartir: {
        titulo: "Dela din länk",
        texto: LANDING_DELA_LANKEN,
      },
      reservan: {
        titulo: "Ta emot bokningar",
        texto:
          "Dina kunder bokar själva, när de vill. Du ser allt i din kalender.",
      },
    },
  },
  beneficios: {
    titulo: "Allt du behöver för att fylla din kalender",
    items: {
      linkPropio: {
        titulo: "Din egen bokningslänk",
        texto:
          "En sida med din logga och dina färger där kunderna bokar själva, utan appar att installera.",
      },
      agendaPorProfesional: {
        titulo: "Kalender per anställd",
        texto: "Varje person i teamet har sin egen kalender och egna tider.",
      },
      recordatorios: {
        titulo: "Automatiska påminnelser",
        texto:
          "Via sms på betalplanerna, via mejl på gratisplanen. Färre glömda tider, färre tomma luckor.",
      },
      listaDeEspera: {
        titulo: "Väntelista",
        texto:
          "Om någon avbokar meddelar vi den som väntar, och tiden fylls av sig själv.",
      },
      /** Nyckeln `abono` finns av typskäl: i Sverige finns ingen
       * handpenning i systemet (D-027), och det digitala stämpelkortet är
       * numera en fristående tjänst (Stampello, se
       * `sitio.partner.stampello`), inte en del av produkten. Innehållet
       * handlar i stället om automatiska "Vi saknar dig"-påminnelser (F14),
       * en riktig funktion i produkten. */
      abono: {
        titulo: "Vi saknar dig-påminnelser",
        texto:
          "Kunder som inte har varit hos dig på ett tag får en påminnelse automatiskt, så du slipper skriva till dem själv.",
      },
      precioUnico: {
        titulo: "Ett pris för hela ditt företag",
        texto:
          "Inga avgifter per anställd: du betalar ett enda pris, oavsett hur stort teamet är.",
      },
    },
  },
  paraQuien: {
    titulo: "Vem är det för",
    items: {
      barberias: "Barberare",
      peluquerias: "Frisörer",
      esteticaYUnas: "Hud & skönhet",
      kinesiologiaYMasajes: "Naprapati & massage",
    },
  },
  precios: {
    titulo: "Priser",
    subtitulo:
      "Priser per månad, exkl. moms. 30 dagars provperiod på betalplanerna, ingen bindningstid.",
    fundador:
      "De första företagen som ansluter sig betalar halva priset, för alltid (Grundarplanen).",
  },
  preguntas: {
    titulo: "Vanliga frågor",
    items: {
      instalar: {
        pregunta: "Behöver jag installera något?",
        respuesta:
          "Nej. Allt sker i webbläsaren, både för dig och dina kunder.",
      },
      comoReservan: {
        pregunta: "Hur bokar mina kunder?",
        respuesta:
          "De går in på din länk, väljer tjänst, anställd och tid, och är bekräftade direkt. Inga samtal eller sms fram och tillbaka.",
      },
      noLlego: {
        pregunta: "Vad händer om någon inte dyker upp?",
        respuesta:
          'Du markerar "Kom inte" i din kalender, så du ser mönster hos kunder som ofta uteblir.',
      },
      permanencia: {
        pregunta: "Finns det bindningstid?",
        respuesta:
          "Nej. Betalplanerna har 30 dagars provperiod och du kan byta plan eller säga upp när du vill.",
      },
      datos: {
        pregunta: "Vad händer med mina uppgifter och mina kunders?",
        respuesta:
          "De är dina. Du kan exportera dem eller be oss radera dem när du vill.",
      },
      ayudaConfig: {
        pregunta: "Hjälper ni mig att komma igång?",
        respuesta:
          "Du är klar på egen hand på några minuter med de guidade stegen. Behöver du hjälp går det bra att mejla oss.",
      },
    },
  },
  ctaFinal: {
    titulo: "Redo att sluta tappa bokningar?",
    texto:
      "Skapa ditt gratiskonto, utan kort. Vill du ha sms-påminnelser och väntelista har betalplanerna 30 dagars provperiod.",
    boton: LANDING_CTA_SKAPA_GRATIS,
  },
  footer: {
    texto: "Bokningssystemet för svenska småföretag.",
    links: {
      precios: "Priser",
      entrar: "Logga in",
    },
    hechoEnSantiago: "Byggt för svenska småföretag.",
  },
} as const satisfies Trad;

// ---------------------------------------------------------------------------
// sitio: hela den publika webbplatsen (samma nycklar som es-CL.sitio)
// ---------------------------------------------------------------------------

/** Samma konverteringsknapp på hela webbplatsen. */
const SITIO_CTA = LANDING_CTA_SKAPA_GRATIS;

/** Samma branschnamn i undermenyn, sidfoten och index för "Vem är det för". */
const SITIO_BRANSCH = {
  barberias: "Barberare",
  peluquerias: "Frisörer",
  estetica: "Hud & skönhet",
  kinesiologia: "Naprapati & fysioterapi",
} as const;

const SITIO_KOMMER_SNART = "Kommer snart";

export const sitio = {
  nav: {
    /** Enda triggern med en nedfällbar panel (wp/WP-43-nav-a, "Nav A": 4 ord
     * i menyraden, bara "Produkt" öppnar en panel). */
    producto: "Produkt",
    /** Nu en vanlig länk till startsidans "Vem är det för"-sektion, utan
     * egen undermeny (wp/WP-43-nav-a, "Nav A"). */
    paraQuien: "Branscher",
    precios: "Priser",
    /** Samma text som `ventajas.hero.etiqueta` (GUIA §4, samma begrepp): tar
     * till samma sida. */
    porQue: "Varför oss",
    entrar: "Logga in",
    ctaCrearAgenda: landing.nav.ctaCrearAgenda,
    /** Knapp för att stänga den öppna megamenyn eller mobilmenyn. */
    cerrar: "Stäng",
  },
  /** Innehållet i panelen för "Produkt" (wp/WP-43-nav-a, "Nav A"): en enda
   * kolumn med sex punkter (ikon + en rads förklaring) plus det utvalda
   * kortet som puffar för Flashtider. Ingen egen "Vem är det för"/"Resurser"
   * längre: de ämnena är nu egna ord i menyraden (`nav.paraQuien`,
   * `nav.precios`, `nav.porQue`). Samma nycklar och samma teckengräns
   * (`texto` ~60 tecken) som i `es-CL.ts`. Ingen WhatsApp (D-028):
   * påminnelser nämns här som sms. */
  megamenu: {
    titulo: "Allt i ett",
    items: {
      reservas: {
        titulo: "Bokningar",
        texto: "Din bokningslänk, redo att dela.",
      },
      agenda: {
        titulo: "Kalender",
        texto: "Din veckokalender, per anställd.",
      },
      recordatorios: {
        titulo: "Påminnelser",
        texto: "Automatiska påminnelser via sms.",
      },
      listaEspera: {
        titulo: "Väntelista",
        texto: "När någon avbokar fylls tiden av sig själv.",
      },
      /** Samma begrepp som `ventajas.diferencias.items.d` (GUIA §4), här i
       * en kort rad. */
      preguntas: {
        titulo: "Frågor i bokningen",
        texto: "Formuläret anpassas efter din bransch.",
      },
      verTodas: {
        titulo: "Se alla funktioner",
        texto: "Hela listan på en gång.",
      },
    },
    destacado: {
      etiqueta: "Nytt",
      titulo: "Flashtider",
      texto: "Sälj dina lediga tider med rabatt innan de går förlorade.",
      cta: "Se hur det funkar",
    },
  },
  footer: {
    descripcion: (p: { nombre: string }): string =>
      `${p.nombre}, bokningssystemet för svenska småföretag: barberare, frisörer, hud & skönhet och naprapater.`,
    columnas: {
      producto: "Produkt",
      paraQuien: "Vem är det för",
      empresa: "Företag",
    },
    links: {
      funcionalidades: "Funktioner",
      precios: "Priser",
      preguntas: "Vanliga frågor",
      contacto: "Kontakt",
      terminos: "Villkor",
      privacidad: "Integritet",
      ...SITIO_BRANSCH,
    },
    hechoEnSantiago: landing.footer.hechoEnSantiago,
  },
  /** Samma nycklar och funktionssignaturer som `es-CL.sitio.footer2`
   * (WP-hemsida, utforskning "footer.dc.html"). `ciudad` är neutralt
   * "Sverige" (ingen enskild ort, D-026), och `derechos`/`novedad` nämner
   * inget WhatsApp eller belopp (D-027/D-028). */
  footer2: {
    contacto: {
      titulo: "Kontakt",
      ciudad: "Sverige",
      correoAria: "Mejla oss",
    },
    redes: {
      titulo: "Följ oss",
    },
    irA: {
      titulo: "Gå till",
    },
    legal: {
      terminos: "Villkor",
      privacidad: "Integritet",
      derechos: (p: { anio: number }): string =>
        `${p.anio}. Alla rättigheter förbehållna.`,
    },
    novedad: {
      etiqueta: "Nytt",
      texto: "Flashtider redan tillgängliga",
    },
  },
  inicio: {
    /** Samma nycklar och samma funktionssignaturer som `es-CL.sitio.inicio
     * .heroBento` (WP-hemsida). Ingen `heroBento.siguiente` eller
     * `heroBento.cta`/`nav`: samma återanvändning som i `es-CL.ts`, av
     * `hoy.siguiente` (med `hoy.relativo.enMin`), `landing.hero.ctaPrimario`
     * /`ctaSecundario` och `sitio.nav.entrar`/`ctaCrearAgenda`. Påminnelser
     * går via sms, inte WhatsApp (D-028): `link.compartirAria` nämner ingen
     * kanal. */
    heroBento: {
      nuevo: {
        etiqueta: "Nyhet",
        texto: "Flashtider: sälj dina lediga tider",
      },
      /** Kalenderkortet i hero: visar alltid mån–fre, utan koppling till ett
       * riktigt datum. */
      semana: {
        titulo: "Din vecka",
        vistaSemana: "Vecka",
        vistaDia: "Dag",
        dias: {
          lun: "Mån",
          mar: "Tis",
          mie: "Ons",
          jue: "Tor",
          vie: "Fre",
        },
      },
      /** Animerad toast för en ny bokning ovanpå maquetten. `dia` kommer
       * redan formaterad (t.ex. "fre 2 okt"). */
      toast: (p: { dia: string; hora: string }): string =>
        `Ny bokning · ${p.dia} ${p.hora}`,
      link: {
        titulo: "Din bokningslänk",
        copiar: "Kopiera",
        copiado: "Kopierad",
        compartirAria: "Dela din bokningslänk",
      },
      disponible: {
        valor: "24/7",
        pie: "dag som natt",
      },
      /** `titulo`/`pie` är fasta; de procentsatser som rullar (15 %, 10 %,
       * 5 %, 0 kr) byggs av komponenten, inte här. */
      comision: {
        titulo: "Provision",
        pie: "per bokning, alltid",
      },
    },
    /** Samma nycklar och funktionssignaturer som `es-CL.sitio.inicio.intro`
     * (WP-hemsida, utforskning "sida-v2-morka-band.dc.html"). */
    intro: {
      titulo: "Allt ditt företag behöver,",
      tituloDestacado: "inget onödigt.",
      stats: {
        disponible: { valor: "24/7", pie: "öppna bokningar" },
        minutos: { valor: "10 min", pie: "för att komma igång" },
        comision: { valor: "0 kr", pie: "i provision" },
      },
    },
    /** Samma nycklar och funktionssignaturer som `es-CL.sitio.inicio.porQue`
     * (WP-hemsida, utforskning "sida-v1-bento.dc.html"). */
    porQue: {
      etiqueta: "VARFÖR DET FUNKAR",
      titulo: "Färre meddelanden,",
      tituloDestacado: "fler fyllda tider.",
      texto:
        "Fyra skäl till att barberare, frisörer och hudvårdssalonger stannar kvar.",
      tarjetas: {
        reservas: {
          titulo: "Dina kunder bokar själva, när som helst",
          texto:
            "De går in på din länk, väljer tjänst, anställd och tid, och är bekräftade direkt.",
        },
        agenda: {
          titulo: "Din kalender i ordning, på datorn och i mobilen",
        },
        inasistencias: {
          titulo: "Färre uteblivna besök",
          pregunta: "Kom?",
        },
        precio: {
          titulo: "Ett pris för hela ditt företag",
          pie: "anställda, samma pris",
        },
        local: {
          titulo: "Byggt för riktiga företag",
          texto: "Barberare, frisörer, hud & skönhet och naprapater.",
          chip: (p: { n: number }): string => `+${p.n} bokningar denna vecka`,
        },
      },
    },
    usp: {
      reservasSolas: {
        titulo: "Dina kunder bokar själva, när som helst",
        texto:
          "De går in på din länk, väljer tjänst, anställd och tid, och är bekräftade direkt. Inga samtal eller sms fram och tillbaka en och en.",
        puntos: {
          punto1: "Tillgängligt dygnet runt, dag som natt",
          punto2: "Inga appar att installera, varken för dig eller dina kunder",
          punto3: "Fungerar bra på alla mobiler, även med dålig uppkoppling",
        },
      },
      agendaOrdenada: {
        titulo: "Din kalender i ordning, på datorn och i mobilen",
        texto:
          'Varje anställd har sin egen kolumn. I mobilen öppnar du "Idag" och ser hela dagen på en gång.',
        puntos: {
          punto1: "Vecko- och dagsvy på datorn",
          punto2: 'Vyn "Idag" i mobilen, byggd för att använda med en hand',
          punto3: "Manuella bokningar och tidsbyten direkt",
        },
      },
      menosInasistencias: {
        titulo: "Färre uteblivna besök",
        texto:
          "Markera vem som kom och vem som inte dök upp, direkt i mobilen. Automatiska sms-påminnelser kommer snart.",
        puntos: {
          punto1: '"Kom" och "Kom inte" med en knapptryckning',
          punto2: `Sms-påminnelser — ${SITIO_KOMMER_SNART}`,
          punto3: `Historik över uteblivna besök per kund — ${SITIO_KOMMER_SNART}`,
        },
      },
      precioUnico: {
        titulo: "Ett pris för hela ditt företag",
        texto:
          "Du betalar ett enda pris för ditt företag, oavsett hur stort teamet är. Ingen avgift per anställd eller bokning.",
        puntos: {
          punto1: "Ingen avgift för varje anställd du lägger till",
          punto2: "Ingen avgift per bokning",
          punto3: "Gratisplan för att komma igång med en anställd",
        },
      },
    },
    /** Branscher i bucklan ovanför hero på startsidan (wp/hemsida): "För
     * alla verksamheter som jobbar med tider". Detaljerna för varje bransch
     * finns i `SITIO_RUBROS_MARQUEE`, utanför `Trad`. */
    marquee: {
      titulo: "För alla verksamheter som jobbar med tider",
      aria: "Branscher som bokar tid med en kalender",
    },
    /** Sektionen som förklarar Flashtider på startsidan (wp/hemsida): `mock`
     * är de korta etiketterna i den animerade mockupen, inte text som en
     * riktig kund får. */
    flash: {
      etiqueta: "Flashtider",
      titulo: "Sälj dina lediga tider innan de går förlorade",
      texto:
        "När en tid blir ledig i sista minuten erbjuder du den med rabatt till dina kunder. Den som bokar först får den.",
      puntos: {
        punto1: "Du väljer rabatten och hur länge den gäller",
        punto2: "Vi skickar ett sms till dina kunder",
        punto3: "Så fort någon bokar stängs den för de andra",
      },
      mock: {
        horaLibre: (p: { hora: string }): string => `Ledig tid ${p.hora}`,
        descuento: (p: { pct: number }): string => `−${p.pct}%`,
        notificacion: (p: { n: number }): string =>
          `Avisering skickad till ${p.n} ${p.n === 1 ? "kund" : "kunder"}`,
        reservada: "Bokad!",
      },
      /** Samma nycklar och funktionssignatur som
       * `es-CL.sitio.inicio.flash.reservadaPor`. */
      reservadaPor: (p: { nombre: string }): string => `Bokad av ${p.nombre}!`,
    },
    /** Korta etiketter för de fyra stegen i den animerade mockupen av
     * bokningsflödet på startsidan (wp/hemsida), samma steg som en riktig
     * kund ser (se `landing.hero` och `landing.comoFunciona`). */
    flujo: {
      etiqueta: "Onlinebokning",
      titulo: "Att boka tar mindre än en minut",
      texto: "Så här ser din kund hela processen, från början till slut.",
      pasos: {
        servicio: "Väljer tjänst",
        hora: "Väljer tid",
        datos: "Fyller i sina uppgifter",
        confirmada: "Bokad!",
      },
    },
    /** Titel för sektionen med alla funktioner i en överblick (bento grid)
     * på startsidan (wp/hemsida). Ersätter inte `funcionalidades.hero` här
     * nedanför, som är oförändrad. */
    bento: {
      titulo: "Allt du behöver för att fylla din kalender",
      subtitulo:
        "En snabb överblick över allt som ingår, från bokningslänken till vardagen.",
    },
    precioDesde: (p: { precio: string }): string =>
      `Börja gratis. Betalplaner från ${p.precio} i månaden.`,
    verFuncionalidades: "Se alla funktioner",
  },
  /** Sista konverteringsbandet på startsidan (CTA band, wp/hemsida): har en
   * bakgrundsbild, därför behövs en egen alt-text. */
  cta: {
    fondoAlt: "En frisör som tittar på sin mobil mellan kunder, i sin salong.",
  },
  funcionalidades: {
    meta: {
      titulo: (p: { nombre: string }): string => `Funktioner — ${p.nombre}`,
      descripcion: (p: { nombre: string }): string =>
        `Allt som ingår i ${p.nombre}: bokningslänk, kalender per anställd, Idag i mobilen och sms-påminnelser.`,
    },
    hero: {
      titulo: "Allt du behöver för att fylla din kalender",
      texto:
        "Från din bokningslänk till den dagliga kalendern, byggt för företag med en eller flera anställda.",
    },
    proximamenteBadge: SITIO_KOMMER_SNART,
    cta: {
      titulo: "Redo att få ordning på din kalender?",
      boton: SITIO_CTA,
    },
  },
  precios: {
    meta: {
      titulo: (p: { nombre: string }): string => `Priser — ${p.nombre}`,
      descripcion: (p: { nombre: string }): string =>
        `Priser för ${p.nombre} per månad, ett enda pris per företag. 30 dagars provperiod på betalplanerna, ingen bindningstid.`,
    },
    hero: {
      titulo: "Ett pris för hela ditt företag",
      texto: landing.precios.subtitulo,
    },
    /** Samma nyckel som `es-CL.sitio.precios.masElegido`. */
    masElegido: "Mest vald",
    compararTitulo: "Jämför planerna",
    fundador: landing.precios.fundador,
    /** Samma nycklar som `es-CL.sitio.precios.extra`. */
    extra: {
      raknare: {
        titulo: "Så mycket kostar det per anställd",
        texto: (p: { n: number }): string =>
          `Med ${p.n} ${p.n === 1 ? "anställd" : "anställda"} i teamet betalar du fortfarande samma pris för din plan.`,
        sufijo: "anställda",
      },
      ingaAvgifter: {
        titulo: "Inga överraskningar på fakturan",
        items: {
          a: "Inga avgifter per bokning",
          b: "Inga startavgifter",
          c: "Ingen bindningstid",
          d: "Avsluta när du vill",
        },
      },
      jamfor: {
        texto: "Vill du se hur vi jämför oss med andra alternativ?",
        cta: "Se jämförelsen",
      },
    },
    faq: {
      iva: {
        pregunta: "Ingår moms i priserna?",
        respuesta:
          "Nej. Priserna du ser är exklusive moms; den läggs på när du betalar.",
      },
      cambiarPlan: {
        pregunta: "Kan jag byta plan när jag vill?",
        respuesta:
          "Ja. Du uppgraderar eller nedgraderar när du vill, utan extra kostnad eller bindningstid.",
      },
      masWhatsapp: {
        pregunta: "Vad händer om sms-kvoten tar slut?",
        respuesta:
          "Du kan köpa ett extra sms-paket på 100 sms för 69 kr exkl. moms, eller uppgradera till en plan med fler sms ingående.",
      },
      permanencia: {
        pregunta: landing.preguntas.items.permanencia.pregunta,
        respuesta: landing.preguntas.items.permanencia.respuesta,
      },
      fundador: {
        pregunta: "Vad är Grundarplanen?",
        respuesta:
          "De första företagen som ansluter sig betalar halva priset för sin plan, för alltid.",
      },
    },
  },
  /** Egen sida för Flashtider (F13 i MVP_SPEC.md). Kunderna nås via sms och
   * mejl (D-028: ingen WhatsApp i Sverige), samma nycklar som
   * `es-CL.sitio.flashPagina`. */
  flashPagina: {
    meta: {
      titulo: (p: { nombre: string }): string => `Flashtider — ${p.nombre}`,
      descripcion: (p: { nombre: string }): string =>
        `Sälj dina lediga tider med rabatt innan de går förlorade, med ${p.nombre}. Du väljer rabatten och hur länge den gäller.`,
    },
    hero: {
      etiqueta: "Flashtider",
      titulo: "Sälj dina lediga tider innan de går förlorade",
      texto:
        "När en tid blir ledig i sista minuten erbjuder du den med rabatt till dina kunder. Den som bokar först får den.",
      cta: SITIO_CTA,
    },
    comoFunciona: {
      titulo: "Så funkar det",
      pasos: {
        uno: {
          titulo: "Markera den lediga tiden",
          texto: "Välj tiden som blev ledig och rabatten, med ett klick.",
        },
        dos: {
          titulo: "Vi meddelar dina kunder",
          texto:
            "De får ett sms eller mejl med erbjudandet och länken för att boka direkt.",
        },
        tres: {
          titulo: "Stängs så fort någon bokar",
          texto:
            "Den som bokar först får tiden; de andra ser att den redan är borta.",
        },
      },
    },
    beneficios: {
      titulo: "Varför det lönar sig",
      items: {
        a: {
          titulo: "Fyll tider som annars går förlorade",
          texto:
            "Varje ledig tid du säljer med rabatt är pengar som annars skulle bli 0 kr.",
        },
        b: {
          titulo: "Du bestämmer rabatten",
          texto:
            "Du väljer procenten och hur länge erbjudandet gäller, tid för tid.",
        },
        c: {
          titulo: "Via sms och mejl",
          texto:
            "Dina kunder får erbjudandet direkt i mobilen eller mejlen, utan extra app.",
        },
        d: {
          titulo: "Stängs av sig själv",
          texto:
            "Så fort någon bokar försvinner erbjudandet för de andra. Inga dubbelbokningar.",
        },
      },
    },
    ejemplo: {
      titulo: "Ett räkneexempel",
      texto:
        "En ledig timme värd 450 kr som du säljer med 20 % rabatt ger 360 kr, i stället för 0 kr.",
    },
    faq: {
      titulo: "Vanliga frågor",
      items: {
        a: {
          pregunta: "Hur länge gäller en flashtid?",
          respuesta:
            "Du bestämmer: den kan gälla några minuter eller ända fram till tiden för besöket.",
        },
        b: {
          pregunta: "Får mina kunder erbjudandet via sms?",
          respuesta:
            "Ja, via sms och mejl. Ingen app behövs för att ta emot det.",
        },
        c: {
          pregunta: "Vad händer om ingen bokar flashtiden?",
          respuesta:
            "Inget särskilt: tiden förblir ledig precis som innan, utan kostnad eller bindning.",
        },
      },
    },
    cta: {
      titulo: "Redo att sälja dina lediga tider?",
      texto:
        "Skapa ditt gratiskonto och aktivera din första flashtid på några minuter.",
      boton: SITIO_CTA,
    },
  },
  /** Egen sida "Varför välja oss": sex konkreta fördelar plus en ärlig
   * jämförelse mot det andra alternativet, med källa och datum i
   * `comparacion.nota`. Samma nycklar som `es-CL.sitio.ventajas`; detaljerna
   * per rad ligger i `SITIO_COMPARACION`, utanför `Trad`. */
  ventajas: {
    meta: {
      titulo: (p: { nombre: string }): string =>
        `Varför välja oss — ${p.nombre}`,
      descripcion: (p: { nombre: string }): string =>
        `Sex konkreta fördelar med ${p.nombre}, och en ärlig jämförelse med Bokadirekt.`,
    },
    hero: {
      etiqueta: "Varför välja oss",
      titulo: "Sex skäl att välja en kalender byggd för ditt företag",
      texto:
        "Ingen finstilt text: här ser du vad som faktiskt ingår i din plan, och en ärlig jämförelse med det andra alternativet du förmodligen tittar på.",
    },
    items: {
      a: {
        titulo: "Ingen avgift per bokning",
        texto:
          "Du betalar din månadsplan och inget mer. Vi tar aldrig en procentsats för varje tid dina kunder bokar.",
      },
      b: {
        titulo: "Ett pris för hela ditt företag",
        texto:
          "Priset stiger inte för att du lägger till fler anställda: du betalar en plan, inte en avgift per person.",
      },
      c: {
        titulo: "Din egen bokningslänk",
        texto:
          "En sida med din logga och dina färger där kunderna bokar själva, redo att dela på Instagram.",
      },
      d: {
        titulo: "Flashtider",
        texto:
          "Sälj dina lediga tider med rabatt innan de går förlorade, i stället för att låta dem stå tomma.",
      },
      e: {
        titulo: "Automatisk väntelista",
        texto:
          "Om någon avbokar meddelar vi den som väntar, och tiden fylls av sig själv.",
      },
      f: {
        titulo: "Support från riktiga personer",
        texto:
          "Vi svarar dig via mejl, på svenska, utan en automatisk kundtjänstrobot.",
      },
    },
    comparacion: {
      titulo: "Så skiljer vi oss från Bokadirekt",
      texto:
        "Bokadirekt är förmodligen det andra alternativet du tittar på. Här är fakta, sida vid sida.",
      /** Källa och datum för siffrorna i `SITIO_COMPARACION` (utanför
       * `Trad`): utan detta är varje siffra om konkurrenten ett påstående
       * utan grund. */
      nota: "Priser enligt Bokadirekts prissida (business.bokadirekt.se/abonnemang), kontrollerade 29 september 2026.",
      /** En ärlig mening om var konkurrenten är starkare (uttrycklig del av
       * uppdraget, inte valfri). */
      honestidad:
        "Bokadirekt är starkare på att ge dig nya kunder via sin egen marknadsplats: om det är viktigt för dig just nu, är det värt att veta.",
    },
    /** Kort lista med skillnader mot konkurrenten (samma uppdrag som
     * `sitio.ventajas.diferencias` i `es-CL.marketing.ts`): kompletterar
     * `comparacion` med en positiv vinkel, utan siffror. */
    diferencias: {
      titulo: "Så skiljer vi oss",
      items: {
        a: {
          titulo: "Dina kunder, inte en marknadsplats",
          texto:
            "Du delar din egen bokningslänk: dina kunder ser bara ditt företag, aldrig en lista med konkurrenter.",
        },
        b: {
          titulo: "Inga provisioner eller dolda avgifter",
          texto:
            "Du betalar din månadsplan och inget mer. Vi tar aldrig en procentsats per bokning.",
        },
        c: {
          titulo: "Flashtider fyller luckorna",
          texto:
            "Sälj dina lediga tider med rabatt i sista minuten, i stället för att låta dem stå tomma.",
        },
        d: {
          titulo: "Frågor anpassade efter din bransch",
          texto:
            "Bokningsformuläret ställer rätt frågor för barberare, frisörer, skönhet eller naprapati, utan onödiga fält.",
        },
      },
    },
    cta: {
      titulo: "Redo att testa utan bindningstid?",
      boton: SITIO_CTA,
    },
  },
  para: {
    titulo: "Vem är det för",
    subtitulo: "Välj din bransch för att se exempel som passar dig.",
    /** Rubrik över exempeltjänsterna i `SitioParaIndustria.servicios` på
     * varje branschsida (wp/hemsida). */
    serviciosTitulo: "Exempel på tjänster",
  },
  preguntas: {
    meta: {
      titulo: (p: { nombre: string }): string => `Vanliga frågor — ${p.nombre}`,
      descripcion: (p: { nombre: string }): string =>
        `Svar om hur du kommer igång, hur dina kunder bokar, priser och hur vi hanterar dina uppgifter i ${p.nombre}.`,
    },
    hero: {
      titulo: "Vanliga frågor",
      texto: "Hittar du inte ditt svar här? Mejla oss.",
    },
    grupos: {
      empezar: {
        titulo: "Komma igång",
        preguntas: {
          instalar: {
            pregunta: landing.preguntas.items.instalar.pregunta,
            respuesta: landing.preguntas.items.instalar.respuesta,
          },
          cuantoDemora: {
            pregunta: "Hur lång tid tar det att sätta upp?",
            respuesta:
              "Mindre än 10 minuter med de guidade stegen: tjänster, team, öppettider och din bokningslänk.",
          },
          ayudaConfig: {
            pregunta: landing.preguntas.items.ayudaConfig.pregunta,
            respuesta: landing.preguntas.items.ayudaConfig.respuesta,
          },
        },
      },
      reservas: {
        titulo: "Bokningar",
        preguntas: {
          comoReservan: {
            pregunta: landing.preguntas.items.comoReservan.pregunta,
            respuesta: landing.preguntas.items.comoReservan.respuesta,
          },
          noLlego: {
            pregunta: landing.preguntas.items.noLlego.pregunta,
            respuesta: landing.preguntas.items.noLlego.respuesta,
          },
          cambiarHora: {
            pregunta: "Kan mina kunder byta eller avboka sin tid själva?",
            respuesta:
              "Kommer snart. Just nu kan du flytta eller avboka den från din kalender.",
          },
        },
      },
      pagos: {
        titulo: "Priser",
        preguntas: {
          permanencia: {
            pregunta: landing.preguntas.items.permanencia.pregunta,
            respuesta: landing.preguntas.items.permanencia.respuesta,
          },
          iva: {
            pregunta: "Ingår moms i priserna?",
            respuesta:
              "Nej. Priserna du ser är exklusive moms; den läggs på när du betalar.",
          },
          /** Nyckeln `abono` finns av typskäl (samma som es-CL): i Sverige
           * betalas inget via systemet av kunderna (D-027). Frågan handlar
           * i stället om hur själva prenumerationen (planen) betalas. */
          abono: {
            pregunta: "Hur betalar jag min prenumeration?",
            respuesta:
              "Med kort, automatiskt varje månad via vår betaltjänst Stripe.",
          },
        },
      },
      datos: {
        titulo: "Uppgifter och säkerhet",
        preguntas: {
          datos: {
            pregunta: landing.preguntas.items.datos.pregunta,
            respuesta: landing.preguntas.items.datos.respuesta,
          },
          consentimiento: {
            pregunta: "Frågar ni om lov innan ni skriver till mina kunder?",
            respuesta:
              "Ja. Innan de bokar godkänner de villkoren, och rutan för marknadsföring är aldrig förikryssad.",
          },
          dondeViven: {
            pregunta: "Var lagras mina uppgifter?",
            respuesta:
              "På molnservrar, med skyddad åtkomst så att bara du och ditt team ser uppgifterna om ditt företag.",
          },
        },
      },
    },
  },
  contacto: {
    meta: {
      titulo: (p: { nombre: string }): string => `Kontakt — ${p.nombre}`,
      descripcion: (p: { nombre: string }): string =>
        `Mejla oss så hjälper vi dig att komma igång med ${p.nombre}.`,
    },
    hero: {
      titulo: "Hör av dig",
      texto: "Skriv till oss så hjälper vi dig att komma igång.",
    },
    /** Nyckeln `whatsapp` finns av typskäl (samma som es-CL): i Sverige
     * finns ingen WhatsApp-support ännu, bara mejl. Innehållet handlar om
     * hjälp att komma igång, `correo` nedan är den allmänna kontaktvägen. */
    whatsapp: {
      titulo: "Vi hjälper dig igång",
      texto:
        "Mejla oss så svarar vi på dina frågor och hjälper dig sätta upp din kalender.",
      boton: "Mejla oss",
    },
    correo: {
      titulo: "Skriv till oss",
      texto: "Berätta om ditt företag så hör vi av oss så snart vi kan.",
      boton: "Skicka mejl",
    },
    onboarding: {
      titulo: "Vi hjälper dig komma igång",
      texto:
        "Vi guidar dig genom uppsättningen på ett video- eller telefonmöte, var i Sverige ditt företag än ligger.",
    },
  },
  /** Rekommendation till en fristående tjänst, inte en del av produkten:
   * det digitala stämpelkortet erbjuds av Stampello (stampello.se), ett
   * separat bolag. Samma nycklar som `es-CL.sitio.partner.stampello`. */
  partner: {
    stampello: {
      etiqueta: "Rekommenderas",
      titulo: "Digitalt stämpelkort med Stampello",
      texto:
        "Belöna dina återkommande kunder med ett digitalt stämpelkort. Stampello är en fristående tjänst, gjord för företag som ditt.",
      cta: "Upptäck Stampello",
      url: "https://stampello.se",
      tarjeta: {
        sellosEtiqueta: "STÄMPLAR",
        premioEtiqueta: (p: { n: number }): string => `${p.n} STÄMPLAR GER`,
      },
    },
  },
} as const satisfies Trad;

// ---------------------------------------------------------------------------
// SITIO_FUNCIONALIDADES
// ---------------------------------------------------------------------------

export const SITIO_FUNCIONALIDADES: readonly SitioFuncionalidadSeccion[] = [
  {
    id: "link-reservas",
    etiqueta: "Bokning online",
    titulo: "Din bokningslänk, redo att dela",
    texto:
      "Varje företag får sin egen bokningssida. Dina kunder väljer tjänst, anställd och tid, och är bekräftade direkt, utan samtal eller sms fram och tillbaka.",
    puntos: [
      "Sida med din logga och dina färger, på din egen länk",
      'Välj tjänst, anställd eller "Vem som helst", dag och tid',
      "Fungerar bra på alla mobiler, även med dålig uppkoppling",
    ],
    proximamente: false,
  },
  {
    id: "agenda",
    etiqueta: "För vardagen",
    titulo: "En kalender i ordning, per anställd",
    texto:
      "Se hela veckan eller en dag, med en kolumn för varje anställd. Det dina kunder bokar dyker upp automatiskt, utan att du behöver skriva ner det.",
    puntos: [
      "Vecko- och dagsvy",
      "En kolumn per anställd",
      "Tiderna räknas ut automatiskt: buffertar, öppettider och personal",
    ],
    proximamente: false,
  },
  {
    id: "hoy",
    etiqueta: "I mobilen",
    titulo: "Dagens schema, i fickan",
    texto:
      'Öppna "Idag" i mobilen och se dagens tider, markera vem som kom och vem som inte dök upp, utan att gå in på datorn.',
    puntos: [
      "Dagens lista sorterad efter tid",
      "Knapparna Kom och Kom inte",
      "Byggt för att använda med en hand",
    ],
    proximamente: false,
  },
  {
    id: "reservas-manuales",
    etiqueta: "Full kontroll",
    titulo: "Lägg till och flytta tider själv",
    texto:
      "Registrera en kund som kommer utan bokning, flytta en tid eller avboka den, allt från samma kalender.",
    puntos: [
      "Manuella bokningar för drop-in-kunder",
      "Flytta en tid till en annan dag eller anställd på sekunder",
      "Avboka en tid när det behövs",
    ],
    proximamente: false,
  },
  {
    id: "ajustes",
    etiqueta: "Konfiguration",
    titulo: "Hela ditt företag, på ett ställe",
    texto:
      "Ställ in dina tjänster, ditt team, dina öppettider och dina bokningsregler. Ändringarna syns direkt på din bokningssida.",
    puntos: [
      "Tjänster: namn, längd, pris och buffert",
      "Anställda: egna tider och vilka tjänster de utför",
      "Öppettider och regler, med minsta och största framförhållning",
    ],
    proximamente: false,
  },
  {
    id: "recordatorios",
    etiqueta: SITIO_KOMMER_SNART,
    titulo: "Automatiska påminnelser via sms",
    texto:
      "Färre glömda tider: dina kunder får en påminnelse innan sin tid, och kan bekräfta eller säga till att de behöver boka om.",
    puntos: [
      "Bekräftelse direkt vid bokning",
      "Påminnelse innan tiden, med exakt datum",
      "Mejl som backup om sms:et inte går fram",
    ],
    proximamente: true,
  },
  {
    id: "lista-espera",
    etiqueta: SITIO_KOMMER_SNART,
    titulo: "När någon avbokar fylls tiden av sig själv",
    texto:
      "Om en dag är fullbokad ställer sig dina kunder i väntelistan. Så fort en tid blir ledig får de automatiskt besked.",
    puntos: [
      "Anmälan per tjänst och dag",
      "Automatiskt besked så fort någon avbokar",
      "Den som svarar först får tiden",
    ],
    proximamente: true,
  },
  {
    id: "abono",
    etiqueta: SITIO_KOMMER_SNART,
    titulo: "Vi saknar dig-påminnelser till kunder som uteblivit",
    texto:
      "Kunder som inte har bokat på ett tag får ett automatiskt meddelande som påminner dem om att boka igen.",
    puntos: [
      "Du väljer efter hur många veckor påminnelsen skickas",
      "Skickas bara till kunder som gett sitt samtycke",
      "Max en påminnelse per period, ingen spam",
    ],
    proximamente: true,
  },
  {
    id: "fichas-clientes",
    etiqueta: SITIO_KOMMER_SNART,
    titulo: "Varje kunds historik, till hands",
    texto:
      "Hur många gånger de har varit hos dig, om de har uteblivit tidigare och dina egna anteckningar, allt på ett kundkort.",
    puntos: [
      "Historik över besök och uteblivna tider",
      "Privata anteckningar för ditt team",
      "Snabb sökning på namn eller telefonnummer",
    ],
    proximamente: true,
  },
  {
    id: "reportes",
    etiqueta: SITIO_KOMMER_SNART,
    titulo: "Hur det går för dig, i siffror",
    texto:
      "Intäkter för dagen, veckan och månaden, plus en sammanfattning av tiderna du fått in tack vare väntelistan.",
    puntos: [
      "Intäkter per dag, vecka och månad",
      "Uteblivna besök de senaste 30 dagarna",
      "Veckovis sammanfattning av återfyllda tider",
    ],
    proximamente: true,
  },
];

// ---------------------------------------------------------------------------
// SITIO_PRECIOS_TABLA
// ---------------------------------------------------------------------------

export const SITIO_PRECIOS_TABLA: readonly SitioPrecioFila[] = [
  {
    funcion: "Anställda",
    valores: {
      gratis: "1",
      emprende: "1",
      equipo: "Upp till 5",
      local: "Upp till 12",
    },
  },
  {
    funcion: "Påminnelser",
    valores: {
      gratis: "Via mejl",
      emprende: "Sms, 50/månad",
      equipo: "Sms, 150/månad",
      local: "Sms, 300/månad",
    },
  },
  {
    funcion: "Väntelista",
    valores: { gratis: "–", emprende: "✓", equipo: "✓", local: "✓" },
  },
  {
    funcion: "Flashtider",
    valores: { gratis: "–", emprende: "–", equipo: "✓", local: "✓" },
  },
  {
    funcion: "Vi saknar dig-påminnelser",
    valores: { gratis: "–", emprende: "–", equipo: "✓", local: "✓" },
  },
  {
    funcion: "Rapporter",
    valores: { gratis: "–", emprende: "–", equipo: "✓", local: "✓" },
  },
  {
    funcion: "Support",
    valores: {
      gratis: "Via mejl",
      emprende: "Via mejl",
      equipo: "Via mejl",
      local: "Prioriterad",
    },
  },
];

// ---------------------------------------------------------------------------
// SITIO_COMPARACION: jämförelse mot Bokadirekt (business.bokadirekt.se/
// abonnemang, priser kontrollerade 29 september 2026, se
// `sitio.ventajas.comparacion.nota`). Bara belagda fakta: där ett fält inte
// går att verifiera på deras prissida utelämnas raden helt, i stället för
// att gissa en siffra eller skriva "ej angivet".
// ---------------------------------------------------------------------------

export const SITIO_COMPARACION: SitioComparacion = {
  competidores: ["Bokadirekt"],
  filas: [
    {
      aspecto: "Pris från",
      nosotros: "0 kr (Gratis)",
      valores: ["0 kr (Free)"],
    },
    {
      aspecto: "Användare i priset",
      nosotros: "Hela företaget (upp till 5/12 i Team/Företag)",
      valores: ["1 användare per paket"],
    },
    {
      aspecto: "Uppsägning",
      nosotros: "Ingen bindningstid, avsluta när du vill",
      valores: ["3 månaders uppsägningstid"],
    },
    {
      aspecto: "Marknadsplats för nya kunder",
      nosotros: "Nej – din egen bokningslänk, kunderna ser bara dig",
      valores: ["Ja"],
    },
    {
      aspecto: "Paketpris med betald synlighet",
      nosotros:
        "299 / 499 / 799 kr per månad, samma synlighet för alla (din egen sida)",
      valores: [
        "Mini 295 / Plus 395 / Premium 695 kr per månad, högre paket ger bättre placering i sökresultat",
      ],
    },
  ],
};

// ---------------------------------------------------------------------------
// SITIO_PARA_INDUSTRIAS
// ---------------------------------------------------------------------------

export const SITIO_PARA_INDUSTRIAS: readonly SitioParaIndustria[] = [
  {
    id: "barberias",
    nombre: SITIO_BRANSCH.barberias,
    meta: {
      titulo: (p) => `Barberare — ${p.nombre}`,
      descripcion: (p) =>
        `Onlinebokning för barberare med ${p.nombre}: kalender per barberare, manuella bokningar och din egen bokningslänk.`,
    },
    hero: {
      titulo: "Bokning för barberare, utan samtal fram och tillbaka",
      texto:
        "Dina kunder bokar sin klippning eller skäggtrimning själva, via din länk. Du ser din dag i ordning, med eller utan bokad tid.",
    },
    beneficios: [
      "Kalender per barberare, var och en med egna tider",
      "Manuella bokningar för dem som kommer utan att ha bokat",
      "Markera Kom eller Kom inte direkt i mobilen",
    ],
    servicios: [
      { nombre: "Klippning", minutos: 30 },
      { nombre: "Skäggtrimning", minutos: 20 },
      { nombre: "Klippning + skägg", minutos: 45 },
    ],
    faq: [
      {
        pregunta: "Kan jag ha flera barberare i samma kalender?",
        respuesta: "Ja. Varje barberare har sina egna tider och egna tjänster.",
      },
      {
        pregunta: "Funkar det om jag jobbar själv, utan lokal?",
        respuesta:
          "Ja. Gratisplanen är för en anställd och inkluderar redan din bokningslänk.",
      },
    ],
    cta: SITIO_CTA,
  },
  {
    id: "peluquerias",
    nombre: SITIO_BRANSCH.peluquerias,
    meta: {
      titulo: (p) => `Frisörer — ${p.nombre}`,
      descripcion: (p) =>
        `Onlinebokning för frisörer med ${p.nombre}: tjänster med rätt längd och kalender per stylist.`,
    },
    hero: {
      titulo: "Din frisersalong, med kalendern i ordning",
      texto:
        "Klippning, färgning, behandlingar: varje tjänst med sin verkliga längd, så att kalendern inte blir rörig.",
    },
    beneficios: [
      "Tjänster med den längd som passar var och en",
      "Kalender per stylist, med egna tider",
      "Din bokningslänk att dela på Instagram",
    ],
    servicios: [
      { nombre: "Klippning", minutos: 45 },
      { nombre: "Helfärgning", minutos: 120 },
      { nombre: "Hårbehandling", minutos: 40 },
      { nombre: "Styling", minutos: 30 },
    ],
    faq: [
      {
        pregunta: "Kan jag lägga in långa tjänster, som färgning?",
        respuesta:
          "Ja. Varje tjänst har sin egen längd, och kalendern respekterar den tiden.",
      },
      {
        pregunta: "Kan mina kunder välja vilken stylist de vill ha?",
        respuesta:
          'Ja, eller så väljer de "Vem som helst" om de inte har någon preferens.',
      },
    ],
    cta: SITIO_CTA,
  },
  {
    id: "estetica",
    nombre: SITIO_BRANSCH.estetica,
    meta: {
      titulo: (p) => `Hud & skönhet — ${p.nombre}`,
      descripcion: (p) =>
        `Onlinebokning för hud- och skönhetsvård med ${p.nombre}: kalender per behandlare och buffert mellan behandlingar.`,
    },
    hero: {
      titulo: "Hud- och skönhetsvård, bokat utan sms fram och tillbaka",
      texto:
        "Dina kunder bokar manikyr, pedikyr eller en ansiktsbehandling via din länk, utan att skriva till dig en och en.",
    },
    beneficios: [
      "Kalender per behandlare, med buffert mellan tiderna",
      "Neutrala tjänstenamn, anpassade för din bransch",
      "Manuella bokningar för dina stamkunder",
    ],
    servicios: [
      { nombre: "Manikyr", minutos: 45 },
      { nombre: "Pedikyr", minutos: 50 },
      { nombre: "Ansiktsbehandling", minutos: 60 },
    ],
    faq: [
      {
        pregunta: "Kan jag lägga in tid mellan en bokning och nästa?",
        respuesta:
          "Ja, med bufferten för varje tjänst, som räknas in automatiskt när lediga tider visas.",
      },
      {
        pregunta: "Kan jag ha fler än en behandlare?",
        respuesta:
          "Ja. Varje behandlare har sin egen kalender och egna tjänster.",
      },
    ],
    cta: SITIO_CTA,
  },
  {
    id: "kinesiologia",
    nombre: SITIO_BRANSCH.kinesiologia,
    meta: {
      titulo: (p) => `Naprapati & fysioterapi — ${p.nombre}`,
      descripcion: (p) =>
        `Onlinebokning för naprapater och fysioterapeuter med ${p.nombre}: neutrala tjänstenamn och kalender per behandlare.`,
    },
    hero: {
      titulo: "Naprapati och fysioterapi, med tiderna i ordning",
      texto:
        "Dina patienter bokar en behandling via din länk. Du väljer själv vilket namn du vill använda för varje tjänst, utan kliniska detaljer.",
    },
    beneficios: [
      "Neutrala tjänstenamn, utan hälsouppgifter",
      "Kalender per behandlare, med rätt längd för varje session",
      "Privata anteckningar, utan fält som lockar till hälsouppgifter",
    ],
    servicios: [
      { nombre: "Naprapatbehandling", minutos: 45 },
      { nombre: "Behandling (60 min)", minutos: 60 },
      { nombre: "Avslappnande massage", minutos: 50 },
    ],
    faq: [
      {
        pregunta: "Kan jag skriva patientens diagnos i tjänstenamnet?",
        respuesta:
          'Vi rekommenderar det inte: använd ett allmänt namn, som "Naprapatbehandling", och spara de kliniska detaljerna i din egen journal, utanför systemet.',
      },
      {
        pregunta: "Vem kan se anteckningarna på en bokning?",
        respuesta:
          "Bara du och ditt team. Vi ber dig att inte skriva hälsouppgifter där heller.",
      },
    ],
    cta: SITIO_CTA,
  },
];

// ---------------------------------------------------------------------------
// SITIO_RUBROS_MARQUEE: branscher i bucklan ovanför hero på startsidan
// (wp/hemsida). Ligger inte i `sitio` eftersom det är en lista med
// emoji/namn-par, inte en hylla av `Trad` (samma skäl som listorna ovan).
// Emojin är en del av bandets design, inte produkttext, så den räknas inte
// med i sv-SE.test.ts förbjudna ord/varumärkeskontroll (som bara läser
// strängar, inte emoji). Naprapati ersätter kinesiología (D-026: annan
// bransch i Sverige).
// ---------------------------------------------------------------------------

export const SITIO_RUBROS_MARQUEE: readonly {
  readonly emoji: string;
  readonly nombre: string;
}[] = [
  { emoji: "💈", nombre: "Barberare" },
  { emoji: "✂️", nombre: "Frisör" },
  { emoji: "💅", nombre: "Naglar" },
  { emoji: "👁️", nombre: "Fransar" },
  { emoji: "✏️", nombre: "Bryn" },
  { emoji: "🧴", nombre: "Hudvård" },
  { emoji: "💆", nombre: "Massage" },
  { emoji: "🦴", nombre: "Naprapati" },
  { emoji: "🦵", nombre: "Fysioterapi" },
  { emoji: "🧠", nombre: "Psykolog" },
  { emoji: "🥦", nombre: "Kostrådgivare" },
  { emoji: "🏋️", nombre: "Personlig träning" },
  { emoji: "🧘", nombre: "Yoga" },
  { emoji: "🤸", nombre: "Pilates" },
  { emoji: "🖋️", nombre: "Tatuering" },
  { emoji: "💎", nombre: "Piercing" },
  { emoji: "🐶", nombre: "Hundtrim" },
  { emoji: "🐾", nombre: "Veterinär" },
  { emoji: "🦷", nombre: "Tandvård" },
  { emoji: "📷", nombre: "Fotografering" },
  { emoji: "📚", nombre: "Kurser & lektioner" },
  { emoji: "🧖", nombre: "Spa" },
  { emoji: "💄", nombre: "Makeup" },
  { emoji: "🦶", nombre: "Fotvård" },
];

// ---------------------------------------------------------------------------
// PLANES: samma som PLANES_LANDING i es-CL.ts, utan `precioClp` (beloppen
// bor i `src/config/pricing.ts`, D-025).
// ---------------------------------------------------------------------------

type PlanTexto = Omit<PlanLanding, "precioClp">;

export const PLANES: readonly PlanTexto[] = [
  {
    id: "gratis",
    nombre: "Gratis",
    puntos: [
      "1 anställd",
      "Din bokningslänk",
      "Kalender",
      "Påminnelser via mejl",
    ],
    cta: "Välj Gratis",
  },
  {
    id: "emprende",
    nombre: "Starta",
    puntos: ["1 anställd", "Sms-påminnelser (50/månad)", "Väntelista"],
    cta: "Välj Starta",
  },
  {
    id: "equipo",
    nombre: "Team",
    puntos: [
      "Upp till 5 anställda",
      "150 sms/månad",
      "Flashtider",
      "Vi saknar dig-påminnelser",
      "Rapporter",
    ],
    cta: "Välj Team",
  },
  {
    id: "local",
    nombre: "Företag",
    puntos: ["Upp till 12 anställda", "300 sms/månad", "Prioriterad support"],
    cta: "Välj Företag",
  },
];

// ---------------------------------------------------------------------------
// svSE: hela formen, kontrollerad mot `MarketingCopy` (`./marketing.ts`).
// `import type` ovan gör att cirkeln bara finns i typvärlden, inte i
// runtime-koden (`marketing.ts` importerar den här filen som värde).
// ---------------------------------------------------------------------------

export const svSE = {
  nav,
  estados,
  hoy,
  landing,
  sitio,
  SITIO_FUNCIONALIDADES,
  SITIO_PRECIOS_TABLA,
  SITIO_PARA_INDUSTRIAS,
  SITIO_RUBROS_MARQUEE,
  SITIO_COMPARACION,
  PLANES,
} satisfies MarketingCopy;
