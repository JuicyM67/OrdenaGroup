/**
 * Integritetspolicy — marknaden SE (WP-26 steg 5, utkast från
 * `copywriter-es-cl`, inte skrivet av en jurist). Motsvarighet till
 * `./es-CL.privacidad.ts`, men anpassad till D-025/D-027/D-028: SMS och
 * e-post i stället för WhatsApp, ingen kundbetalning i Sverige, servrar i
 * Stockholm i stället för São Paulo.
 */
import { LEGAL_VERSION, list, p, type LegalDoc } from "./types";
import type { LegalEntity } from "./entity";

export function getIntegritetSE(entity: LegalEntity): LegalDoc {
  const { legalName, taxId, address, contactEmail } = entity;
  return {
    slug: "integritet",
    title: "Integritetspolicy",
    status: "draft",
    version: LEGAL_VERSION,
    versionLabel: `Version ${LEGAL_VERSION}`,
    intro: [
      p(
        "Den här policyn förklarar vilka personuppgifter vi behandlar när du använder ett företags bokningssida, vad vi använder dem till, hur länge vi sparar dem och hur du kan utöva dina rättigheter.",
      ),
      p(
        `Företaget där du bokar din tid (till exempel en frisör, en massör eller en fysioterapeut) är personuppgiftsansvarigt för dina personuppgifter. ${legalName} behandlar uppgifterna som företagets personuppgiftsbiträde, som deras tekniska leverantör: vi följer företagets instruktioner och bestämmer inte själva vad uppgifterna ska användas till.`,
      ),
      p(
        `För uppgifter om de personer som administrerar ett företag i plattformen, det vill säga ägare och personal, är ${legalName} själv personuppgiftsansvarig, för det som rör hanteringen av deras egna konton.`,
      ),
      p("Den här policyn följer EU:s dataskyddsförordning (GDPR)."),
    ],
    sections: [
      {
        id: "vilka-uppgifter",
        heading: "Vilka uppgifter behandlar vi?",
        blocks: [
          p("När du bokar en tid sparar vi:"),
          list([
            "Ditt namn och ditt mobilnummer.",
            "Din e-post, om du skrev in den (den är valfri).",
            "Din bokningshistorik: tjänst, datum, tid, personal och status (bekräftad, avbokad, uteblivet besök).",
            "Dina svar på frågorna i bokningsformuläret, om företaget lagt till några.",
            "Anteckningar som företaget skrivit om dig, till exempel dina önskemål om en tjänst.",
            "Loggen över de meddelanden vi skickat dig, och om de kom fram eller inte, utan att spara själva innehållet i den loggen.",
            "Dina samtycken: vad du godkänt, när och via vilken kanal.",
          ]),
          p(
            "Vi frågar inte om hälsouppgifter eller annan känslig information. Om ett företag ändå skriver in sådant på eget bevåg i ett fritt anteckningsfält är det inget plattformen är byggd för att samla in.",
          ),
        ],
      },
      {
        id: "vad-anvander-vi",
        heading: "Vad använder vi dina uppgifter till?",
        blocks: [
          list([
            "För att hantera din bokning: visa lediga tider, spara din tid och undvika dubbelbokningar.",
            "För att meddela dig: bekräftelse, påminnelser och ändringar av din tid, via sms eller e-post.",
            "För att företaget ska kunna administrera sin kalender och sitt kundregister.",
            "För att företaget, om du godkänt det, ska kunna berätta om erbjudanden eller påminna dig att boka igen.",
            "För att uppfylla rättsliga skyldigheter och svara myndigheter när det krävs.",
          ]),
        ],
      },
      {
        id: "ansvarig-och-rattigheter",
        heading:
          "Vem är ansvarig för dina uppgifter och hur utövar du dina rättigheter?",
        blocks: [
          p(
            "Företaget där du bokade är personuppgiftsansvarigt för dina uppgifter. Du har rätt att få tillgång till dina uppgifter, begära rättelse, begära radering, invända mot en viss användning och få ut en kopia i ett format du kan ta med dig till en annan tjänst (dataportabilitet).",
          ),
          p(
            "För att utöva någon av de här rättigheterna, kontakta företaget där du bokade direkt: kontaktuppgifterna finns i din bokningsbekräftelse. Företaget kan be oss exportera eller radera dina uppgifter, och vi gör det i plattformen.",
          ),
          p(
            `Om företaget har upphört eller inte svarar kan du skriva till oss på ${contactEmail}, så hjälper vi dig ändå att utöva dina rättigheter.`,
          ),
          p(
            "Du kan när som helst avregistrera dig från erbjudanden och nyheter, utan att det påverkar bekräftelser eller påminnelser för tider du redan bokat.",
          ),
          p(
            "Du kan också vända dig till Integritetsskyddsmyndigheten (IMY) om du inte är nöjd med hur dina uppgifter hanteras.",
          ),
        ],
      },
      {
        id: "hur-lange",
        heading: "Hur länge sparar vi dina uppgifter?",
        blocks: [
          list([
            "Om du inte bokar igen anonymiseras dina personuppgifter automatiskt 24 månader efter din senaste bokning: ditt namn, mobilnummer, e-post och anteckningar raderas; bokningarna och beloppen finns kvar, men pekar inte längre ut dig.",
            "Meddelanden som redan skickats, eller som inte längre ska skickas, tas bort ur vår utskickskö 90 dagar senare.",
            "Loggen över vad du godkänt och när sparas i 5 år, men kopplas bort från ditt namn så snart dina uppgifter anonymiseras: den finns kvar bara för att visa att ett giltigt samtycke fanns vid ett visst tillfälle.",
          ]),
        ],
      },
      {
        id: "vem-delar-vi-med",
        heading: "Vem delar vi dina uppgifter med?",
        blocks: [
          p(
            "Vi använder andra företag för att driva plattformen. Var och en behandlar dina uppgifter bara för sin egen uppgift, aldrig för egna syften:",
          ),
          list([
            "Supabase — databas och inloggning. Servrar i Stockholm, Sverige (region eu-north-1).",
            "Vercel — drift av plattformen. Servrar i Stockholm, Sverige (region arn1).",
            "Resend — utskick av bekräftelser och påminnelser via e-post.",
            "ClickSend — utskick av bekräftelser och påminnelser via sms. ClickSend har sitt huvudkontor i Australien; uppgifter kan behandlas utanför EU/EES enligt deras egna villkor.",
            "OpenFreeMap — levererar kartbilderna på kartan i Upptäck. Din webbläsare hämtar bilderna direkt från OpenFreeMap, som då ser din IP-adress (inte din position eller vem du är).",
            "OpenStreetMap Foundation (Nominatim) — omvandlar företagens adresser till koordinater så att de kan visas på kartan och sorteras efter avstånd. Bara företagets adress skickas, aldrig uppgifter om kunder eller besökare. Kartdata: OpenStreetMaps bidragsgivare.",
            "Stripe — om företaget betalar för sin plan med kort hanteras den betalningen av Stripe. Stripe behandlar inte dina uppgifter som kund hos företaget: i dag tar plattformen inte emot betalningar från företagets kunder i Sverige.",
          ]),
          p(
            "När uppgifter behandlas utanför EU/EES gör vi det bara i den utsträckning som krävs för att leverera tjänsten, och vi kräver att de här leverantörerna har lämpliga skyddsåtgärder på plats.",
          ),
          p(
            "Vi säljer aldrig dina uppgifter och delar dem inte med tredje part i marknadsföringssyfte utanför företaget där du bokade.",
          ),
        ],
      },
      {
        id: "upptack",
        heading: "Upptäck och kartan",
        blocks: [
          p(
            'I Upptäck kan du se erbjudanden och blixttider nära dig. Om du väljer "Min position" avrundar din webbläsare positionen till ungefär en kilometer och sparar den i en cookie i 30 minuter. Positionen används bara för att sortera listan efter avstånd: den sparas aldrig i vår databas, skickas aldrig i adressfältet och loggas aldrig. Du kan sluta använda den när du vill.',
          ),
          p(
            "Företagens adresser är offentliga uppgifter som företaget själv lagt in. Vi omvandlar dem till koordinater (se Nominatim nedan) och sparar resultatet för att kunna visa företaget på kartan.",
          ),
        ],
      },
      {
        id: "sakerhet",
        heading: "Hur skyddar vi dina uppgifter?",
        blocks: [
          list([
            "Varje företag kan bara se och hantera sina egna kunder och sina egna bokningar: databasen kräver det tekniskt, företag för företag.",
            "Nycklarna till andra tjänster som företaget kopplar på, till exempel Stripe, sparas krypterade.",
            "Vi sparar aldrig innehållet i dina meddelanden i fel- eller granskningsloggar.",
          ]),
        ],
      },
      {
        id: "cookies",
        heading: "Cookies",
        blocks: [
          p(
            "Vi använder bara cookies som krävs för att plattformen ska fungera, aldrig för reklamspårning:",
          ),
          list([
            "Sessionscookien, som håller dig inloggad — som företag (ägare och personal) eller med ditt kundkonto. Den försvinner när du loggar ut.",
            "En kortlivad cookie (15 minuter) som minns om du loggar in som kund eller som företag, så att du hamnar rätt efter inloggningslänken.",
            '"nara" — bara om du väljer "Min position" i Upptäck: din position avrundad till ungefär en kilometer, i 30 minuter, och bara på Upptäck-sidorna.',
          ]),
          p(
            "Kunder som bara bokar en tid, utan att logga in, får inga spårningscookies.",
          ),
          p(
            "I dag använder vi inga cookies för statistik eller reklam. Lägger vi till sådana i framtiden visar vi en fråga om samtycke innan de aktiveras.",
          ),
        ],
      },
      {
        id: "andringar",
        heading: "Ändringar i den här policyn",
        blocks: [
          p(
            "Ändrar vi den här policyn på ett sätt som spelar roll meddelar vi det i plattformen innan ändringen börjar gälla. Datumet för den gällande versionen står alltid längst ned i det här dokumentet.",
          ),
        ],
      },
      {
        id: "kontakt",
        heading: "Kontakt",
        blocks: [
          p(
            `${legalName}, ${taxId}, ${address}. Skriv till oss på ${contactEmail} om du har frågor om den här policyn eller om dina uppgifter.`,
          ),
        ],
      },
    ],
  };
}
