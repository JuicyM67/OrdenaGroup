// Texter för branschsidorna, svenska (WP-75). Varje bransch har egna vardagsproblem, egna
// exempeltjänster och egen text (unik för SEO, inte bara ett namnbyte). Priser i öre och
// bara exempel: ägaren justerar dem i sin egen tjänstelista.
import type { PaginasCopy } from "./types";

const CTA = "Skapa min kalender gratis";
const CIERRE = "Ja, skapa min sida";

export const rubros: PaginasCopy["rubros"] = {
  frisor: {
    nombre: "Frisör",
    fotoAlt: "Frisör lockar håret på en kund",
    meta: {
      titulo: "Bokningssystem för frisörer",
      descripcion:
        "Onlinebokning för frisörsalonger med färdiga tjänster för klippning, färg och slingor. Kunderna bokar själva, du klipper. Gratis att börja.",
    },
    hero: {
      pre: "Bokningssystem för",
      marca: "frisörer.",
      texto:
        "Färdiga tjänster för klippning, färg och slingor. Kunderna bokar och betalar själva – du klipper.",
      cta: "Skapa min salong gratis",
    },
    problemas: {
      pre: "Vardagen i en salong –",
      marca: "utan krånglet.",
      items: [
        {
          problema: "Kunder som inte dyker upp",
          solucion: "Påminnelser och betalning vid bokning",
        },
        {
          problema: "Telefonen ringer mitt i en klippning",
          solucion: "Kunderna bokar själva, dygnet runt",
        },
        {
          problema: "Luckor i schemat",
          solucion: "Blixttider och väntelista fyller dem",
        },
      ],
    },
    servicios: {
      pre: "Klart att boka",
      marca: "från dag ett.",
      texto:
        "Vi föreslår tjänster med beskrivning, tid och pris som passar en frisörsalong. Justera eller importera dina egna.",
      items: [
        {
          nombre: "Klippning dam",
          minutos: 45,
          precio: 65000,
          descripcion: "Konsultation, tvätt, klippning och föning.",
        },
        {
          nombre: "Färgning + klipp",
          minutos: 120,
          precio: 129000,
          descripcion:
            "Helfärg eller toning efter din hårtyp, inklusive klippning.",
        },
        {
          nombre: "Barnklippning",
          minutos: 30,
          precio: 39500,
          descripcion: "För barn upp till 12 år.",
        },
      ],
    },
    cierre: {
      texto:
        "Din salongs egen bokningssida på fem minuter. Gratis för en person.",
      boton: CIERRE,
    },
  },

  barberare: {
    nombre: "Barberare",
    fotoAlt: "Barberare trimmar skägget på en kund",
    meta: {
      titulo: "Bokningssystem för barberare",
      descripcion:
        "Bokningssystem för barberare: snabba tider, drop-in-kunder och tydlig kö. Kunderna bokar skägg och hår själva, du håller tempot uppe.",
    },
    hero: {
      pre: "Bokningssystem för",
      marca: "barberare.",
      texto:
        "Korta tider, tät kö och stamkunder som vill ha sin vanliga stol. Din bokningssida håller ordning på det åt dig.",
      cta: CTA,
    },
    problemas: {
      pre: "Stolen ska vara full –",
      marca: "inte telefonen.",
      items: [
        {
          problema: "Stamkunder som vill boka samma tid varje gång",
          solucion: "De väljer dig och tiden på bokningssidan, utan samtal",
        },
        {
          problema: "Walk-ins som rör ihop schemat",
          solucion: "Lägg in dem manuellt i kalendern på några sekunder",
        },
        {
          problema: "Kunden glömmer sin tid",
          solucion: "Automatisk påminnelse med länk för att flytta tiden",
        },
      ],
    },
    servicios: {
      pre: "Dina vanligaste tider,",
      marca: "redan inlagda.",
      texto:
        "Korta tjänster med rätt längd, så att kön rullar utan glapp. Ändra pris och tid så de passar din stol.",
      items: [
        {
          nombre: "Herrklippning",
          minutos: 30,
          precio: 40000,
          descripcion: "Maskin eller sax, tvätt och styling.",
        },
        {
          nombre: "Skäggtrim",
          minutos: 20,
          precio: 25000,
          descripcion:
            "Formning och kantning av skägget, avslutat med varm handduk.",
        },
        {
          nombre: "Klipp + skägg",
          minutos: 45,
          precio: 59000,
          descripcion:
            "Hela paketet i en bokning, så att kunden slipper boka två gånger.",
        },
      ],
    },
    cierre: {
      texto:
        "Din egen bokningslänk till Instagram på fem minuter. Gratis för en person.",
      boton: CIERRE,
    },
  },

  naglar: {
    nombre: "Naglar",
    fotoAlt: "Händer med välskötta naglar",
    meta: {
      titulo: "Bokningssystem för nagelsalonger",
      descripcion:
        "Onlinebokning för nageltekniker med färdiga tjänster för gelé, akryl och manikyr. Bokningar och påminnelser sköter sig själva medan du lackar.",
    },
    hero: {
      pre: "Bokningssystem för",
      marca: "nagelsalonger.",
      texto:
        "Gelé, akryl och manikyr med rätt tidsåtgång. Kunderna bokar själva medan du har händerna fulla.",
      cta: CTA,
    },
    problemas: {
      pre: "Händerna fulla av gel –",
      marca: "inte av telefon.",
      items: [
        {
          problema: "Du kan inte svara mitt i en behandling",
          solucion: "Kunden bokar själv på sidan och får bekräftelse direkt",
        },
        {
          problema: "Efterfyllning bokas för sent",
          solucion: "Vi saknar dig-påminnelser puffar kunden att boka igen",
        },
        {
          problema: "Olika tjänster tar olika lång tid",
          solucion: "Varje tjänst har egen längd och buffert",
        },
      ],
    },
    servicios: {
      pre: "Tjänsterna du",
      marca: "faktiskt säljer.",
      texto:
        "Färdiga tjänster med längd och pris för nagelsalonger. Lägg till dina egna nail art-tillägg efteråt.",
      items: [
        {
          nombre: "Gelé-lack",
          minutos: 60,
          precio: 45000,
          descripcion: "Förbehandling och färg som håller i veckor.",
        },
        {
          nombre: "Akrylnaglar nyuppsättning",
          minutos: 120,
          precio: 85000,
          descripcion: "Nya naglar med form och längd efter dina önskemål.",
        },
        {
          nombre: "Efterfyllning",
          minutos: 90,
          precio: 65000,
          descripcion: "Fyller i det som växt ut och fräschar upp färgen.",
        },
      ],
    },
    cierre: {
      texto:
        "Bokningssidan med dina bilder på fem minuter. Gratis för en person.",
      boton: CIERRE,
    },
  },

  fransar: {
    nombre: "Fransar & bryn",
    fotoAlt: "Fransstylist arbetar med en kunds fransar",
    meta: {
      titulo: "Bokningssystem för fransar och bryn",
      descripcion:
        "Bokningssystem för fransstylister och brynterapeuter: långa tider, tydliga efterfyllningar och påminnelser som minskar uteblivna besök.",
    },
    hero: {
      pre: "Bokningssystem för",
      marca: "fransar & bryn.",
      texto:
        "Långa, precisa behandlingar kräver att kunden dyker upp. Påminnelser och tydliga regler ser till att hen gör det.",
      cta: CTA,
    },
    problemas: {
      pre: "Lugn i rummet –",
      marca: "ordning i schemat.",
      items: [
        {
          problema: "En uteblivd kund tar två timmar av dagen",
          solucion: "Påminnelse före besöket och regler för sena avbokningar",
        },
        {
          problema: "Efterfyllningen ska bokas inom några veckor",
          solucion: "Kunden bokar nästa tid direkt via bekräftelsen",
        },
        {
          problema: "Du behöver tid att förbereda mellan kunder",
          solucion: "Buffert efter varje tjänst så att du hinner byta",
        },
      ],
    },
    servicios: {
      pre: "Från första gången till",
      marca: "efterfyllning.",
      texto:
        "Nyuppsättning, efterfyllning och brynbehandlingar med rimliga tider. Justera efter din teknik.",
      items: [
        {
          nombre: "Fransförlängning klassisk",
          minutos: 120,
          precio: 90000,
          descripcion:
            "En förlängning per egen fransa för ett naturligt resultat.",
        },
        {
          nombre: "Efterfyllning 3 veckor",
          minutos: 75,
          precio: 60000,
          descripcion: "Fyller på där fransarna vuxit ut.",
        },
        {
          nombre: "Brynlaminering",
          minutos: 60,
          precio: 55000,
          descripcion: "Formar och sätter brynen för ett fylligare uttryck.",
        },
      ],
    },
    cierre: {
      texto:
        "En bokningssida som matchar din stil, klar på fem minuter. Gratis för en person.",
      boton: CIERRE,
    },
  },

  hudvard: {
    nombre: "Hudvård",
    fotoAlt: "Ansiktsbehandling med mask",
    meta: {
      titulo: "Bokningssystem för hudvård och skönhet",
      descripcion:
        "Bokningssystem för hudterapeuter och skönhetssalonger. Kunderna bokar behandling och tid själva, med påminnelser och ordning på kalendern.",
    },
    hero: {
      pre: "Bokningssystem för",
      marca: "hudvård.",
      texto:
        "Ansiktsbehandlingar, vaxning och kroppsbehandlingar i en bokningssida där varje behandling förklaras.",
      cta: CTA,
    },
    problemas: {
      pre: "Lugn i behandlingsrummet –",
      marca: "ordning på dagen.",
      items: [
        {
          problema: "Kunder undrar vilken behandling de ska välja",
          solucion: "Varje tjänst har en beskrivning på bokningssidan",
        },
        {
          problema: "Sena avbokningar lämnar hål i dagen",
          solucion: "Väntelistan erbjuder tiden till nästa kund direkt",
        },
        {
          problema: "Behandlingsrummet behöver städas mellan kunder",
          solucion: "Buffert efter varje tjänst håller schemat realistiskt",
        },
      ],
    },
    servicios: {
      pre: "Behandlingarna kunderna",
      marca: "söker efter.",
      texto:
        "Färdiga behandlingar med beskrivning, tid och pris. Byt namn och innehåll så att det matchar dina produkter.",
      items: [
        {
          nombre: "Klassisk ansiktsbehandling",
          minutos: 60,
          precio: 75000,
          descripcion:
            "Rengöring, peeling, mask och massage anpassat efter din hud.",
        },
        {
          nombre: "Hydrafacial",
          minutos: 75,
          precio: 129000,
          descripcion: "Djuprengöring och fukt med omedelbart synlig lyster.",
        },
        {
          nombre: "Vaxning ben",
          minutos: 45,
          precio: 49000,
          descripcion: "Hela benen med skonsam hartsvax.",
        },
      ],
    },
    cierre: {
      texto:
        "En lugn bokningssida för din klinik på fem minuter. Gratis för en person.",
      boton: CIERRE,
    },
  },

  massage: {
    nombre: "Massage",
    fotoAlt: "Kvinna får stenmassage",
    meta: {
      titulo: "Bokningssystem för massörer",
      descripcion:
        "Bokningssystem för massageterapeuter med färdiga tjänster för avslappnande och djup massage. Egen bokningssida och automatiska påminnelser.",
    },
    hero: {
      pre: "Bokningssystem för",
      marca: "massörer.",
      texto:
        "Kunderna väljer behandling och längd själva. Du slipper ringa fram och tillbaka mitt i en behandling.",
      cta: CTA,
    },
    problemas: {
      pre: "Händerna på kunden –",
      marca: "inte på telefonen.",
      items: [
        {
          problema: "Du kan inte svara medan du masserar",
          solucion: "Bokningssidan svarar åt dig, dygnet runt",
        },
        {
          problema: "Kunder väljer fel längd",
          solucion:
            "Varje behandling finns i flera längder med tydlig beskrivning",
        },
        {
          problema: "Återbesök glöms bort",
          solucion: "Vi saknar dig-påminnelser tipsar kunden att boka igen",
        },
      ],
    },
    servicios: {
      pre: "Från kort pass till",
      marca: "lång behandling.",
      texto:
        "Färdiga massagetjänster i olika längder. Du bestämmer vilka du erbjuder och till vilket pris.",
      items: [
        {
          nombre: "Avslappnande massage",
          minutos: 60,
          precio: 79000,
          descripcion:
            "Lugna, långa drag som löser spänningar och sänker stressen.",
        },
        {
          nombre: "Djup massage",
          minutos: 60,
          precio: 85000,
          descripcion: "Fokus på muskelspänningar i nacke, axlar och rygg.",
        },
        {
          nombre: "Kort nackmassage",
          minutos: 30,
          precio: 45000,
          descripcion: "En snabb behandling för nacke och axlar.",
        },
      ],
    },
    cierre: {
      texto:
        "Din egen bokningssida redo att delas på fem minuter. Gratis för en person.",
      boton: CIERRE,
    },
  },

  naprapat: {
    nombre: "Naprapat & fysio",
    fotoAlt: "Naprapat hjälper en patient att stretcha",
    meta: {
      titulo: "Bokningssystem för naprapater och fysioterapeuter",
      descripcion:
        "Bokningssystem för naprapater och fysioterapeuter: förstabesök och återbesök, påminnelser och ordning på kalendern. Börja gratis.",
    },
    hero: {
      pre: "Bokningssystem för",
      marca: "naprapater & fysio.",
      texto:
        "Förstabesök, återbesök och behandlingsserier i en kalender där patienten bokar rätt längd själv.",
      cta: CTA,
    },
    problemas: {
      pre: "Patienterna i fokus –",
      marca: "inte administrationen.",
      items: [
        {
          problema: "Förstabesök tar längre tid än återbesök",
          solucion: "Varje tjänst har egen längd, så rätt tid bokas direkt",
        },
        {
          problema: "Patienter avbokar sent",
          solucion: "Påminnelser och en väntelista som fyller tiden",
        },
        {
          problema: "Du vill veta mer om patienten före besöket",
          solucion: "Egna frågor i bokningsformuläret",
        },
      ],
    },
    servicios: {
      pre: "Besöken du redan",
      marca: "erbjuder.",
      texto:
        "Förstabesök och återbesök med rimliga längder och priser. Anpassa efter din kliniks upplägg.",
      items: [
        {
          nombre: "Förstabesök",
          minutos: 60,
          precio: 85000,
          descripcion:
            "Anamnes, undersökning och behandling med plan för fortsättningen.",
        },
        {
          nombre: "Återbesök",
          minutos: 30,
          precio: 55000,
          descripcion:
            "Uppföljning och behandling för dig som redan är patient.",
        },
        {
          nombre: "Akut tid",
          minutos: 30,
          precio: 65000,
          descripcion: "För dig som har akuta besvär och behöver komma snabbt.",
        },
      ],
    },
    cierre: {
      texto:
        "En bokningssida för din klinik på fem minuter. Gratis för en person.",
      boton: CIERRE,
    },
  },

  yoga: {
    nombre: "Yoga & pilates",
    fotoAlt: "Yogainstruktör leder ett pass i en ljus studio",
    meta: {
      titulo: "Bokningssystem för yoga- och pilatesinstruktörer",
      descripcion:
        "Bokningssystem för yoga- och pilatesinstruktörer med privata pass och provpass. Egen bokningssida, påminnelser och tydlig kalender.",
    },
    hero: {
      pre: "Bokningssystem för",
      marca: "yoga & pilates.",
      texto:
        "Privatpass och provpass som bokas själva. Du fokuserar på mattan, inte på mejlen.",
      cta: CTA,
    },
    problemas: {
      pre: "Lugn på mattan –",
      marca: "lugn i inkorgen.",
      items: [
        {
          problema: "Anmälningar kommer via sms, DM och mejl",
          solucion: "En bokningslänk som samlar allt",
        },
        {
          problema: "Elever missar passet",
          solucion: "Påminnelse före passet med länk för att avboka",
        },
        {
          problema: "Du erbjuder både provpass och längre upplägg",
          solucion: "Olika tjänster med olika längd och pris",
        },
      ],
    },
    servicios: {
      pre: "Pass som är",
      marca: "redo att bokas.",
      texto:
        "Exempel på privata pass med olika längd. Anpassa efter din studio och din stil.",
      items: [
        {
          nombre: "Privat yogapass",
          minutos: 60,
          precio: 65000,
          descripcion: "Ett pass byggt kring dina mål, din nivå och din kropp.",
        },
        {
          nombre: "Privat pilates",
          minutos: 55,
          precio: 70000,
          descripcion: "Fokus på djup muskelstyrka, balans och hållning.",
        },
        {
          nombre: "Provpass",
          minutos: 45,
          precio: 25000,
          descripcion:
            "Ett första pass för dig som vill prova innan du bestämmer dig.",
        },
      ],
    },
    cierre: {
      texto:
        "Din bokningssida redo att delas på fem minuter. Gratis för en person.",
      boton: CIERRE,
    },
  },

  tatuering: {
    nombre: "Tatuering",
    fotoAlt: "Tatuerare tatuerar en arm i sin studio",
    meta: {
      titulo: "Bokningssystem för tatuerare",
      descripcion:
        "Bokningssystem för tatuerare: konsultationer och långa sittningar med tydlig kalender och påminnelser. Färre uteblivna sittningar.",
    },
    hero: {
      pre: "Bokningssystem för",
      marca: "tatuerare.",
      texto:
        "Konsultation först, sedan lång sittning. Tydliga tider och regler gör att bara seriösa kunder tar plats i din kalender.",
      cta: CTA,
    },
    problemas: {
      pre: "Mer tid vid maskinen –",
      marca: "mindre vid DM.",
      items: [
        {
          problema: "Hela dagar går förlorade när kunden uteblir",
          solucion: "Påminnelser och regler för hur nära tiden man får avboka",
        },
        {
          problema: "Du vill ha en konsultation före själva sittningen",
          solucion: "Konsultation och tatuering som två olika tjänster",
        },
        {
          problema: "Kunder frågar om pris och tid i varje DM",
          solucion: "Tjänster med längd och pris på bokningssidan",
        },
      ],
    },
    servicios: {
      pre: "Från skiss till",
      marca: "färdig tatuering.",
      texto:
        "Konsultation och sittningar i olika längder. Sätt dina egna priser, per timme eller per motiv.",
      items: [
        {
          nombre: "Konsultation",
          minutos: 30,
          precio: 20000,
          descripcion:
            "Vi går igenom din idé, placering och storlek innan du bokar sittning.",
        },
        {
          nombre: "Liten tatuering",
          minutos: 90,
          precio: 150000,
          descripcion: "Små motiv som ryms inom en kort sittning.",
        },
        {
          nombre: "Heldagssittning",
          minutos: 360,
          precio: 480000,
          descripcion: "En längre sittning för större motiv, med pauser.",
        },
      ],
    },
    cierre: {
      texto:
        "En bokningssida som visar ditt arbete på fem minuter. Gratis för en person.",
      boton: CIERRE,
    },
  },

  hundtrim: {
    nombre: "Hundtrim",
    fotoAlt: "Hundfrisör trimmar en pudel",
    meta: {
      titulo: "Bokningssystem för hundtrim och hundfrisörer",
      descripcion:
        "Bokningssystem för hundfrisörer och hundtrim. Kunderna bokar efter hundens storlek och päls, du får rätt tid avsatt. Börja gratis.",
    },
    hero: {
      pre: "Bokningssystem för",
      marca: "hundtrim.",
      texto:
        "Små och stora hundar, olika pälsar och olika tider. Varje tjänst får rätt längd så att schemat håller.",
      cta: CTA,
    },
    problemas: {
      pre: "Fler hundar i salongen –",
      marca: "färre samtal.",
      items: [
        {
          problema: "En stor hund tar dubbelt så lång tid",
          solucion: "Olika tjänster per storlek, med egen längd och pris",
        },
        {
          problema: "Husse eller matte missar tiden",
          solucion: "Påminnelse före besöket med länk för att flytta",
        },
        {
          problema: "Du behöver sköta städning och torkning mellan hundar",
          solucion: "Buffert efter varje tjänst",
        },
      ],
    },
    servicios: {
      pre: "Hundens behandling,",
      marca: "tydligt förklarad.",
      texto:
        "Färdiga tjänster efter hundens storlek och behov. Justera tider och priser efter din salong.",
      items: [
        {
          nombre: "Trimning liten hund",
          minutos: 60,
          precio: 65000,
          descripcion: "Bad, torkning och trimning för hundar upp till 10 kg.",
        },
        {
          nombre: "Trimning stor hund",
          minutos: 120,
          precio: 120000,
          descripcion: "Bad, torkning och trimning för hundar över 25 kg.",
        },
        {
          nombre: "Kloklippning",
          minutos: 15,
          precio: 15000,
          descripcion: "Snabb klippning av klorna, utan krångel.",
        },
      ],
    },
    cierre: {
      texto:
        "En bokningssida som hundägarna hittar direkt, klar på fem minuter. Gratis för en person.",
      boton: CIERRE,
    },
  },

  pt: {
    nombre: "Personlig träning",
    fotoAlt: "Personlig tränare coachar en kund med skivstång",
    meta: {
      titulo: "Bokningssystem för personliga tränare",
      descripcion:
        "Bokningssystem för personliga tränare: provpass, enskilda pass och uppföljning. Klienterna bokar själva, du coachar.",
    },
    hero: {
      pre: "Bokningssystem för",
      marca: "personliga tränare.",
      texto:
        "Provpass, enskilda pass och uppföljningar som bokas av klienten – du lägger tiden på träningen.",
      cta: CTA,
    },
    problemas: {
      pre: "Mer coachning –",
      marca: "mindre planering.",
      items: [
        {
          problema: "Klienter hör av sig på alla kanaler",
          solucion: "En bokningslänk som alla använder",
        },
        {
          problema: "Sena avbokningar äter upp inkomsten",
          solucion: "Regler för hur nära passet klienten får avboka",
        },
        {
          problema: "Du tränar vid olika tider på dygnet",
          solucion: "Egna öppettider och tydlig kalender, även i mobilen",
        },
      ],
    },
    servicios: {
      pre: "Passen klienterna",
      marca: "bokar oftast.",
      texto:
        "Färdiga tjänster för provpass och enskild träning. Anpassa längd och pris efter ditt upplägg.",
      items: [
        {
          nombre: "Provpass",
          minutos: 45,
          precio: 20000,
          descripcion:
            "Ett första pass där vi pratar mål och provar träningen.",
        },
        {
          nombre: "Enskilt pass",
          minutos: 60,
          precio: 65000,
          descripcion:
            "Personligt upplägg anpassat efter dina mål och din nivå.",
        },
        {
          nombre: "Uppföljning",
          minutos: 30,
          precio: 35000,
          descripcion: "Gå igenom framstegen och justera planen.",
        },
      ],
    },
    cierre: {
      texto:
        "Din bokningssida som klienterna kan spara, klar på fem minuter. Gratis för en person.",
      boton: CIERRE,
    },
  },

  makeup: {
    nombre: "Makeup",
    fotoAlt: "Makeupartist applicerar ögonmakeup",
    meta: {
      titulo: "Bokningssystem för makeupartister",
      descripcion:
        "Bokningssystem för makeupartister: bröllop, fest och provsminkning. Kunderna bokar tid själva och får bekräftelse och påminnelse automatiskt.",
    },
    hero: {
      pre: "Bokningssystem för",
      marca: "makeupartister.",
      texto:
        "Provsminkning, festmakeup och bröllop i en bokningssida med tydliga tider och priser.",
      cta: CTA,
    },
    problemas: {
      pre: "Bokat i god tid –",
      marca: "tryggt på dagen.",
      items: [
        {
          problema: "Bröllop och fest bokas långt i förväg",
          solucion: "Kunden bokar tid i kalendern och får bekräftelse direkt",
        },
        {
          problema: "Kunden glömmer tiden före en stor dag",
          solucion: "Påminnelse med datum och tid, och länk för att flytta",
        },
        {
          problema: "Kunder vill prova innan",
          solucion: "Provsminkning som egen tjänst med egen längd",
        },
      ],
    },
    servicios: {
      pre: "Från provsminkning till",
      marca: "stora dagen.",
      texto:
        "Färdiga tjänster för olika tillfällen. Justera längd, pris och resor efter hur du jobbar.",
      items: [
        {
          nombre: "Provsminkning",
          minutos: 60,
          precio: 80000,
          descripcion: "Vi testar looken i lugn och ro inför din stora dag.",
        },
        {
          nombre: "Festmakeup",
          minutos: 60,
          precio: 85000,
          descripcion: "En komplett makeup som håller hela kvällen.",
        },
        {
          nombre: "Brudmakeup",
          minutos: 90,
          precio: 150000,
          descripcion: "Makeup anpassad för bröllopsdagen och fotograferingen.",
        },
      ],
    },
    cierre: {
      texto:
        "En bokningssida som visar din portfölj, klar på fem minuter. Gratis för en person.",
      boton: CIERRE,
    },
  },
};
