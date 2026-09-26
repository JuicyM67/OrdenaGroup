# Marknadsanalys — bokningssystem för pymes i Chile

*Research gjord september 2026. Priser och avgifter ändras, så verifiera mot källan innan beslut.*

## 1. Marknaden

- Cirka **759 000 aktiva pymes** (Banco Central, maj 2025) plus nästan **2 miljoner mikroföretagare** (INE, VIII EME). Tillsammans är de över 98 % av alla företag.
- **54 %** av mikroföretagarna är informella. Många bokar i dag via WhatsApp, Instagram DM och telefon, utan system.
- Efterfrågan på digital bokning är bevisad: Reservo uppger 70+ miljoner bokade tider, och Easycancha hanterade hundratusentals bokningar per månad redan för några år sedan.

**Slutsats:** marknaden är stor men fragmenterad. Vi vinner inte på att vara "ännu ett AgendaPro" utan på att vara enklare, billigare för små aktörer, WhatsApp-först och på att aktivt fylla agendan.

## 2. Konkurrenter och priser

| Aktör | Typ | Pris (ca) | Styrka | Svaghet |
|---|---|---|---|---|
| **AgendaPro** (chilensk, störst i LatAm) | SaaS | Individual 15 900 CLP/mån + IVA, Básico 34 900 CLP/mån + IVA; POS 2,49 % + IVA | Komplett, många branscher | Upplevs dyrt för små; WhatsApp-kvoter (50 i Básico) |
| **Reservo** | SaaS, hälsa/skönhet | 30 000 / 50 000 / 80 000 / 180 000 CLP/mån | Boleta SII, Webpay/MP, Fonasa-telemedicin | Begränsade WhatsApp-kvoter, ingen app |
| **Fresha** | SaaS + marknadsplats | ca 19,95 USD/mån (1 person), 14,95 USD/person i team; 20 % på nya kunder via marknadsplatsen | Stor konsumentapp | Kritik för felaktig debitering av "nya" kunder |
| **Booksy** | SaaS + marknadsplats | ca 23 000–25 000 CLP/mån + per anställd (uppskattat) | Stark konsumentapp | Inte anpassad för chilenska betalningar/SII |
| **Easycancha** | Nischmarknadsplats sport | Provision eller fast avgift | Dominerar padel/tennis | Bara sport |
| **Encuadrado, Turnito, AgenditApp, Bolo** | Nisch-SaaS | Från ~10 000 CLP/mån eller gratis | Billiga, enkla | Gör inget för att fylla agendan |
| **Cuponatic** | Deal-sajt | Bara provision (historiskt ~23 %) | Känt för rabatter | Kuponger utan koppling till lediga tider |

**Luckan:** enkelt som de billiga verktygen, men med funktioner som aktivt fyller tomma timmar, till platt pris och med uppsättning på plats.

**Lärdom från Groupon/Peixe:** Groupons chilenska efterföljare gick i konkurs 2021 med tusentals kuponger som inte kunde lösas in. Därför är våra *horas flash* alltid en redan bokad tid, och pengarna går direkt till företaget.

## 3. Smärtpunkter

### Företagen
- **No-shows** på 15–30 % beroende på bransch; inom skönhet uppskattningsvis 15–25 %. Påminnelser och handpenning ("abono") hjälper mest.
- Bokning via WhatsApp **för hand**, hela dagarna och kvällarna.
- **Priser som växer per användare** och extra avgifter för WhatsApp.
- **Boleta/SII** sköts ofta manuellt.
- **Tomma timmar** mitt i veckan medan fredagar är fullbokade.

### Konsumenterna
- Ingen svarar i telefon, och man ser inte vilka tider som är lediga.
- Misstro mot deal-sajter efter Groupon-kollapsen.
- Vill betala på sitt sätt: debit (Redcompra), kredit i cuotas, överföring, Mercado Pago.
- Vill kunna avboka och flytta själv.

## 4. Betalningar (avgifter exkl. 19 % IVA)

