/**
 * Allmänna villkor för företag — marknaden SE (WP-26 steg 5, utkast).
 * Motsvarighet till `./es-CL.terminos.ts`: reglerar relationen mellan
 * plattformen och företaget som tecknar den, inte relationen mellan
 * företaget och dess egna kunder.
 *
 * Personuppgiftsbiträdesavtalet (`./sv-SE.bitradesavtal.ts`, slug
 * `bitradesavtal`) är en bilaga till det här dokumentet (§11, "Bilaga").
 */
import { LEGAL_VERSION, list, p, type LegalDoc } from "./types";
import type { LegalEntity } from "./entity";

export function getVillkorSE(entity: LegalEntity): LegalDoc {
  const { legalName, taxId, address, contactEmail } = entity;
  return {
    slug: "villkor",
    title: "Allmänna villkor för företag",
    status: "draft",
    version: LEGAL_VERSION,
    versionLabel: `Version ${LEGAL_VERSION}`,
    intro: [
      p(
        'De här villkoren reglerar hur företag och yrkesverksamma ("du" eller "företaget") som tecknar plattformen för att hantera sina bokningar får använda den. Genom att skapa ett konto godkänner du de här villkoren.',
      ),
      p(
        `Plattformen tillhandahålls av ${legalName}, ${taxId}, med adress ${address}.`,
      ),
      p(
        "De här villkoren reglerar inte relationen mellan företaget och dess egna kunder: den relationen bestämmer företaget själv, och företaget ansvarar för att den följer tillämplig konsumenträtt.",
      ),
    ],
    sections: [
      {
        id: "vad-plattformen-erbjuder",
        heading: "Vad plattformen erbjuder",
        blocks: [
          list([
            "En bokningssida där dina kunder kan boka tid själva.",
            "En kalender och en adminpanel för att hantera din kalender, din personal och dina tjänster.",
            "Automatiska bekräftelser och påminnelser till dina kunder.",
            "Extra funktioner beroende på vilken plan du väljer, till exempel väntelista eller sms-påminnelser.",
          ]),
          p(
            "Detaljerna för varje plan och dess gränser finns på prissidan som gäller när du tecknar avtalet.",
          ),
        ],
      },
      {
        id: "ditt-konto",
        heading: "Ditt konto",
        blocks: [
          list([
            "Uppgifterna du lämnar när du skapar ditt konto ska vara riktiga och hållas uppdaterade.",
            "Du ansvarar för att hålla din inloggning hemlig och för allt som händer på ditt konto.",
            "Du kan lägga till personal i ditt team med olika behörighetsnivåer; du ansvarar för vem du ger den åtkomsten.",
          ]),
        ],
      },
      {
        id: "tillaten-anvandning",
        heading: "Tillåten användning",
        blocks: [
          list([
            "Du använder plattformen bara för att administrera ditt eget tjänsteföretag med bokningsbara tider, inte för att sälja vidare eller erbjuda den till andra företag.",
            "Du lägger inte in hälsouppgifter eller annan känslig information om dina kunder i anteckningsfälten eller i bokningsformulärets frågor: plattformen är inte byggd för att spara den typen av uppgifter.",
            "Du försöker inte komma åt ett annat företags uppgifter eller delar av plattformen som inte är avsedda för dig.",
            "Namnen på dina tjänster och dina meddelanden ska vara lagliga och får inte kränka dina egna kunders rättigheter.",
          ]),
        ],
      },
      {
        id: "dina-kunder-och-dataskydd",
        heading: "Dina kunder och dataskydd",
        blocks: [
          p(
            `När det gäller dina kunders personuppgifter är du personuppgiftsansvarig och ${legalName} är ditt personuppgiftsbiträde: vi behandlar uppgifterna enligt dina instruktioner, för att leverera tjänsten. De exakta villkoren för det uppdraget finns i personuppgiftsbiträdesavtalet, som är en bilaga till det här dokumentet och gäller med samma kraft.`,
          ),
          p(
            "Du ansvarar för att informera dina kunder om hur du behandlar deras uppgifter, för att inhämta de samtycken som krävs och för att själv besvara deras önskemål om tillgång, rättelse eller radering, med vår tekniska hjälp när du behöver den.",
          ),
        ],
      },
      {
        id: "pris-och-betalning",
        heading: "Pris och betalning",
        blocks: [
          p(
            "Du betalar för den plan du valt enligt det pris och den periodicitet som angavs när du tecknade avtalet, plus tillämplig moms. Vi kan ändra priserna framåt i tiden, med rimligt varsel.",
          ),
          p(
            "I dag tar plattformen inte emot betalningar från dina kunder i Sverige: eventuella betalningar mellan dig och dina kunder sker utanför plattformen.",
          ),
        ],
      },
      {
        id: "varaktighet-och-uppsagning",
        heading: "Varaktighet och uppsägning av ditt konto",
        blocks: [
          list([
            "Du kan säga upp ditt konto när du vill, i Inställningar.",
            "När du säger upp kontot slutar din bokningssida att vara tillgänglig omedelbart.",
            "Du har 30 dagar från uppsägningen på dig att ångra dig och återställa ditt konto precis som det var.",
            "Har du inte återställt kontot inom de 30 dagarna raderas dina uppgifter och dina kunders uppgifter enligt vår integritetspolicy, och går då inte att få tillbaka.",
          ]),
          p(
            "Vi kan också stänga av eller säga upp ditt konto om du bryter allvarligt mot de här villkoren, och meddelar dig då i förväg, om inte lagen eller andra användares säkerhet kräver att vi agerar tidigare.",
          ),
        ],
      },
      {
        id: "tillganglighet",
        heading: "Tillgänglighet och ändringar av tjänsten",
        blocks: [
          p(
            "Vi gör vad vi kan för att plattformen ska vara tillgänglig kontinuerligt, men det kan förekomma underhåll eller driftstörningar. Vi meddelar planerat underhåll i förväg när det är möjligt. Vi kan förbättra eller ändra funktioner i plattformen; tar en ändring bort något viktigt i din plan meddelar vi dig innan.",
          ),
        ],
      },
      {
        id: "ansvar",
        heading: "Ansvar",
        blocks: [
          p(
            "Vi tillhandahåller plattformen med den omsorg som är rimlig för en teknikleverantör, men ansvarar inte för företagets affärsbeslut, för innehåll som företaget publicerar eller för tvister mellan företaget och dess egna kunder. Vardera part ansvarar för de skador den orsakar genom att bryta mot de här villkoren, inom ramen för tillämplig lag.",
          ),
        ],
      },
      {
        id: "tillamplig-lag",
        heading: "Tillämplig lag och kontakt",
        blocks: [
          p(
            `De här villkoren regleras av svensk lag. Har du frågor, skriv till oss på ${contactEmail}.`,
          ),
        ],
      },
      {
        id: "andringar-villkor",
        heading: "Ändringar av de här villkoren",
        blocks: [
          p(
            "Ändrar vi de här villkoren på ett sätt som spelar roll meddelar vi det innan ändringen börjar gälla. Fortsätter du använda plattformen efter det datumet innebär det att du godkänner den nya versionen.",
          ),
        ],
      },
      {
        id: "bilaga",
        heading: "Bilaga",
        blocks: [
          p(
            "Personuppgiftsbiträdesavtalet är en bilaga till de här villkoren och gäller tillsammans med dem.",
          ),
        ],
      },
    ],
  };
}
