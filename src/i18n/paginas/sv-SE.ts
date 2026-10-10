// Texter för megamenyn samt funktions- och branschsidorna, svenska (WP-75).
// Varumärkesnamnet skrivs aldrig här (regel 10): sidorna lägger på det via `brand`.
import { funciones } from "./sv-SE.funciones";
import { rubros } from "./sv-SE.rubros";
import type { PaginasCopy } from "./types";

export const paginas: PaginasCopy = {
  nav: {
    funciones: "Funktioner",
    rubros: "Branscher",
    precios: "Priser",
    ejemplo: "Exempelsida",
    menuFunciones: {
      titulo: "FUNKTIONER",
      verTodas: "Se alla funktioner",
      migracion: {
        etiqueta: "SMÄRTFRI FLYTT",
        titulo: "Byt system på två minuter",
        texto: "Klistra in länken – vi flyttar resten",
      },
      ejemplo: {
        titulo: "Se exempelsidan",
        texto: "En riktig bokningssida att klicka runt i",
      },
    },
    menuRubros: {
      etiqueta: "BRANSCHER",
      titulo: "Byggt för dig som jobbar med tider.",
      texto:
        "Färdiga tjänstemallar, rätt språk och funktioner som passar just din bransch.",
      todas: "Alla branscher",
    },
    abrirMenu: "Öppna menyn",
    cerrarMenu: "Stäng menyn",
    crearGratis: "Skapa min kalender gratis",
    entrar: "Logga in",
  },
  comunes: {
    migas: "Brödsmulor",
    inicio: "Start",
    crearGratis: "Kom igång gratis",
    verEjemplo: "Se exempelsidan",
    faqEtiqueta: "FRÅGOR",
    faqTitulo: "Bra att veta.",
    masFunciones: "Fler funktioner",
    masRubros: "Fler branscher",
    rubroEtiqueta: "FÖR",
    serviciosEtiqueta: "FÄRDIGA TJÄNSTER",
    comoEtiqueta: "SÅ FUNKAR DET",
    equipo: ["I", "J"],
    cta: {
      pre: "Ska vi bli",
      marca: "buddies?",
      texto: "Din egen bokningssida på fem minuter. Gratis för en person.",
      boton: "Ja, skapa min sida",
    },
  },
  indiceFunciones: {
    meta: {
      titulo: "Funktioner för bokning, betalning och kalender",
      descripcion:
        "Allt du behöver för att ta emot bokningar: onlinebokning, betalning, omdömen, väntelista, påminnelser, kalender och kassa. Se vad som ingår.",
    },
    etiqueta: "FUNKTIONER",
    hero: {
      pre: "Allt som behövs för",
      marca: "en full kalender.",
      texto:
        "Bokning, påminnelser, väntelista och kassa i ett enkelt system. Välj en funktion för att se hur den fungerar.",
    },
    fotoAlt: "Hudterapeut ger behandling",
    detalleTitulo: "Mer om funktionerna",
  },
  indiceRubros: {
    meta: {
      titulo: "Bokningssystem för din bransch",
      descripcion:
        "Bokningssystem för frisörer, barberare, naglar, fransar, hudvård, massage, naprapater, yoga, tatuering, hundtrim, personliga tränare och makeup.",
    },
    etiqueta: "BRANSCHER",
    hero: {
      pre: "Ett bokningssystem för",
      marca: "din bransch.",
      texto:
        "Färdiga tjänster, rätt språk och funktioner som passar hur du jobbar. Välj din bransch för att se hur det ser ut.",
    },
    fotoAlt: "Frisör lockar håret på en kund",
    rejilla: { pre: "Hitta", marca: "din bransch." },
  },
  sms: {
    etiqueta: "SMS-KREDITER",
    titulo: { pre: "Betala bara för de", marca: "sms du skickar." },
    texto:
      "Alla planer, även Gratis, kan fylla på kontot med sms-krediter. Kredit används när planens egna sms för månaden är slut.",
    perMes: "Sms som ingår per månad",
    paquete: ({ n }) => `${n.toLocaleString("sv-SE")} sms`,
    ahorro: ({ monto }) => `Spara ${monto}`,
    notas: [
      "1 kr per sms exkl. moms.",
      "Krediterna gäller i 12 månader.",
      "Ett sms är upp till 160 tecken.",
    ],
    faq: {
      pregunta: "Vad händer när planens sms tar slut?",
      respuesta:
        "Då används dina sms-krediter. Du fyller på kontot när du vill, med paket från 100 till 1 000 sms, och krediterna gäller i 12 månader. Ett sms kostar 1 kr exkl. moms och är upp till 160 tecken.",
    },
    ventaja: {
      titulo: "Betala bara för de sms du skickar",
      texto:
        "Ingår inte tillräckligt många sms i planen fyller du på med krediter, 1 kr per sms exkl. moms. Inga dolda avgifter.",
    },
  },
  funciones,
  rubros,
};
