/**
 * Personuppgiftsbiträdesavtal — marknaden SE (WP-26 steg 5, utkast),
 * bilaga till `./sv-SE.villkor.ts` (slug `villkor`). Motsvarighet till
 * `./es-CL.encargo.ts`, men enligt GDPR i stället för Ley 21.719, och
 * utan Mercado Pago (D-027: ingen kundbetalning i Sverige) — Stripe
 * hanterar bara företagets egen betalning för sin plan, inte uppgifter
 * om företagets kunder, och räknas därför inte som underbiträde här (se
 * §"Underbiträden").
 */
import { LEGAL_VERSION, list, p, type LegalDoc } from "./types";
import type { LegalEntity } from "./entity";

export function getBitradesavtalSE(entity: LegalEntity): LegalDoc {
  const { legalName } = entity;
  return {
    slug: "bitradesavtal",
    title: "Personuppgiftsbiträdesavtal",
    status: "draft",
    version: LEGAL_VERSION,
    versionLabel: `Version ${LEGAL_VERSION}`,
    intro: [
      p(
        `Det här dokumentet är en bilaga till Allmänna villkor för företag och reglerar, mellan företaget (personuppgiftsansvarig) och ${legalName} (personuppgiftsbiträde), hur vi behandlar personuppgifter om företagets kunder, enligt EU:s dataskyddsförordning (GDPR).`,
      ),
    ],
    sections: [
      {
        id: "syfte-och-varaktighet",
        heading: "Syfte och varaktighet",
        blocks: [
          p(
            `${legalName} behandlar personuppgifter om företagets kunder enbart för att leverera plattformens tjänst: hantera bokningar, skicka bekräftelser och påminnelser, och de övriga funktioner företaget tecknar. Det här uppdraget varar så länge företaget har ett aktivt konto i plattformen.`,
          ),
        ],
      },
      {
        id: "instruktioner",
        heading: "Företagets instruktioner",
        blocks: [
          p(
            "Vi behandlar uppgifterna enligt företagets instruktioner, som återspeglas i hur kontot är inställt och i plattformens normala användning, till exempel vilka frågor företaget lägger till i bokningsformuläret eller vilka marknadsföringsmeddelanden det aktiverar. Skulle en instruktion från företaget strida mot lagen meddelar vi det.",
          ),
        ],
      },
      {
        id: "konfidentialitet",
        heading: "Konfidentialitet",
        blocks: [
          p(
            "Personer i vårt team som får tillgång till företagets kunduppgifter har tystnadsplikt och kommer bara åt det som krävs för att driva eller ge support på plattformen.",
          ),
        ],
      },
      {
        id: "sakerhetsatgarder",
        heading: "Säkerhetsåtgärder",
        blocks: [
          list([
            "Uppgifterna isoleras per företag på databasnivå: inget företag kan se ett annat företags uppgifter.",
            "Nycklar till tredjepartstjänster som företaget kopplar på sparas krypterade.",
            "Inga personuppgifter i de tekniska felloggarna.",
          ]),
        ],
      },
      {
        id: "underbitraden",
        heading: "Underbiträden",
        blocks: [
          p(
            `För att leverera tjänsten anlitar ${legalName} följande underbiträden, med sin plats angiven i integritetspolicyn: Supabase, Vercel, Resend och ClickSend. Företaget godkänner generellt användningen av de här underbiträdena och av de som ersätter dem på likvärdiga dataskyddsvillkor; lägger vi till ett nytt underbiträde med en annan typ av åtkomst meddelar vi det i förväg.`,
          ),
          p(
            "Stripe hanterar bara företagets egen betalning för sin plan hos plattformen, inte uppgifter om företagets kunder, och räknas därför inte som underbiträde enligt det här avtalet.",
          ),
        ],
      },
      {
        id: "stod-till-foretaget",
        heading: "Stöd till företaget",
        blocks: [
          p(
            "Vi hjälper företaget att besvara sina kunders önskemål om tillgång, rättelse eller radering, inom ramen för de verktyg plattformen erbjuder. Upptäcker vi en säkerhetsincident som berör företagets kunduppgifter meddelar vi det utan onödigt dröjsmål, med 72 timmar som intern riktlinje för den första underrättelsen.",
          ),
        ],
      },
      {
        id: "radering-vid-avslut",
        heading: "Radering av uppgifter vid avslut",
        blocks: [
          p(
            "När företaget säger upp sitt konto hanteras dess uppgifter och dess kunders uppgifter enligt tidsfristerna i integritetspolicyn: uppsägningen tar bokningssidan offline omedelbart, och uppgifterna raderas 30 dagar senare om företaget inte återställer kontot.",
          ),
        ],
      },
      {
        id: "information-och-granskning",
        heading: "Information och granskning",
        blocks: [
          p(
            "Företaget kan begära rimlig information från oss om hur vi uppfyller det här avtalet. Vi delar aldrig ett företags information med ett annat företag.",
          ),
        ],
      },
    ],
  };
}
