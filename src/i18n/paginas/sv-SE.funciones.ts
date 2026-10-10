// Texter för funktionssidorna, svenska (WP-75). Varumärkesnamnet skrivs aldrig här (regel 10).
// Innehållet följer det som är byggt: påminnelser via e-post på alla planer och sms från
// Starta, väntelista från Starta, blixttider och rapporter från Team, onlinebetalning
// 1 % per kortbetalning + Stripes avgift (D-047).
import type { PaginasCopy } from "./types";

export const funciones: PaginasCopy["funciones"] = {
  reservas: {
    nombre: "Onlinebokning",
    resumen: "Din egen bokningssida, dygnet runt",
    etiqueta: "FUNKTION · ONLINEBOKNING",
    meta: {
      titulo: "Onlinebokning för ditt företag",
      descripcion:
        "Ge kunderna en egen bokningssida där de väljer tjänst, medarbetare och tid dygnet runt. Ingen provision på bokningar. Skapa din sida gratis.",
    },
    fotoAlt: "Kund i badrock dricker te i ett spa-rum",
    hero: {
      pre: "En bokningssida som",
      marca: "bokar åt dig.",
      texto:
        "Dina kunder väljer tjänst, medarbetare och tid på din egen länk – utan samtal och sms fram och tillbaka.",
    },
    tarjeta: {
      linea: "Klippning dam · tor 14:30",
      valor: "Bokad av Maja",
      estado: "Bekräftad direkt",
    },
    beneficios: [
      {
        titulo: "Öppet dygnet runt",
        texto:
          "Kunderna bokar när det passar dem – även när du sover eller har händerna fulla.",
      },
      {
        titulo: "Din sida, ditt utseende",
        texto:
          "Bokningssidan visar din logga, dina bilder, dina tjänster och ditt team, på en länk som är din egen.",
      },
      {
        titulo: "Aldrig dubbelbokad",
        texto:
          "Bara lediga tider visas. Servern räknar ut luckorna, så två kunder kan aldrig boka samma tid.",
      },
    ],
    como: {
      pre: "Igång på",
      marca: "tre steg.",
      pasos: [
        {
          titulo: "Lägg upp dina tjänster",
          texto:
            "Namn, längd och pris. Vi föreslår färdiga tjänster för din bransch.",
        },
        {
          titulo: "Dela länken",
          texto:
            "Lägg den på Instagram, i Google-profilen eller skicka den i ett sms.",
        },
        {
          titulo: "Ta emot bokningar",
          texto:
            "Varje bokning dyker upp i din kalender och kunden får en bekräftelse.",
        },
      ],
      mock: {
        titulo: "Din bokningssida",
        filas: [
          { k: "Tjänst", v: "Klippning dam" },
          { k: "Medarbetare", v: "Vem som helst" },
          { k: "Tid", v: "Tor 14:30", ok: true },
        ],
        boton: "Boka tiden",
      },
    },
    faq: [
      {
        pregunta: "Behöver mina kunder skapa ett konto?",
        respuesta:
          "Nej. De fyller i namn och kontaktuppgifter när de bokar – inget konto eller lösenord.",
      },
      {
        pregunta: "Kostar det extra för varje bokning?",
        respuesta:
          "Nej. Du betalar bara din månadsplan, vi tar ingen provision på bokningar.",
      },
      {
        pregunta: "Kan kunderna flytta eller avboka själva?",
        respuesta:
          "Ja, via länken i bekräftelsen – inom de regler du ställt in, till exempel hur nära besöket de får ändra.",
      },
    ],
  },

  pagos: {
    nombre: "Betalning vid bokning",
    resumen: "Kort och Apple Pay via Stripe",
    etiqueta: "FUNKTION · BETALNING",
    meta: {
      titulo: "Betalning vid bokning med kort och Apple Pay",
      descripcion:
        "Låt kunden betala när hen bokar. Pengarna går till ditt eget Stripe-konto. 1 % per kortbetalning plus Stripes avgift, ingen avgift per bokning.",
    },
    fotoAlt: "Hudterapeut ger behandling",
    hero: {
      pre: "Få betalt redan",
      marca: "när kunden bokar.",
      texto:
        "Kort, Apple Pay och Google Pay direkt i bokningen – pengarna går till ditt konto via Stripe.",
    },
    tarjeta: {
      linea: "Klippning dam · tor 14:30",
      valor: "650 kr",
      estado: "Betald via Stripe",
    },
    beneficios: [
      {
        titulo: "Färre uteblivna besök",
        texto:
          "När tiden är betald dyker kunden upp – och gör hen inte det har du ändå fått betalt.",
      },
      {
        titulo: "Pengarna direkt till dig",
        texto:
          "Betalningen går till ditt eget Stripe-konto. Vi tar 1 % per kortbetalning, ingen avgift per bokning.",
      },
      {
        titulo: "Automatisk återbetalning",
        texto:
          "Avbokar kunden i tid, eller nekar du förfrågan, återbetalas pengarna automatiskt.",
      },
    ],
    como: {
      pre: "Igång på",
      marca: "tre steg.",
      pasos: [
        {
          titulo: "Koppla Stripe",
          texto: "Två minuter under Inställningar → Betalningar.",
        },
        {
          titulo: "Välj när kunden betalar",
          texto: "Valfritt eller obligatoriskt vid bokning.",
        },
        {
          titulo: "Få betalt",
          texto: "Pengarna landar på ditt konto – kvitto skickas automatiskt.",
        },
      ],
      mock: {
        titulo: "Betalningar · Inställningar",
        filas: [
          { k: "Stripe-konto", v: "Aktivt", ok: true },
          { k: "Betalning vid bokning", v: "Valfri" },
        ],
        boton: "Öppna Stripe",
      },
    },
    faq: [
      {
        pregunta: "Vad kostar det?",
        respuesta:
          "Ingen avgift per bokning. När kunden betalar med kort tar vi 1 % + Stripes avgift.",
      },
      {
        pregunta: "Vilka betalsätt fungerar?",
        respuesta: "Kort, Apple Pay och Google Pay.",
      },
      {
        pregunta: "Måste kunden betala online?",
        respuesta: "Nej – du väljer själv om det är valfritt eller krävs.",
      },
    ],
  },

  resenas: {
    nombre: "Verifierade omdömen",
    resumen: "Bara riktiga kunder recenserar",
    etiqueta: "FUNKTION · OMDÖMEN",
    meta: {
      titulo: "Verifierade omdömen från riktiga kunder",
      descripcion:
        "Bara kunder som varit hos dig kan lämna omdöme, och snittbetyget visas på din bokningssida. Du kan svara offentligt och anmäla olämpliga omdömen.",
    },
    fotoAlt: "Händer med välskötta naglar",
    hero: {
      pre: "Omdömen som",
      marca: "går att lita på.",
      texto:
        "Bara kunder som faktiskt varit hos dig kan lämna omdöme – och snittet syns direkt på din bokningssida.",
    },
    tarjeta: {
      linea: "Omdöme från Amanda L.",
      valor: "5 av 5 stjärnor",
      estado: "Verifierad kund",
    },
    beneficios: [
      {
        titulo: "Ett omdöme per besök",
        texto:
          "Varje kund får en personlig länk efter besöket. Ingen länk, inget omdöme – så inga påhittade betyg.",
      },
      {
        titulo: "Du svarar offentligt",
        texto:
          "Tacka för beröm eller förklara din sida. Anmäl omdömen som är olämpliga eller inte kommer från en kund.",
      },
      {
        titulo: "Visas där det spelar roll",
        texto:
          "Snittbetyg och antal ligger vid ditt namn på bokningssidan, så nya kunder ser dem innan de bokar.",
      },
    ],
    como: {
      pre: "Från besök till",
      marca: "omdöme.",
      pasos: [
        {
          titulo: "Besöket är genomfört",
          texto:
            "När tiden passerat räknas bokningen som genomförd, om du inte markerat Kom inte.",
        },
        {
          titulo: "Kunden får en förfrågan",
          texto:
            "Ett mejl, och ett sms om numret finns, med en personlig länk som gäller i 60 dagar.",
        },
        {
          titulo: "Omdömet publiceras",
          texto:
            "Betyg 1–5 och en kort text visas på din sida, med förnamn och initial.",
        },
      ],
      mock: {
        titulo: "Omdömen · Kunder",
        filas: [
          { k: "Snittbetyg", v: "4,9", ok: true },
          { k: "Nya omdömen", v: "3" },
        ],
        boton: "Svara på omdömen",
      },
    },
    faq: [
      {
        pregunta: "Kan jag ta bort ett omdöme jag inte gillar?",
        respuesta:
          "Nej, varken du eller någon annan i teamet kan radera eller ändra ett omdöme. Du kan svara offentligt och anmäla det om det är olämpligt, så granskar vi det.",
      },
      {
        pregunta: "Kan kunden ändra sitt omdöme?",
        respuesta: "Ja, i sju dagar via samma länk.",
      },
      {
        pregunta: "Kan jag stänga av förfrågningarna?",
        respuesta:
          "Ja, under Inställningar → Bokningsregler kan du slå av och på att kunderna får en förfrågan efter besöket.",
      },
    ],
  },

  horasFlash: {
    nombre: "Blixttider",
    resumen: "Fyll luckor med rabatt",
    etiqueta: "FUNKTION · BLIXTTIDER",
    meta: {
      titulo: "Blixttider: sälj lediga tider med rabatt",
      descripcion:
        "En ledig tid i sista minuten blir en rabatterad blixttid. Kunderna får erbjudandet via sms eller mejl och den som bokar först får tiden.",
    },
    fotoAlt: "Tre personer gör yoga på mattor i en ljus studio",
    hero: {
      pre: "Fyll luckorna med",
      marca: "blixttider.",
      texto:
        "När en tid blir ledig i sista minuten erbjuder du den med rabatt. Den som bokar först får den.",
    },
    tarjeta: {
      linea: "Ledig tid · idag 16:00",
      valor: "−20 % · 360 kr",
      estado: "Skickad till kunderna",
    },
    beneficios: [
      {
        titulo: "Tider som annars blir 0 kr",
        texto:
          "En ledig timme värd 450 kr som du säljer med 20 % rabatt ger 360 kr, i stället för ingenting.",
      },
      {
        titulo: "Du bestämmer rabatten",
        texto: "Välj procent och hur länge erbjudandet gäller, tid för tid.",
      },
      {
        titulo: "Stängs när någon bokat",
        texto:
          "Så fort en kund tar tiden försvinner erbjudandet för de andra. Inga dubbelbokningar.",
      },
    ],
    como: {
      pre: "Från lucka till",
      marca: "bokning.",
      pasos: [
        {
          titulo: "Markera den lediga tiden",
          texto: "Välj tiden som blev ledig och rabatten, med ett klick.",
        },
        {
          titulo: "Vi meddelar dina kunder",
          texto:
            "De får ett sms eller mejl med erbjudandet och en länk för att boka direkt.",
        },
        {
          titulo: "Tiden fylls",
          texto:
            "Den som bokar först får tiden; de andra ser att den redan är borta.",
        },
      ],
      mock: {
        titulo: "Ny blixttid",
        filas: [
          { k: "Tid", v: "Idag 16:00" },
          { k: "Rabatt", v: "20 %", ok: true },
          { k: "Gäller till", v: "15:00" },
        ],
        boton: "Skicka blixttiden",
      },
    },
    faq: [
      {
        pregunta: "Vilken plan behöver jag?",
        respuesta: "Blixttider ingår från planen Team.",
      },
      {
        pregunta: "Hur länge gäller en blixttid?",
        respuesta:
          "Du bestämmer: den kan gälla några minuter eller ända fram till besöket.",
      },
      {
        pregunta: "Vad händer om ingen bokar?",
        respuesta:
          "Inget särskilt – tiden är ledig som förut, utan kostnad eller bindning.",
      },
    ],
  },

  listaEspera: {
    nombre: "Väntelista",
    resumen: "Avbokad tid till nästa i kön",
    etiqueta: "FUNKTION · VÄNTELISTA",
    meta: {
      titulo: "Väntelista: avbokade tider fylls av sig själva",
      descripcion:
        "När en fullbokad dag får en ledig tid får kunden i väntelistan besked direkt. Färre tomma luckor utan att du lyfter ett finger.",
    },
    fotoAlt: "Barberare trimmar en kunds skägg",
    hero: {
      pre: "Någon avbokar –",
      marca: "nästa i kön tar tiden.",
      texto:
        "Är dagen fullbokad ställer sig kunden i väntelistan och får besked så fort en tid blir ledig.",
    },
    tarjeta: {
      linea: "Fredag · fullbokat",
      valor: "4 i väntelistan",
      estado: "Tid ledig – besked skickat",
    },
    beneficios: [
      {
        titulo: "Färre tomma luckor",
        texto:
          "En avbokning behöver inte bli en förlust. Tiden erbjuds direkt till den som vill ha den.",
      },
      {
        titulo: "Kunden anmäler sig själv",
        texto:
          "På en fullbokad dag väljer kunden tjänst och dag och hamnar i väntelistan – utan att du är inblandad.",
      },
      {
        titulo: "Den som svarar först får tiden",
        texto:
          "Tiden hålls inte åt någon. Svarar flera tar den första, och de andra ser att den är bokad.",
      },
    ],
    como: {
      pre: "Fungerar på",
      marca: "tre steg.",
      pasos: [
        {
          titulo: "Kunden ställer sig i kön",
          texto: "Anmälan görs per tjänst och dag på din bokningssida.",
        },
        {
          titulo: "En tid blir ledig",
          texto: "När någon avbokar får de i väntelistan besked automatiskt.",
        },
        {
          titulo: "Tiden bokas",
          texto: "Den första som svarar får tiden och hamnar i din kalender.",
        },
      ],
      mock: {
        titulo: "Väntelista · Fredag",
        filas: [
          { k: "Klippning dam", v: "2 väntar" },
          { k: "Färgning", v: "2 väntar" },
          { k: "Ledig tid", v: "Besked skickat", ok: true },
        ],
        boton: "Visa väntelistan",
      },
    },
    faq: [
      {
        pregunta: "Vilken plan behöver jag?",
        respuesta: "Väntelistan ingår från planen Starta.",
      },
      {
        pregunta: "Hur får kunden besked?",
        respuesta: "Automatiskt via mejl och sms.",
      },
      {
        pregunta: "Måste jag göra något när en tid blir ledig?",
        respuesta:
          "Nej. Avbokningen frigör tiden och väntelistan får besked automatiskt.",
      },
    ],
  },

  recordatorios: {
    nombre: "Påminnelser",
    resumen: "SMS och e-post – färre no-shows",
    etiqueta: "FUNKTION · PÅMINNELSER",
    meta: {
      titulo: "Automatiska påminnelser via e-post och sms",
      descripcion:
        "Kunderna får bekräftelse direkt och en påminnelse före besöket, med länk för att flytta eller avboka. Färre uteblivna besök utan manuellt jobb.",
    },
    fotoAlt: "Frisör lockar håret på en kund",
    hero: {
      pre: "Kunden kommer –",
      marca: "utan att du påminner.",
      texto:
        "Bekräftelse direkt och en påminnelse före besöket, med länk för att flytta eller avboka.",
    },
    tarjeta: {
      linea: "Påminnelse · imorgon 10:00",
      valor: "Skickad via sms",
      estado: "Kunden bekräftade",
    },
    beneficios: [
      {
        titulo: "Färre uteblivna besök",
        texto:
          "En påminnelse dagen innan, med exakt datum och tid, gör att färre glömmer sin tid.",
      },
      {
        titulo: "Flytta i stället för utebli",
        texto:
          "Varje meddelande har en länk. Hinner kunden inte flyttar hen tiden själv och du får en ledig lucka att fylla.",
      },
      {
        titulo: "E-post på alla planer",
        texto:
          "Påminnelser via e-post ingår överallt. Sms ingår från planen Starta, med ett antal meddelanden per månad.",
      },
    ],
    como: {
      pre: "Du gör",
      marca: "ingenting.",
      pasos: [
        {
          titulo: "Kunden bokar",
          texto: "Bekräftelsen skickas direkt, med en länk till bokningen.",
        },
        {
          titulo: "Påminnelsen går iväg",
          texto: "Dagen innan får kunden en påminnelse med datum och tid.",
        },
        {
          titulo: "Kunden bekräftar eller flyttar",
          texto: "Via länken kan kunden se, flytta eller avboka tiden.",
        },
      ],
      mock: {
        titulo: "Påminnelse till Amanda",
        filas: [
          { k: "Klippning dam", v: "Tor 14:30" },
          { k: "Kanal", v: "Sms" },
          { k: "Status", v: "Skickad", ok: true },
        ],
        boton: "Se bokningen",
      },
    },
    faq: [
      {
        pregunta: "Kostar sms extra?",
        respuesta:
          "Sms ingår i planerna från Starta, med ett visst antal per månad. E-post ingår alltid.",
      },
      {
        pregunta: "Kan kunden svara på påminnelsen?",
        respuesta:
          "Kunden använder länken i meddelandet för att se, flytta eller avboka tiden.",
      },
      {
        pregunta: "Kan jag stänga av påminnelserna?",
        respuesta:
          "Ja, du styr under Inställningar vad som skickas till dina kunder.",
      },
    ],
  },

  agenda: {
    nombre: "Kalender & personal",
    resumen: "Hela teamets schema på ett ställe",
    etiqueta: "FUNKTION · KALENDER",
    meta: {
      titulo: "Kalender och personal samlade på ett ställe",
      descripcion:
        "Vecko- och dagsvy med en kolumn per medarbetare. Bokningar, öppettider, luckor och buffertar räknas ut automatiskt. Dagens schema finns även i mobilen.",
    },
    fotoAlt: "Person stretchar utomhus med hjälp av en terapeut",
    hero: {
      pre: "Hela teamets dag,",
      marca: "på ett ställe.",
      texto:
        "En kolumn per medarbetare, bokningar som dyker upp av sig själva och dagens schema i fickan.",
    },
    tarjeta: {
      linea: "Idag · 3 medarbetare",
      valor: "9 bokningar",
      estado: "Nästa kund kl. 13:15",
    },
    beneficios: [
      {
        titulo: "En kolumn per medarbetare",
        texto:
          "Se veckan eller dagen med varje persons tider bredvid varandra, med egna arbetstider och tjänster.",
      },
      {
        titulo: "Idag i mobilen",
        texto:
          "Öppna Idag, se vem som kommer härnäst och markera Kom eller Kom inte med en hand.",
      },
      {
        titulo: "Full kontroll",
        texto:
          "Lägg in kunder som kommer utan bokning, flytta en tid eller avboka den, direkt i kalendern.",
      },
    ],
    como: {
      pre: "Allt på",
      marca: "rätt plats.",
      pasos: [
        {
          titulo: "Lägg upp ditt team",
          texto:
            "Bjud in medarbetare, ställ in deras tider och vilka tjänster de utför.",
        },
        {
          titulo: "Bokningarna kommer in",
          texto:
            "Varje bokning hamnar i rätt kolumn, med öppettider och buffertar inräknade.",
        },
        {
          titulo: "Håll koll på dagen",
          texto:
            "Använd dagsvyn på datorn eller Idag i mobilen och markera hur det gick.",
        },
      ],
      mock: {
        titulo: "Kalender · Torsdag",
        filas: [
          { k: "Maja", v: "5 bokningar" },
          { k: "Jonas", v: "4 bokningar" },
          { k: "Nästa kund", v: "13:15", ok: true },
        ],
        boton: "Öppna kalendern",
      },
    },
    faq: [
      {
        pregunta: "Hur många medarbetare får jag ha?",
        respuesta:
          "En medarbetare på Gratis och Starta, upp till tre på Team och upp till tio på Företag.",
      },
      {
        pregunta: "Kan en kund boka vem som helst i teamet?",
        respuesta:
          "Ja. Kunden väljer en specifik medarbetare eller Vem som helst, och systemet hittar en ledig tid.",
      },
      {
        pregunta: "Kan jag lägga in bokningar själv?",
        respuesta:
          "Ja, du kan lägga in en bokning manuellt, flytta den till en annan dag eller medarbetare och avboka den.",
      },
    ],
  },

  caja: {
    nombre: "Kassa & statistik",
    resumen: "Intäkter och beläggning",
    etiqueta: "FUNKTION · KASSA",
    meta: {
      titulo: "Kassa och statistik för ditt företag",
      descripcion:
        "Se vad som kommit in och vad som återstår att ta betalt för. Rapporter visar intäkter per vecka, beläggning per medarbetare och uteblivna besök.",
    },
    fotoAlt: "Kvinna får stenmassage",
    hero: {
      pre: "Se vad dagen",
      marca: "faktiskt gav.",
      texto:
        "Kassan samlar betalningarna och rapporterna visar utvecklingen – utan kalkylblad.",
    },
    tarjeta: {
      linea: "Inkommet idag",
      valor: "3 450 kr",
      estado: "2 att ta betalt för",
    },
    beneficios: [
      {
        titulo: "Dagens betalningar",
        texto:
          "Se vad som kommit in och vilka besök som väntar på betalning, per dag, vecka eller månad.",
      },
      {
        titulo: "Alla betalsätt",
        texto:
          "Registrera kontant, kort, Swish eller faktura. Betalningar online med kort läggs in automatiskt.",
      },
      {
        titulo: "Rapporter som visar mönster",
        texto:
          "Intäkter per vecka, beläggning per medarbetare, nya och återkommande kunder och trend för uteblivna besök.",
      },
    ],
    como: {
      pre: "Från besök till",
      marca: "siffror.",
      pasos: [
        {
          titulo: "Besöket är klart",
          texto:
            "Bokningen hamnar under Att ta betalt för när den är avslutad.",
        },
        {
          titulo: "Registrera betalningen",
          texto:
            "Välj betalsätt med ett tryck. Betalda bokningar markeras direkt.",
        },
        {
          titulo: "Följ utvecklingen",
          texto:
            "Titta i Rapporter för att se intäkter, beläggning och kunder över tid.",
        },
      ],
      mock: {
        titulo: "Kassa · Idag",
        filas: [
          { k: "Inkommet", v: "3 450 kr", ok: true },
          { k: "Ej betalt", v: "1 200 kr" },
          { k: "Snittpris", v: "575 kr" },
        ],
        boton: "Öppna rapporter",
      },
    },
    faq: [
      {
        pregunta: "Vilken plan behöver jag för rapporter?",
        respuesta:
          "Rapporter ingår från planen Team. Kassan med dagens betalningar finns för alla.",
      },
      {
        pregunta: "Kan jag ta betalt i kassan utan Stripe?",
        respuesta:
          "Ja. Du kan registrera kontant, kort, Swish eller faktura utan att koppla något betalkonto.",
      },
      {
        pregunta: "Går siffrorna att välja period för?",
        respuesta: "Ja – idag, vecka, månad eller ett eget datumintervall.",
      },
    ],
  },

  migracion: {
    nombre: "Smärtfri flytt",
    resumen: "Klistra in länken – vi flyttar resten",
    etiqueta: "FUNKTION · FLYTT",
    meta: {
      titulo: "Smärtfri flytt från ditt gamla bokningssystem",
      descripcion:
        "Klistra in länken till din nuvarande bokningssida så läser vi in dina tjänster, ditt team och din företagsinfo. Du granskar innan något sparas.",
    },
    fotoAlt: "Tatuerare tatuerar en arm",
    hero: {
      pre: "Byt system på",
      marca: "två minuter.",
      texto:
        "Klistra in länken till din nuvarande bokningssida – vi läser in tjänster, team och info åt dig.",
    },
    tarjeta: {
      linea: "Läser din sida…",
      valor: "8 tjänster · 3 i teamet",
      estado: "Klart att granska",
    },
    beneficios: [
      {
        titulo: "Slipp skriva in allt igen",
        texto:
          "Företagsnamn, tjänster med längd och pris samt teamets namn och titlar läses in från din publika sida.",
      },
      {
        titulo: "Du granskar först",
        texto:
          "Du ser vad som hittats och väljer vad som ska importeras. Dubbletter hoppas över och inget sparas innan du bekräftar.",
      },
      {
        titulo: "Bara det som är offentligt",
        texto:
          "Vi hämtar din publika företagsinfo. Kunduppgifter och omdömen följer inte med.",
      },
    ],
    como: {
      pre: "Flytten tar",
      marca: "några minuter.",
      pasos: [
        {
          titulo: "Klistra in länken",
          texto:
            "Adressen till din nuvarande bokningssida, till exempel hos Bokadirekt eller Fresha.",
        },
        {
          titulo: "Granska det vi hittar",
          texto: "Välj vilka tjänster och vilket team som ska med.",
        },
        {
          titulo: "Importera",
          texto: "Allt landar i din nya kalender, redo att bokas.",
        },
      ],
      mock: {
        titulo: "Flytta hit",
        filas: [
          { k: "Länk", v: "bokadirekt.se/…" },
          { k: "Tjänster", v: "8 hittade", ok: true },
          { k: "Team", v: "3 hittade", ok: true },
        ],
        boton: "Importera",
      },
    },
    faq: [
      {
        pregunta: "Vilka system kan ni läsa från?",
        respuesta:
          "Bland annat Bokadirekt, Fresha och Booksy. Fungerar inte länken kan du klistra in texten från sidan i stället.",
      },
      {
        pregunta: "Följer mina kunder och gamla bokningar med?",
        respuesta:
          "Nej. Importen gäller företagsinfo, tjänster och teamets namn – inte kunduppgifter eller bokningshistorik.",
      },
      {
        pregunta: "Kan jag ändra efter importen?",
        respuesta:
          "Ja. Allt som importeras kan du redigera som vanligt under Inställningar.",
      },
    ],
  },
};