| Leverantör | Vad | Avgift | Utbetalning | Användning hos oss |
|---|---|---|---|---|
| **Mercado Pago** | Kort, debit, överföring, saldo | 3,19 % direkt / 2,89 % efter 10 dagar | Direkt / 10 dagar | **Handpenning** via företagets eget konto (OAuth); stöder split om vi senare bygger marknadsplats |
| **Transbank Webpay Plus** | Debit, kredit, prepago | ca 1,75–2,35 % + minimiavgift i UF | 24–48 h | Senare, via Flow |
| **Flow** | Webpay, MACH, Onepay, Khipu, Servipag | 2,89 % (3 dagar) / 3,19 % (nästa dag) | 1–3 dagar | **Vår egen prenumeration** (återkommande betalning) |
| **Fintoc** | Kontoöverföring | 1 % via API | 24 h | Senare, för dyrare tjänster |
| **Khipu** | Överföring | 0,69 % | 24–72 h | Alternativ |

## 5. WhatsApp Business Platform: kostnad

- Från **1 oktober 2026** tar Meta betalt för utility-meddelanden även inom 24-timmarsfönstret. Chile: utility ca **0,024 USD**, marknadsföring ca **0,107 USD**, service ca 0,020 USD. 1 000 servicemeddelanden gratis per månad och nummer.
- En bokning med bekräftelse och påminnelse kostar alltså ≈ 0,05 USD.
- **Konsekvens:** kvoter per plan, tilläggspaket, e-post som komplement och direkt koppling till Metas Cloud API (inte via en BSP som lägger på 10–50 %).
- Horas flash och "te echamos de menos" är **marknadsföring**: dyrare, och de kräver samtycke.

## 6. Open source-grund (utvärderad)

| Projekt | Licens | Bedömning |
|---|---|---|
| Hiberius/whatsapp-receptionist | MIT | Bra referens för multi-tenant + RLS, WhatsApp-utkorg, GDPR-export. Saknar personal och resurser, italienska. **Läs för mönster, forka inte.** |
| ItsCrake/appointment-saas ("Bazman") | **Ingen licens** | Närmast produkten (personal, exclusion constraint, sommartidstester, WhatsApp-mallar). **Får inte kopieras** utan tillstånd. |
| calcom/cal.diy | MIT | Möten, inte salonger. Referens för slot-beräkning och kalendersynk. |
| Easy!Appointments | GPL-3.0 | PHP, fel stack. |

**Beslut:** vi bygger egen kärna (se [DECISIONS](../decisions/DECISIONS.md)). Mönster får inspireras av MIT-projekten, med licenstext om kod kopieras.

## 7. Källor

- AgendaPro: https://agendapro.com/cl/planes
- Reservo: https://agendamiento.reservo.cl/homepage/cl/salud/
- Fresha: https://www.fresha.com/pricing
- Pymes i siffror (La Tercera): https://www.latercera.com/tendencias/noticia/pymes-en-cifras-cuantas-hay-en-chile-cuanta-venta-generan-y-en-que-regiones-les-va-mejor/
- Ex-Groupon i konkurs (La Tercera): https://www.latercera.com/la-tercera-pm/noticia/otra-quiebra-mas-exgroupon-incumple-acuerdo-de-pago-a-acreedores-y-solicitan-liquidacion-por-consecutivas-cuarentenas/OS66JOUDKNDTDAW76AW3DY44RY/
- Mercado Pago: https://www.mercadopago.cl/herramientas-para-vender/check-out · marketplace: https://www.mercadopago.cl/developers/es/docs/checkout-pro/how-tos/integrate-marketplace
- Transbank: https://publico.transbank.cl/tarifas
- Betalmedel Chile 2026 (Riqra): https://blog.riqra.com/posts/medios-de-pago-chile
- WhatsApp-priser från 1 okt 2026 (Woztell): https://woztell.com/es/whatsapp-business-pricing/
- No-shows i Chile: https://iautomatiza.cl/blog/agendamiento-automatico-reducir-no-shows
- Cal.diy: https://github.com/calcom/cal.diy · whatsapp-receptionist: https://github.com/Hiberius/whatsapp-receptionist
