/** Presentkort (WP-77, D-058), svenska. Samma form som `es-CL.regalo.ts`; egen
 * fil så att texterna inte hamnar i bokningssidans i18n-chunk (D-039).
 * Produktnamnet skrivs aldrig här (regel 10): mejlens sidfot tar `marca` som
 * parameter (`email.comun.piePagina`). */
import type { regalo as EsRegalo } from "./es-CL.regalo";
import type { Widen } from "./sv-SE.compartido";

export const regalo: Widen<typeof EsRegalo> = {
  compra: {
    meta: (p: { negocio: string }): string => `Presentkort · ${p.negocio}`,
    eyebrow: "Presentkort",
    titulo: (p: { negocio: string }): string =>
      `Ge bort en stund hos ${p.negocio}`,
    bajada:
      "Gäller alla behandlingar i 24 månader. Skickas direkt eller på det datum du väljer.",
    volver: (p: { negocio: string }): string => `Tillbaka till ${p.negocio}`,
    volverCorto: "Tillbaka",
    pasos: {
      monto: "1. Belopp",
      diseno: "2. Design",
      paraQuien: "3. Till vem?",
    },
    pasosCortos: {
      monto: "Belopp",
      diseno: "Design",
      paraQuien: "Till vem?",
    },
    otro: "Eget",
    otroLabel: (p: { min: string; max: string }): string =>
      `Valfritt belopp (${p.min}–${p.max})`,
    temas: { lime: "Lime", lilac: "Lila", photo: "Foto" },
    campos: {
      destinatario: "Mottagarens namn",
      destinatarioEmail: "Mottagarens e-post",
      destinatarioEmailAyuda:
        "Lämna tomt så skickas presentkortet till dig i stället.",
      saludo: "Hälsning (valfritt)",
      saludoCorto: "Hälsning",
      saludoAyuda: "Högst 300 tecken, inga länkar.",
      de: "Från",
      enviar: "Skicka",
      enviarAyuda:
        "Tomt = direkt efter betalningen. Annars kl. 08:00 den dagen.",
      tuEmail: "Din e-post (för kvitto)",
      tuEmailCorto: "Din e-post (kvitto)",
    },
    terminos:
      "Jag har läst villkoren: presentkortet gäller alla behandlingar i 24 månader, kan användas flera gånger tills beloppet är slut och kan inte lösas in mot kontanter. 14 dagars ångerrätt så länge det är oanvänt.",
    tarjeta: {
      etiqueta: "Presentkort",
      para: (p: { nombre: string }): string => `Till ${p.nombre}`,
      validoHasta: (p: { fecha: string }): string => `Gäller till ${p.fecha}`,
    },
    resumen: {
      envio: "Skickas",
      ahora: "Direkt",
      aPagar: "Att betala",
      pagar: (p: { monto: string }): string => `Betala ${p.monto}`,
      stripe: "Kort och Apple Pay via Stripe",
      arrepentimiento: "Ångerrätt i 14 dagar",
      notaMovil:
        "Kort och Apple Pay via Stripe · Ångerrätt i 14 dagar · Gäller i 24 månader",
    },
    vendidoPor: (p: { negocio: string }): string =>
      `Säljs av ${p.negocio}. Betalningen går direkt till salongen.`,
    cancelado: "Du avbröt betalningen. Inget drogs.",
    noDisponible: "Presentkort går inte att köpa här just nu.",
    errores: {
      amount: "Välj ett belopp mellan 100 och 5 000 kr.",
      theme: "Välj en design.",
      name: "Skriv ett namn (högst 80 tecken).",
      email: "Kontrollera e-postadressen.",
      greeting: "Hälsningen får vara högst 300 tecken.",
      greeting_url: "Hälsningen får inte innehålla länkar.",
      date: "Välj en dag från i dag till 90 dagar fram.",
      terms: "Godkänn villkoren för att gå vidare.",
      unavailable: "Presentkort går inte att köpa just nu.",
      invalid: "Kontrollera beloppet och leveransdagen.",
      rate_limited: "För många försök. Vänta en stund och försök igen.",
      failed: "Betalningen kunde inte öppnas. Försök igen.",
    },
    enlacePerfil: "Köp presentkort",
  },
  listo: {
    meta: "Presentkortet är beställt",
    titulo: "Klart! Presentkortet är beställt",
    texto: (p: { nombre: string; fecha: string }): string =>
      `${p.nombre} får det på mejlen ${p.fecha}. Kvittot och en kopia av presentkortet har skickats till dig.`,
    textoAhora: (p: { nombre: string }): string =>
      `${p.nombre} får det på mejlen inom några minuter. Kvittot och en kopia av presentkortet har skickats till dig.`,
    textoTuyo:
      "Presentkortet och kvittot har skickats till din e-post. Du kan skriva ut det och ge bort det själv.",
    fechaHora: (p: { fecha: string }): string => `${p.fecha} kl. 08:00`,
    pendiente:
      "Vi bekräftar din betalning. Presentkortet kommer på mejlen om en stund.",
    imprimir: "Ladda ner som PDF",
    otra: "Köp ett till",
  },
  tarjeta: {
    meta: "Presentkort",
    saldo: "Saldo",
    valor: "Värde",
    validoHasta: "Gäller till",
    codigo: "Din kod",
    estado: "Status",
    de: (p: { nombre: string }): string => `Från ${p.nombre}`,
    imprimir: "Skriv ut / spara som PDF",
    reservar: "Boka tid med presentkortet",
    ayuda:
      "Använd koden när du bokar på salongens sida, eller visa den i kassan. Du kan använda presentkortet flera gånger tills beloppet är slut.",
    noEncontrada: "Länken gäller inte längre.",
    arrepentirse: "Ångra köp",
    arrepentirseTexto:
      "Du får tillbaka hela beloppet på ditt kort. Presentkortet slutar gälla och skickas inte.",
    arrepentido: "Klart. Pengarna är på väg tillbaka till ditt kort.",
    errorArrepentirse:
      "Återbetalningen gick inte. Försök igen eller kontakta salongen.",
    moms: "Presentkort (flerfunktionsvoucher): moms redovisas vid inlösen.",
  },
  estados: {
    active: "Aktivt",
    refunding: "Återbetalas",
    refunded: "Återbetalt",
    expired: "Utgånget",
    disputed: "Spärrat",
    depleted: "Förbrukat",
    parcial: "Delvis använt",
  },
  cuenta: {
    meta: "Mina presentkort",
    titulo: "Mina presentkort",
    menu: "Mina presentkort",
    vacio: "Du har inte köpt några presentkort än.",
    saldo: (p: { saldo: string; valor: string }): string =>
      `${p.saldo} kvar av ${p.valor}`,
    para: (p: { nombre: string }): string => `Till ${p.nombre}`,
    enviada: (p: { fecha: string }): string => `Skickat ${p.fecha}`,
    programada: (p: { fecha: string }): string => `Skickas ${p.fecha}`,
    validoHasta: (p: { fecha: string }): string => `gäller till ${p.fecha}`,
    ver: "Visa och skriv ut",
    arrepentirse: "Ångra köp",
    arrepentido: "Klart. Pengarna är på väg tillbaka till ditt kort.",
    errorArrepentirse:
      "Återbetalningen gick inte. Försök igen eller kontakta salongen.",
    codigoAria: "Presentkortets kod",
  },
  caja: {
    enlace: "Presentkort",
    titulo: "Presentkort",
    canjear: "Lös in presentkort",
    codigo: "Kod",
    buscar: "Hämta",
    saldo: "Saldo",
    validoHasta: "Gäller till",
    estado: "Status",
    para: (p: { nombre: string }): string => `Till ${p.nombre}`,
    usarEn: "Använd till",
    sinReserva: "Ingen bokning (dra bara från saldot)",
    reservaOpcion: (p: {
      hora: string;
      servicio: string;
      monto: string;
    }): string => `${p.servicio} · ${p.hora} · ${p.monto}`,
    monto: "Belopp att dra",
    descontar: (p: { monto: string }): string =>
      `Dra ${p.monto} från presentkortet`,
    descontarSinMonto: "Dra från presentkortet",
    listo: (p: { monto: string; saldo: string }): string =>
      `Klart! ${p.monto} dras. Kvar på presentkortet: ${p.saldo}.`,
    listoReserva: "Bokningen är markerad som betald.",
    cifras: "Presentkort i siffror",
    vendidoAno: "Sålt i år",
    pendiente: "Kvar att lösa in",
    usado: "Inlöst",
    vencido: "Förfallet",
    nota: "Presentkort är flerfunktionsvouchers: momsen redovisas när presentkortet används, inte när det säljs. Kvittot visar det automatiskt.",
    notaDeuda:
      "Sålda presentkort är en skuld till kunderna, inte försäljning. Inlösen räknas som betalning på bokningen.",
    lista: "Alla presentkort",
    vacio: "Du har inte sålt några presentkort än.",
    comprada: (p: { fecha: string }): string => `Köpt ${p.fecha}`,
    vence: (p: { fecha: string }): string => `gäller till ${p.fecha}`,
    errores: {
      invalid: "Koden finns inte hos dig.",
      expired: "Presentkortet har gått ut.",
      frozen: "Presentkortet är spärrat (återbetalning eller tvist).",
      empty: "Saldot räcker inte.",
      invalid_amount: "Beloppet stämmer inte med saldot eller bokningen.",
      invalid_booking: "Bokningen går inte att betala.",
      forbidden: "Du har inte behörighet att lösa in presentkort.",
      rate_limited: "För många försök. Vänta en stund.",
    },
    recibo: (p: { ultimos: string }): string => `Presentkort ···${p.ultimos}`,
  },
  ajustes: {
    titulo: "Presentkort",
    texto:
      "Sälj presentkort på din bokningssida. Kunden betalar med kort och pengarna går till ditt Stripe-konto (1 % avgift). Presentkortet gäller alla dina behandlingar i 24 månader.",
    toggle: "Sälj presentkort",
    guardar: "Spara",
    guardado: "Sparat.",
    requiereStripe: "Koppla Stripe först.",
    verPagina: "Visa köpsidan",
    error: "Det gick inte att spara. Försök igen.",
  },
  reserva: {
    pregunta: "Har du ett presentkort?",
    codigo: "Presentkortets kod",
    ayuda: "Saldot dras från priset. Resten betalar du i salongen.",
    errores: {
      gift_card_invalid:
        "Koden gäller inte här. Kontrollera den och försök igen.",
      gift_card_empty: "Presentkortet har inget saldo kvar.",
      gift_card_rate_limited: "För många försök. Vänta en stund.",
    },
    aviso: (p: { pagado: string; resto: string; saldo: string }): string =>
      `Betalt med presentkort: ${p.pagado} · kvar att betala: ${p.resto} · saldo kvar: ${p.saldo}`,
  },
  email: {
    kvitto: {
      asunto: (p: { negocio: string }): string =>
        `Kvitto: presentkort hos ${p.negocio}`,
      preheader: (p: { negocio: string }): string =>
        `Ditt presentkort hos ${p.negocio} är klart.`,
      titulo: "Tack! Presentkortet är beställt",
      texto: (p: { nombre: string; cuando: string }): string =>
        `${p.nombre} får presentkortet på mejlen ${p.cuando}.`,
      textoTuyo:
        "Presentkortet är till dig: öppna länken för att se det och skriva ut det.",
      ahora: "inom några minuter",
      el: (p: { fecha: string }): string => `${p.fecha} kl. 08:00`,
      valor: "Värde",
      codigo: "Kod",
      para: "Till",
      validoHasta: "Gäller till",
      vendidoPor: "Säljs av",
      moms: "Presentkort — flerfunktionsvoucher, moms redovisas vid inlösen.",
      arrepentimiento:
        "Ångerrätt i 14 dagar så länge presentkortet är oanvänt: öppna länken och välj ”Ångra köp”.",
      cta: "Visa presentkortet",
    },
    leverans: {
      asunto: (p: { de: string; negocio: string }): string =>
        `${p.de} har gett dig ett presentkort hos ${p.negocio}`,
      preheader: (p: { negocio: string }): string =>
        `Gäller alla behandlingar hos ${p.negocio}.`,
      titulo: (p: { nombre: string; de: string }): string =>
        `${p.nombre}, du har fått ett presentkort från ${p.de}!`,
      etiqueta: "Presentkort",
      validoHasta: (p: { fecha: string }): string =>
        `Gäller alla behandlingar till ${p.fecha}`,
      codigo: "Din kod",
      cta: "Boka tid med presentkortet",
      ayuda: (p: { negocio: string }): string =>
        `Använd koden när du bokar hos ${p.negocio}, eller visa den i kassan. Du kan använda presentkortet flera gånger tills beloppet är slut. Saldot ser du alltid via länken nedan.`,
      saldo: "Visa saldo och skriv ut",
    },
  },
};
