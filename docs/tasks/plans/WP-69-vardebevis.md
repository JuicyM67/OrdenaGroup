# WP-69 · Värdebevis via Stripe Connect (bara SE) — plan

Status: plan klar 2026-10-10. Beror på: **WP-64 ☑** (Stripe Connect, sk_test-nycklar och webhook på plats), **WP-67 ☑** (konton), **WP-68 ☑** (erbjudanden). CL: dolt (D-035) tills Mercado Pago-varianten planeras.
Design: *A·Erbjudande mobil* (fast "Köp och välj tid"), *Min profil* (värdebevis med kod BB-XXXX, "Nästa bokning · Betald").
Beslut som berörs: D-008 (vi rör inte pengarna — direct charge, företaget är säljare), D-022/D-023, D-027/D-044 (Stripe i SE), D-029 (token-mönster), D-036 (förfrågningar), D-039 (budget `/[slug]`), D-045 ("genomförd"). Nytt förslag: **D-052**.

## 1. Mål
En inloggad konsument köper ett erbjudande med kort via Stripe Checkout på företagets Connect-konto, får ett värdebevis med kod som gäller minst 12 månader, och löser in det helt vid en bokning (online eller i salongen); ångerrätt 14 dagar, återbetalning och plattformens marknadsplatsprovision hanteras automatiskt och syns i Caja. (Ingen F# i MVP_SPEC; bygger på F10/F11-mönstren.)

## 2. Utanför scope
- Delinlösen, saldo-presentkort, presentkort med fritt belopp, köp som gåva till annan mottagare (IDEAS).
- Köp utan konto (gäst).
- Mercado Pago/CL.
- Automatisk bokföring/moms-rapport, kvitto från certifierat kassaregister.
- Delåterbetalningar och tvister som hanteras i Stripe-dashboarden speglas bara som status (ingen egen hantering utöver att blockera värdebeviset).

## 3. Ägare och mappar
| Agent | Rör bara |
|---|---|
| db-engineer | `supabase/migrations/20261022*_*.sql` · `supabase/tests/130–134_*.test.sql` · `src/types/database.ts` · rapportfunktioner för Caja (SQL) |
| integrations-engineer | `src/server/payments/stripe/**` (ny `voucher-checkout.ts`, `voucher-refund.ts`, webhook-gren) · `src/server/vouchers/**` (ny: köp, kod, livscykel, utgång) · `src/config/platform-fee.ts` (`MARKETPLACE_FEE_BPS`) · `src/app/api/webhooks/stripe/route.ts` · `src/app/api/cron/outbox/route.ts` (svep) · `src/server/messaging/**` (mallar) |
| scheduling-engineer | `src/server/bookings/**` (bokning med värdebevis: validering, reservation, återlämning vid neka/utgång/avbokning) |
| ui-engineer | `src/app/(consumer)/oferta/**` (köpknapp) · `src/app/(consumer)/cuenta/vales/**` + sektionen i `src/components/account/**` · `src/app/[slug]/page.tsx` + bokningskomponenten (värdebevisläge) · `src/app/(app)/app/caja/**` + `src/components/caja/**` ("Lös in kod", rader) · `src/app/(app)/app/ofertas/**` (sålda/inlösta, återbetala) |
| copywriter-es-cl (+ sv) | `src/i18n/sv-SE.*.ts`, `src/i18n/es-CL.*.ts` (nycklar för köp, värdebevis, mejl), villkorstext för värdebevis (utkast till jurist) |
| security-reviewer | granskar alla steg som rör `supabase/`, `src/app/api/`, `src/server/payments/` |

## 4. Steg
1. **DB** (db) — `20261022000000_vouchers.sql`:
   - `public.voucher_orders` (`business_id`, `id`, `offer_id`, `user_id`, Stripe `session_id`/`payment_intent_id` unika, `amount_minor`, `fee_minor`, `currency`, `status` `open|paid|expired|failed`, `expires_at` = session + 31 min). En öppen order **räknas mot `quantity_total`** så att det inte kan översäljas (lås `offers`-raden `for update` vid skapande).
   - `public.vouchers` (`business_id`, `id`, `order_id`, `offer_id`, `user_id`, `code` (unik, `BB-` + 8 tecken Crockford base32, prefix per varumärke från `brand.ts`), `service_id`, `price_minor` (ögonblicksbild), `purchased_at`, `expires_at` (= köpdag + `valid_months`, sista minuten den dagen i företagets tidszon), `status` `active|reserved|redeemed|refunded|expired|disputed`, `booking_id` null med sammansatt FK, `redeemed_at`, `refunded_at`). CHECK: `reserved/redeemed` ⇔ `booking_id` satt eller `redeemed_at` (inlöst i salong); en bokning har högst ett värdebevis (unik `booking_id`) — **ingen delinlösen**.
   - RLS: konsumenten läser egna (`user_id = auth.uid()`); företagsmedlemmar läser företagets värdebevis **utan kolumnen `code`** (kolumn-grants) och löser in via `public.redeem_voucher_by_code(business_id, code)` (security definer, rate-limitad, kräver `can_manage_all_bookings` eller ägare). Skrivningar bara service_role eller funktioner.
   - `payments`: `booking_id` blir nullable + `voucher_id` (sammansatt FK) + CHECK exakt en av dem; `payment_method` += `voucher`. Rapportfunktionerna räknar försäljningen (`stripe` + `voucher_id`) som intäkt på köpdagen och `voucher`-raden vid inlösen som **0 i intäkt** (ingen dubbelräkning).
   - Trigger på `bookings.status`: `cancelled`/nekad/utgången ⇒ värdebeviset tillbaka till `active` (om inte utgånget); `completed` eller `confirmed` vars tid passerat (D-045:s "genomförd") ⇒ `redeemed`; `no_show` ⇒ `redeemed` (se jurist-fråga).
   - Tester: `130_vouchers.test.sql` (tenant-isolering, konsument A ser inte B:s värdebevis, medlem ser inte `code`, en bokning ett värdebevis, statusövergångar, kvantitetsvakt), `131_voucher_payments_caja.test.sql` (rapporten räknar en gång).
2. **Köp** (integrations) — `src/server/vouchers/purchase.ts` + `src/server/payments/stripe/voucher-checkout.ts`: server action från erbjudandesidan (kräver konto, WP-67; utloggad → inloggning med `auth_intent=customer`). Belopp = erbjudandets `offer_price_minor` från DB, aldrig klienten. Stripe Checkout **direct charge** på företagets konto (`stripe_accounts.charges_enabled` krävs, annars visas inte knappen), `capture_method=automatic`, `application_fee_amount = floor(amount × MARKETPLACE_FEE_BPS / 10 000)`, `metadata.kind = voucher`, idempotency key = order-id, `expires_at` 31 min, `locale` sv. Konsumentinfo i Checkout: säljare = företaget.
3. **Webhook + avstämning** (integrations) — befintlig `/api/webhooks/stripe` (signatur, `inbound_events`, D-044): gren för `checkout.session.completed` / `checkout.session.expired` / `charge.refunded` / `charge.dispute.created` med `metadata.kind = voucher`. Data hämtas alltid från Stripes API. `reconcileVoucherOrder(orderId)` idempotent, även från cron-passet. Vid betald order i EN transaktion: `vouchers`-rad, `payments`-rad (`stripe`, `voucher_id`), outbox-mejl "Ditt värdebevis" (kod, villkor, giltighet, säljare + org.nr, ångerrättsinformation, länk "Välj tid") — regel 4.
4. **Inlösen vid bokning** (scheduling + ui) — "Välj tid" leder till `/[slug]?vardebevis=<id>` (inloggad): bokningen begränsas till erbjudandets tjänst, priset visas som "Betalt med värdebevis", onlinebetalning (WP-64) hoppas över. `submit.ts` validerar i samma transaktion som bokningen: ägs av användaren, `active`, inte utgånget vid **bokningens start** (se FRÅGA), rätt tjänst ⇒ `reserved` + `booking_id`. Förfrågningsflödet (D-036) gäller oförändrat; neka/utgång/avbokning lämnar tillbaka värdebeviset (steg 1-triggern). JS-tillägg på `/[slug]` < 2 kB, budget 190 kB (D-039) hålls.
5. **Inlösen i salongen** (ui + db) — Caja → "Lös in kod": ägaren skriver koden, ser tjänst/giltighet/köpare (förnamn), kopplar valfritt till dagens bokning eller markerar som inlöst utan bokning. Felkod: rate limit per företag (10/min) mot gissning.
6. **Ångerrätt och återbetalning** (integrations + ui) — Konsumenten: "Ångra köp" i `/cuenta/vales` inom 14 dagar från köp om värdebeviset är `active` ⇒ full `refund` med `refund_application_fee=true` ⇒ `refunded`, `payments` → `refunded`, mejl. Företaget (ägaren): "Återbetala" på ett oinlöst värdebevis när som helst (goodwill, stängning). Efter 14 dagar finns ingen konsumentknapp; kunden hänvisas till företaget.
7. **Utgång** (integrations) — svep i cron-passet: `active` med `expires_at < now()` ⇒ `expired`; påminnelse-mejl 30 dagar och 7 dagar före utgång (outbox, en gång vardera).
8. **Provision** (integrations) — `src/config/platform-fee.ts`: `MARKETPLACE_FEE_BPS` (en siffra, eller per plan som `PLATFORM_FEE_BPS`), platshållare tills ägaren bestämt nivån; enhetstest att den alltid är ≥ bokningsavgiften (D-044) och ≤ 50 %. Visas för företaget i Erbjudanden-redigeraren ("Du får X kr per sålt värdebevis").
9. **Profil och dashboard** (ui + copy) — `/cuenta/vales` (`/konto/vardebevis`): aktiva, använda, utgångna; kod, QR saknas i v1; "Välj tid", "Ångra köp". Min profil visar sektionen (tas fram ur D-035-döljningen). Erbjudanden i dashboarden: sålda, inlösta, utgångna, återbetalade per erbjudande.
10. **Docs** — D-052, `docs/legal/JURIST_FRAGOR.md` (via security-reviewer), villkorstext, BACKLOG.

## 5. Tester
- **pgTAP:** 130–131 enligt steg 1 + schemavakten.
- **Enhet:** avgift i öre (avrundning nedåt, aldrig > belopp), kodgenerator (alfabet utan 0/O/1/I, kollisionsförsök), `expires_at` i företagets tidszon (köp 2026-10-24 23:30 Stockholm, sommartid slutar 2026-10-25 — giltig till 2027-10-24 23:59 lokal tid), 14-dagarsgränsen (dag 14 23:59 ja, dag 15 nej, lokal tid), webhook-gren väljer rätt hanterare på `metadata.kind`.
- **DB-integration:** två samtidiga köp av sista exemplaret (två riktiga pg-anslutningar) ⇒ exakt ett lyckas; samma webhook två gånger ⇒ ett värdebevis; bokning nekas ⇒ `active` igen; två samtidiga bokningar med samma värdebevis ⇒ en lyckas (unik `booking_id` + radlås).
- **E2E (Stripe testläge, `stripe listen` lokalt):** köp → mejl i Mailpit → kod i profilen → välj tid → företaget bekräftar → markera Llegó → `redeemed`; ångra köp inom 14 dagar; inlösen i Caja med kod; Caja visar intäkten en gång.
- **Säkerhet:** medlem i företag B kan inte lösa in A:s kod; konsument kan inte boka med annans värdebevis-id; manipulerat belopp i klienten ignoreras.

## 6. Risker och öppna frågor
- **R1 Pengarna ligger hos företaget (direct charge, D-008).** Stänger ett företag med oinlösta värdebevis kan plattformen inte återbetala själv. Visas tydligt ("Säljs av …"); Stripe kan dra negativt saldo från företaget vid återbetalning.
- **R2 Avgiftsbärare:** med Express-konton kan plattformen bära Stripes kortavgift (D-044 OBS) — provisionen måste täcka den.
- **R3 Gissning av koder:** 8 tecken base32 (~10¹²) + rate limit + kräver inloggad medlem.
- `JURIST: Giltighetstid — räcker 12 månader för värdebevis i SE (Konsumentverkets/ARN:s praxis: minst ett år anses skäligt; utan angiven tid gäller allmän preskription 10 år)? Får företaget behålla värdet efter utgång?`
- `JURIST: Ångerrätt (lag 2005:59, 2 kap.) — gäller 14 dagar för värdebevis utan bestämt datum (undantaget för fritidstjänster på bestämt datum bör inte gälla)? Vad händer om kunden bokar och genomför behandlingen inom 14 dagar — förlorad ångerrätt kräver uttryckligt samtycke före start; behövs en kryssruta vid bokning?`
- `JURIST: No-show med värdebevis — får det räknas som inlöst (som no-show behåller betalningen, D-044)?`
- `JURIST: Moms — enfunktionsvoucher (moms vid försäljning hos företaget) och kvitto/kassaregisterkrav för onlineförsäljning; plattformsprovisionens moms (25 %).`
- `JURIST: Marknadsplatsens ansvar — informationskrav om att säljaren är näringsidkare, och om plattformen kan anses som säljare (Let's Deal-modellen) när kunden köper "på" vår sajt.`
- FRÅGA: Vilken provisionsnivå ska gälla för marknadsplatsköp (förslag: en platshållare på 10 % i `MARKETPLACE_FEE_BPS` tills du bestämt)? Samma för alla planer?
- FRÅGA: Ska värdebeviset gälla om det är giltigt vid **bokningstillfället** (kunden kan boka en tid efter utgången) eller måste **besöket** ske före utgången? (Planen antar: besöket.)
- FRÅGA: Ska köp kräva konto (planens antagande, ger "Mina värdebevis"), eller ska gästköp med bara e-post tillåtas?

**D-052 (förslag) · Värdebevis via Stripe Connect (SE).** Direct charge på företagets Express-konto med `application_fee_amount` = `MARKETPLACE_FEE_BPS` (konfigurerbar, högre än bokningsavgiften). Värdebevis = en tjänst, hel inlösen, kod `BB-XXXXXXXX`, giltigt ≥ 12 månader, kräver kundkonto. Ångerrätt 14 dagar via knapp; därefter återbetalar bara företaget. Caja: intäkt vid köpet, inlösen räknas inte igen. Neka/utgång/avbokning lämnar tillbaka värdebeviset; genomförd eller no-show förbrukar det. CL dolt tills Mercado Pago-varianten beslutas.

## 7. Klart när
- [ ] Inloggad konsument köper ett erbjudande i Stripe testläge; pengarna landar på företagets Connect-konto minus provisionen.
- [ ] Värdebeviset med kod syns i profilen och i mejlet; giltighet ≥ 12 månader i företagets tidszon.
- [ ] Inlösen vid onlinebokning och med kod i Caja fungerar; ingen delinlösen; neka/avbokning lämnar tillbaka värdebeviset.
- [ ] Ångra köp inom 14 dagar ger full återbetalning inklusive provision; företaget kan återbetala oinlösta.
- [ ] Översäljning omöjlig (samtidighetstest), webhooken idempotent.
- [ ] Caja och rapporter räknar varje värdebevis exakt en gång.
- [ ] `/[slug]` ≤ 190 kB; `npm run typecheck && npm run lint && npm run test && npm run test:db` gröna; `npm run visual` < 2 % på nya skärmar.
- [ ] security-reviewer godkänd; jurist-frågorna registrerade i `JURIST_FRAGOR.md`; D-052 och BACKLOG uppdaterade. Skarp lansering först efter juristens svar.

## Ägarens beslut 2026-10-10 (ersätter antaganden ovan där de skiljer sig)
- Marknadsplatsavgift: **1 %** (`MARKETPLACE_FEE_BPS = 100`, konfigurerbar).
- Köp av värdebevis **kräver konto** (inga gästköp).
- Blixttider visas på marknadsplatsen **som standard** (företaget kan stänga av).
- **Chile: marknadsplatsen helt dold** tills Mercado Pago finns.
- Samma domän (`/upptack`, CL `/descubre`). Besöket ska ske före värdebevisets utgång. SMS-verifiering av telefon: inte i v1 (e-post räcker). Avbokning från kontot: ja i v1 (återanvänd befintligt manage-flöde).
- Design: riktning A (lista först) — exporterade `.dc.html` från artifacten läggs i `docs/design/reference/marketplace/`.
