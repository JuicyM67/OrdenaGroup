# WP-78 · Abonnemangsbetalning via Stripe Billing (SE)

Bygger på WP-73 (D-048: planmatris `src/config/plans.ts`, spärrar på servern, nedgradering utan dataförlust, `custom` via `/admin`), WP-76 (D-053: Checkout på plattformens konto, fast skattesats 25 %, plattformshändelser utan `account` i webhooken) och WP-64 (D-044: `inbound_events`, signerad webhook). Genomför D-027 ("Stripe för abonnemang i Sverige") och M4:s abonnemangsdel. Beroende: WP-73 och WP-76 mergade till `main`.

**Läget i dag:** ingen kan betala för en plan. Priser (exkl. moms) i `src/config/pricing.ts`: Gratis 0 · Starta (`emprende`) 299 kr · Team (`equipo`) 499 kr · Företag (`local`) 799 kr per månad. Inställningar → Plan visar plan och användning; "Byt plan" går till prissidan (D-048). `businesses.plan` sätts bara av servern/admin (B2-grants); `plan_override_until` och `trial_ends_at` finns men styr ingenting automatiskt.

**Antaganden (planerarens, ej bekräftade; se FRÅGA i avsnitt 6):**
- A1. Månadsbetalning, bara kort (Stripe Checkout + Customer Portal). Ingen årsbetalning i v1.
- A2. Provperiod **en gång per företag**, första gången en betald plan startas, med kort (Checkout samlar in kortet, första dragningen när provperioden slutar). Längd: se FRÅGA (MVP_SPEC F17 säger 30 dagar, ägarens exempel 14).
- A3. Uppgradering gäller direkt med proration, debiteras direkt; planen ändras **först när betalningen gått igenom**. Nedgradering mellan betalda planer gäller direkt med kredit på nästa faktura. Nedgradering till Gratis = uppsägning vid periodens slut.
- A4. Misslyckad betalning → `past_due` → planen behålls under en grace period på **14 dagar** (Stripes Smart Retries under samma tid) → sedan sägs abonnemanget upp och företaget går till Gratis utan dataförlust (D-048).
- A5. Moms 25 % via en fast Stripe-skattesats (exklusiv) som `default_tax_rates` på abonnemanget — samma Stripe-objekt som D-053 kan användas. Alla kunder är svenska företag; omvänd skattskyldighet utanför SE hanteras inte.
- A6. Planbyten görs i vår app (inte i Customer Portal); Portalen används för kort, kvitton/fakturor, faktureringsuppgifter och uppsägning.

---

## 1. Mål
Ägaren av ett företag i SE kan starta, byta och säga upp sin plan med kort via Stripe Billing på plattformens konto, och `businesses.plan` följer abonnemangets betalda status (provperiod, aktiv, betalning misslyckad, uppsagd) utan att någon plan låses upp utan bekräftad betalning. Underlag: F17 (abonnemang och fakturering: planer, provperiod, prenumeration, faktura till kunden, kvoter och tilläggspaket — F17 saknar ett formellt "klart när"; föreslaget: *ett företag kan gå från Gratis till en betald plan och tillbaka helt själv, och planen i appen stämmer alltid med Stripe*) och F19 (intern admin: planer, frysning/förlängning av provperiod).

## 2. Utanför scope
- Chile (Flow-prenumeration, D-027) — egen WP; Plan-fliken i CL är oförändrad.
- Årsbetalning, rabattkoder/kuponger, per-anställd-prissättning, tilläggsplatser.
- Stripe Tax (`automatic_tax`), OSS/omvänd skattskyldighet för kunder utanför SE.
- Betalning med faktura/autogiro för standardplanerna (bara kort).
- Planbyte i Customer Portal (A6).
- Ändring av SMS-krediterna (WP-76/D-053) — de är oförändrade, egen Checkout utan Stripe-kund. Att samla dem på samma Stripe-kund är en idé (IDEAS).
- Skräddarsytt (`custom`) i Stripe: faktureras manuellt (Stripe Dashboard eller utanför), planen sätts av admin som i dag.
- Marknadssajtens prissida: CTA:erna ändras inte (de går till registrering som i dag).
- Provisionslogik för förmedlare (F18).

## 3. Ägare och mappar
Migration `20261018010000_billing_subscriptions.sql`, pgTAP **119**. Filkollision: `src/server/payments/stripe/webhook.ts` rörs också av WP-77 — bara den nya plattformsgrenen här (se WP-77 avsnitt 3); `plan-section.tsx` och `ajustes/plan/**` rördes av WP-73/WP-76 (mergade innan start).

| Agent | Får röra |
|---|---|
| db-engineer | `supabase/migrations/20261018010000_billing_subscriptions.sql`, `supabase/tests/119_billing_subscriptions.test.sql`, `src/types/database.ts` |
| integrations-engineer | `src/server/billing/subscriptions/**` (ny: `config.ts`, `customer.ts`, `checkout.ts`, `change.ts`, `portal.ts`, `sync.ts`, `dunning.ts`, `status.ts` + `subscriptions.db.test.ts`), `src/server/payments/stripe/webhook.ts` (bara plattformsgrenen för abonnemang), `src/server/plans/entitlements.ts` (bara läsning av abonnemangsstatus till `loadPlanUsage`), `src/server/privacy/business.ts` (uppsägning vid radering), `src/server/admin/businesses.ts` (varning/blockering när admin sätter `custom` på ett företag med aktivt abonnemang), `src/app/api/cron/outbox/route.ts` (svep), `src/server/messaging/**` (två mejlmallar), `scripts/stripe-billing-setup.ts` (ny), `src/lib/validation/billing.ts` (ny) |
| ui-engineer | `src/components/settings/plan-section.tsx`, `src/components/settings/plan-billing-*.tsx` (nya: statuskort, bytdialog), `src/app/(app)/app/ajustes/plan/page.tsx`, `src/app/(app)/app/ajustes/plan/actions.ts`, appens banner för misslyckad betalning (befintlig `OwnerChromeProvider`-yta, bara visning), `src/app/design-lab/` |
| copywriter-es-cl (+ sv) | `src/i18n/sv-SE*.ts`, `src/i18n/es-CL*.ts` (typparitet), villkorstext för abonnemang i `docs/content/` |
| planner | `docs/tasks/BACKLOG.md`, `docs/tasks/IDEAS.md`, `docs/decisions/DECISIONS.md` (D-059 när ägaren godkänt) |

## 4. Steg (en PR per steg om inget annat anges)

### Steg 0 — Designskiss (ui-engineer, ingen produktionskod)
Ingen referens finns för betalningsdelen av Plan-fliken. Skiss (artifact) av: statuskort (plan, status-chip "Provperiod till …" / "Aktiv" / "Betalningen misslyckades" / "Avslutas …", nästa faktura belopp inkl. moms + datum, kortets fyra sista siffror, knappar "Hantera betalning" och "Säg upp"/"Återuppta"), plankorten med "Välj"/"Nuvarande", bytdialog (ny plan, belopp i dag efter proration, nästa ordinarie belopp, moms), bannern för misslyckad betalning, retur från Checkout. **Ägaren godkänner innan steg 6**; godkänd skiss läggs i design-lab och blir referens för `npm run visual` (som D-053).

### Steg 1 — Beslut + texter (planner + copywriter)
- D-059 (förslag, nedan) in i `DECISIONS.md` när FRÅGA-punkterna är besvarade.
- Copy: statuschips, bytdialogen, "Hantera betalning", uppsägning/återupptag, provperiodstext, grace-banner ("Vi kunde inte dra betalningen. Uppdatera kortet före {datum} så behåller du {plan}."), mejlmallar `abonnemangBetalningMisslyckades` och `abonnemangNedgraderat` (till ägaren), felkoder `billing_unavailable`, `billing_not_owner`, `billing_custom_plan`, `billing_payment_required`, `billing_already_subscribed`. Villkorstext: månadsvis, förskott, proration, uppsägning vid periodens slut, ingen återbetalning för påbörjad period, nedgradering raderar inte data.

### Steg 2 — Stripe-produkter och priser per miljö (integrations-engineer)
`scripts/stripe-billing-setup.ts` (körs av **människa** mot testläge; liveläge bara av ägaren — regel 8):
- Idempotent upsert av produkter (`metadata.plan = emprende|equipo|local`) och priser `SEK`, `recurring.interval = month`, `tax_behavior = exclusive`, belopp **läses från `src/config/pricing.ts`** (SE). `lookup_key = bb_se_<plan>_monthly_v1`. Ett ändrat belopp ger nytt pris med `_v2` och `transfer_lookup_key` — gamla abonnemang ligger kvar på sitt pris tills någon migrerar dem (se FRÅGA).
- Customer Portal-konfiguration (`billingPortal.configurations`): uppdatera kort, faktureringsuppgifter, se fakturor, säga upp vid periodens slut; **planbyte av**. Id sparas i `STRIPE_BILLING_PORTAL_CONFIG_ID`.
- Skriptet skriver ut vilka env-variabler som ska sättas. Ingen nyckel i repo.

`src/server/billing/subscriptions/config.ts`: `PLAN_LOOKUP_KEYS`, `billingAvailable()` = SE + `STRIPE_SECRET_KEY` + `STRIPE_VAT_RATE_ID` (eller D-053:s `STRIPE_SMS_VAT_RATE_ID` som reserv) + `STRIPE_BILLING_PORTAL_CONFIG_ID` (D-035: saknas något visas Plan-fliken som i dag). Priser slås upp via `prices.list({ lookup_keys })` med kort cache; ett enhetstest kontrollerar att `pricing.ts` och Stripe-priset har samma belopp (körs mot testläget i CI bara om nyckeln finns).

### Steg 3 — Datamodell, RLS, funktioner, pgTAP (db-engineer)
`20261018010000_billing_subscriptions.sql`:

**`public.billing_subscriptions`** (en rad per företag, spegel av Stripe):
- `business_id uuid pk references businesses on delete cascade`, `stripe_customer_id text unique not null`, `stripe_subscription_id text unique`, `plan public.business_plan` (`check plan in ('emprende','equipo','local')` när abonnemang finns), `price_lookup_key text`, `status text check (status in ('incomplete','incomplete_expired','trialing','active','past_due','unpaid','canceled','paused'))`, `trial_end`, `current_period_end`, `cancel_at_period_end boolean`, `grace_until timestamptz`, `card_brand`, `card_last4`, `trial_used_at timestamptz` (sätts första gången en provperiod startar — en per företag), `stripe_updated_at timestamptz` (`subscription.created`-tid eller senaste API-hämtning, för ordningskontroll), `open_checkout_session_id text`, `open_checkout_expires_at`, timestamps.
- RLS: **bara ägaren** läser sin rad (samma ägarhjälpare som `stripe_accounts`/`sms_credit_purchases`); inga skriv-grants för `authenticated`; `service_role` skriver.

**Funktioner** (`private`, security definer, `search_path = ''`, bara `service_role`):
- `billing_apply_subscription(p_business, p_customer, p_subscription, p_plan, p_status, p_trial_end, p_period_end, p_cancel_at_period_end, p_card_brand, p_card_last4, p_stripe_time)` — uppdaterar raden **och** `businesses.plan` i samma transaktion enligt regeln:
  - `trialing` / `active` → planen från priset.
  - `past_due` → planen behålls; `grace_until = coalesce(grace_until, now() + 14 days)`.
  - `unpaid` / `canceled` / `incomplete_expired` → `free`.
  - `incomplete` → oförändrad plan (betalningen är inte bekräftad).
  - **Rör aldrig** `businesses.plan` om den är `custom` eller om `plan_override_until > now()` (admin styr); raden uppdateras ändå (synlig i admin).
  - Ignorerar en uppdatering med äldre `p_stripe_time` än den lagrade (händelser i fel ordning). Eftersom servern alltid hämtar abonnemanget från API:t före anropet är det normalt det senaste läget.
- `billing_sweep(now)` — `past_due` med `grace_until <= now()` → `businesses.plan = 'free'` (Stripe säger normalt upp abonnemanget samtidigt; svepet är säkerhetsnätet), och företag med `plan_override_until <= now()` utan aktivt abonnemang → `free` (se FRÅGA om piloterna).
- Planändringen loggas i en append-only `private.plan_changes` (`business_id`, `from`, `to`, `source stripe|admin|sweep`, `stripe_event_id`, `created_at`) — underlag för support och admin, ingen persondata.

pgTAP `119_billing_subscriptions.test.sql` (avsnitt 5). Sedan `npm run db:types`.

### Steg 4 — Checkout, byte, Portal (integrations-engineer)
Alla server actions kräver **inloggad ägare** av företaget (inte `can_edit_settings`), `billingAvailable()` och rate limit (10 / timme / företag). Belopp och pris-id bestäms av servern ur `lookup_key`, aldrig från klienten.

- `ensureCustomer(businessId)` — skapar Stripe Customer en gång (`metadata.business_id`, namn = företagets namn, e-post = ägarens, idempotensnyckel `customer:<business_id>`) och sparar `stripe_customer_id` innan något annat anrop.
- `startSubscriptionCheckout(businessId, plan)` — bara när inget abonnemang är `trialing|active|past_due|incomplete`. Återanvänder en öppen session (`open_checkout_session_id`, dubbelklick). `checkout.sessions.create` **utan** `stripeAccount`: `mode: 'subscription'`, `customer`, `line_items: [{ price, quantity: 1 }]`, `subscription_data: { default_tax_rates: [VAT], trial_period_days: trial_used_at ? undefined : TRIAL_DAYS, metadata: { kind: 'subscription', business_id } }`, `metadata: { kind: 'subscription', business_id }`, `client_reference_id = business_id`, `billing_address_collection: 'required'`, `tax_id_collection: { enabled: true }`, `customer_update: { name: 'auto', address: 'auto' }`, `custom_fields: [{ key: 'orgnr', label: 'Organisationsnummer', type: 'text', optional: true }]` (sparas på kunden som fakturafält via webhooken), `success_url` = Plan-fliken `?abonnemang=klart&session={CHECKOUT_SESSION_ID}`, `cancel_url` = `?abonnemang=avbrutet`.
- `previewChange(businessId, plan)` — `invoices.createPreview` med `subscription_details.items` + `proration_behavior`, visar "att betala i dag" och nästa ordinarie belopp inkl. moms i bytdialogen.
- `changePlan(businessId, plan)` — `subscriptions.update` med `items: [{ id, price }]`, uppgradering: `proration_behavior: 'always_invoice'`, `payment_behavior: 'pending_if_incomplete'` (**planen ändras inte i Stripe förrän fakturan är betald**; kräver betalningen 3-D Secure → redirect till fakturans `hosted_invoice_url`). Nedgradering mellan betalda: `proration_behavior: 'create_prorations'`. Under provperiod: byte utan debitering, provperioden fortsätter. `businesses.plan` ändras **bara** via webhook/sync (steg 5), aldrig direkt av action:en.
- `cancelSubscription` / `resumeSubscription` — `cancel_at_period_end: true|false`. "Byt till Gratis" = uppsägning.
- `openPortal(businessId)` — `billingPortal.sessions.create({ customer, configuration, return_url })` → redirect.
- Retur `?abonnemang=klart`: hämtar sessionen och abonnemanget från API:t och kör `syncSubscription` (samma idempotenta funktion som webhooken; sessionens `metadata.business_id` måste vara den inloggade ägarens företag).

### Steg 5 — Webhook, synk och dunning (integrations-engineer)
`webhook.ts`, **plattformsgrenen** (`event.account` saknas), efter signaturkontroll och `claimEvent` i `inbound_events` som i dag:
- `checkout.session.completed` med `metadata.kind === 'subscription'` (hämtad från API:t) → `syncSubscription(session.subscription)`. Övriga `kind` (`sms_credits`) går till WP-76:s hanterare som i dag — **routingen kräver `kind`**, så abonnemangssessioner aldrig tolkas som sms-köp och tvärtom.
- `customer.subscription.created|updated|deleted|paused|resumed`, `customer.subscription.trial_will_end` → `syncSubscription(sub.id)`.
- `invoice.paid` → `syncSubscription` + nollställ `grace_until`.
- `invoice.payment_failed` → `syncSubscription` + mejl `abonnemangBetalningMisslyckades` (outbox, `dedupe_key = 'billing_failed:<invoice_id>'`, länk till Plan-fliken).
- `invoice.payment_action_required` → samma mejl med länk till fakturan.
- `charge.refunded` / `charge.dispute.created` på abonnemangsfakturor: ingen automatik (hanteras manuellt i Stripe), men WP-76:s sms-hanterare får **inte** svara 500 för en charge som saknar sms-metadata (verifieras, rättas i samma PR om så är fallet).

`syncSubscription(subscriptionId)`: hämtar abonnemanget från Stripes API (`expand: ['default_payment_method']`), kräver `metadata.business_id` **och** att `customer` = raden för samma företag (annars synligt fel med kod + id, ingen persondata, 500), mappar priset via `lookup_key` → plan (okänt pris → fel), anropar `private.billing_apply_subscription`. Upptäcks ett andra aktivt abonnemang för samma kund (dubbel Checkout) → det nyare sägs upp direkt med `prorate` + återbetalning och ett fel loggas.

Dunning: Stripe-inställningar (driftsteg för ägaren, dokumenteras i PR): Smart Retries 14 dagar, "cancel subscription" när alla försök misslyckats, Stripes e-post för misslyckad betalning och kvitton på. Appen visar bannern för ägaren medan `status = past_due`; `abonnemangNedgraderat` skickas när planen går till `free` via `unpaid`/`canceled`/svep.

Radering av företag (`src/server/privacy/business.ts`): begärd radering → `cancel_at_period_end`; faktisk radering → `subscriptions.cancel` direkt (ingen återbetalning för påbörjad period, se villkor). Stripe-kunden raderas inte (fakturorna är plattformens bokföringsunderlag i 7 år).

Admin (`/admin`): visar abonnemangsstatus (läser raden). Att sätta `custom` på ett företag med `trialing|active|past_due` abonnemang kräver att admin först säger upp det (blockeras med `billing_custom_plan`), så att företaget inte betalar två gånger.

### Steg 6 — UI (ui-engineer, efter godkänd skiss)
Inställningar → Plan (SE, bara ägaren, `billingAvailable()`):
- Statuskortet överst (plan, status, nästa faktura via `previewChange`-tjänstens `upcoming`-variant med 2 s timeout → annars "Nästa faktura {datum}" utan belopp, kort ···1234, "Hantera betalning" → Portal, "Säg upp"/"Återuppta").
- Plankorten: "Välj" → Gratis-företag: bekräftelse → Checkout; betalande: bytdialog med förhandsvisning → `changePlan`. "Nuvarande" på aktiv plan. Gratis-kortet = "Säg upp" (vid periodens slut).
- `custom`: inga knappar, "Din plan hanteras av oss — kontakta oss" (som i dag).
- Retur: banner/dialog för `?abonnemang=klart` (efter sync: "Välkommen till {plan}" eller "Betalningen behandlas") och `?abonnemang=avbrutet`.
- Grace-bannern i appens sidhuvud (bara ägaren) medan `past_due`.
- SMS-kortet (WP-76) ligger kvar oförändrat. CL och utan nycklar: fliken ser ut som efter WP-76.

### Steg 7 — Docs (planner)
D-059 in i `DECISIONS.md`, BACKLOG ◐ → ☑ (och M4:s abonnemangsdel markeras som genomförd i WP-78), IDEAS (årsbetalning, CL/Flow, samma Stripe-kund för sms-krediter, kuponger), driftsteg för ägaren i PR:en (webhook-händelser, env-variabler, Portal, Smart Retries, fakturainställningar med plattformens org.nr/momsreg.nr/adress).

## 5. Tester (snålt)

**pgTAP `119_billing_subscriptions.test.sql`** (en fil):
- RLS på, inga anon-grants; ägaren i A läser A:s rad, inte B:s; personal (även med `can_edit_settings`) ser 0 rader; `authenticated` kan inte skriva eller köra `private.billing_*`.
- `authenticated` kan fortfarande inte uppdatera `businesses.plan` (regression av B2).
- `billing_apply_subscription`: `trialing`/`active` sätter planen; `incomplete` ändrar inte; `past_due` behåller planen och sätter `grace_until` en gång; `canceled`/`unpaid` → `free`; `custom` och aktiv `plan_override_until` rörs inte; äldre `p_stripe_time` ignoreras.
- `billing_sweep`: `past_due` efter `grace_until` → `free`; före → oförändrad. Nedgraderingen raderar inga tjänster/personal/inställningar (räkna rader före/efter).
- `plan_changes` får en rad per faktisk ändring och ingen vid oförändrad plan.

**Integrationsfall (Vitest, `src/server/billing/subscriptions/subscriptions.db.test.ts`, Stripe-klienten stubbad):**
1. Webhook `customer.subscription.updated` och retursidan samtidigt → en planändring, en `plan_changes`-rad.
2. Händelser i fel ordning (`updated` med `past_due` efter `invoice.paid`) → slutläget följer API-hämtningen (`active`).
3. Uppgradering med `pending_if_incomplete` där fakturan inte betalas → `businesses.plan` oförändrad.
4. Abonnemang med `metadata.business_id` = A men kund = B → fel, ingen ändring.
5. `checkout.session.completed` med `kind = 'sms_credits'` går inte till abonnemang och vice versa (utökar befintlig `webhook.test.ts`).

Inga nya e2e utöver en manuell körning i Stripe testläge (Checkout → provperiod → byte → Portal → uppsägning) som dokumenteras i PR:en; `npm run visual` för Plan-fliken mot godkänd skiss (< 2 %).

## 6. Risker och öppna frågor
- FRÅGA: **Provperiod** — hur lång? MVP_SPEC F17 säger 30 dagar, ditt exempel 14. Förslag: 14 dagar, en gång per företag, **med kort** (Checkout samlar in kortet, ingen dragning förrän provperioden slutar). Alternativ: utan kort (`payment_method_collection: 'if_required'`) — fler startar, fler faller bort.
- FRÅGA: **Grace period** vid misslyckad betalning — 14 dagar (A4)? Under tiden behåller företaget planen.
- FRÅGA: **Byte nedåt** mellan betalda planer — direkt med kredit på nästa faktura (A3, enklast) eller vid periodens slut (kräver Subscription Schedules)?
- FRÅGA: **Befintliga pilotföretag** på betald plan utan abonnemang — ska de få `plan_override_until` (t.ex. gratis till ett datum) och sedan gå till Gratis automatiskt via svepet om de inte startat ett abonnemang? I dag styr `plan_override_until` ingenting; att börja respektera den är en beteendeändring.
- FRÅGA: **Prisändring** — när priset i `pricing.ts` ändras, ska befintliga abonnemang ligga kvar på gamla priset (förslag) eller flyttas vid nästa period med avisering?
- FRÅGA: **Skattesats** — ny `STRIPE_VAT_RATE_ID` (samma 25 %-objekt som sms-krediterna kan återanvändas) eller ska vi återanvända `STRIPE_SMS_VAT_RATE_ID` rakt av? Förslag: ny variabel med reserv till den gamla.
- FRÅGA: **Faktura** — räcker Stripes faktura (plattformens org.nr, momsreg.nr och adress i Stripes kontoinställningar + kundens namn, adress, valfritt org.nr/momsnummer) som svensk fullständig faktura (ML 17 kap.)? Ska organisationsnummer vara obligatoriskt i Checkout?
- **Risk — planen ändras utan betalning:** motverkas av att `businesses.plan` bara skrivs av `billing_apply_subscription` efter API-hämtning, `incomplete` ändrar inget och uppgraderingar använder `pending_if_incomplete`.
- **Risk — dubbla abonnemang** (två flikar, dubbelklick): öppen session återanvänds, Checkout nekas när ett abonnemang finns, syncen säger upp ett andra abonnemang.
- **Risk — webhook-routing:** plattformens endpoint får nu tre sorters händelser (sms-krediter, abonnemang, och Connect via `account`). Varje hanterare måste kräva sin `metadata.kind` hämtad från API:t och returnera "inte min" utan fel.
- **Risk — `custom` och admin-överstyrning** kan krocka med Stripe-synken; regeln "rör aldrig `custom` eller aktiv override" + blockering i admin.
- **Risk — radering av företag:** fakturor måste bevaras (bokföringslagen, 7 år) — de ligger i Stripe, inte hos oss; vår rad kaskaderas.
- **Risk — CL:** inget av detta får synas i CL (`billingAvailable()` = SE). Flow-WP planeras separat.
- **Risk — filkollision** med WP-77 i `webhook.ts` (avsnitt 3).

### D-059 (förslag) · Abonnemang i SE via Stripe Billing på plattformens konto (WP-78)
Företag i SE betalar sin plan (Starta 299, Team 499, Företag 799 kr/mån exkl. moms, `pricing.ts`) via Stripe Billing på **plattformens eget konto** (inte Connect). Produkter och priser skapas per miljö av `scripts/stripe-billing-setup.ts` med `lookup_key` `bb_se_<plan>_monthly_v<n>` (belopp ur `pricing.ts`); koden refererar bara lookup-nycklar. Start via Checkout (`mode: subscription`, Stripe-kund per företag skapad först, `default_tax_rates` = fast 25 % exklusiv, `tax_id_collection`, organisationsnummer som fakturafält), provperiod {N} dagar en gång per företag. Byte i appen: uppgradering direkt med `always_invoice` + `pending_if_incomplete` (planen ändras först efter betald faktura), nedgradering direkt med kredit; Gratis = uppsägning vid periodens slut. Customer Portal för kort, fakturor och uppsägning (planbyte av). `businesses.plan` skrivs **bara** av `private.billing_apply_subscription` efter att servern hämtat abonnemanget från Stripes API (webhook via `inbound_events`, retursida, svep — idempotent): `trialing`/`active` → planen, `past_due` → behålls i 14 dagars grace, `unpaid`/`canceled`/efter grace → `free` utan dataförlust (D-048); `custom` och aktiv `plan_override_until` rörs aldrig. Bara ägaren ser och ändrar betalningen. Tabell `billing_subscriptions` (ägaren läser, servern skriver) + append-only `private.plan_changes`, pgTAP 119. Skräddarsytt faktureras manuellt. SMS-krediter (D-053) oförändrade. CL oförändrat (Flow senare). Ersätter D-048:s mening om att byte av plan inte finns.

## 7. Klart när
- [ ] Ägaren har svarat på FRÅGA-punkterna och godkänt skissen; D-059 inskrivet.
- [ ] `scripts/stripe-billing-setup.ts` skapar produkter, priser (lookup_keys) och Portal-konfiguration idempotent i testläge; inget körts mot live av en agent.
- [ ] Migration + `119_billing_subscriptions.test.sql` gröna; RLS bara ägaren, tenant-isolering testad, `businesses.plan` fortfarande inte skrivbar för `authenticated`.
- [ ] Gratis → betald plan via Checkout (med provperiod en gång) → `businesses.plan` uppdateras via webhook och retursida, idempotent.
- [ ] Uppgradering ändrar planen först efter betald faktura; nedgradering och uppsägning vid periodens slut fungerar; Portal öppnas för kort/fakturor.
- [ ] Misslyckad betalning → mejl + banner → grace 14 dagar → Gratis utan dataförlust; betalning under grace återställer allt.
- [ ] `custom` och aktiv `plan_override_until` rörs inte av synken; admin kan inte sätta `custom` på ett företag med aktivt abonnemang.
- [ ] Webhook-routingen skiljer abonnemang, sms-krediter och Connect; signatur och `inbound_events` som i dag.
- [ ] Moms 25 % syns på Stripes faktura; fakturan innehåller plattformens och kundens uppgifter.
- [ ] Plan-fliken (SE) visar status, nästa faktura, kort och knappar enligt skissen; CL och saknade nycklar ger dagens vy.
- [ ] `npm run typecheck && npm run lint && npm run test` gröna; `npm run test:db` grön; `npm run visual` < 2 % för Plan-fliken.
- [ ] security-reviewer har granskat (`supabase/`, `src/app/api/`, `src/server/payments/`, `src/server/billing/`).
- [ ] Driftsteg dokumenterade (webhook-händelser, env, Portal, Smart Retries, fakturauppgifter); BACKLOG ◐ → ☑; IDEAS kompletterad.

## Ägarens beslut 2026-10-11 (går före antaganden och FRÅGOR ovan)
- **Provperiod 14 dagar utan kort.** Utan kort när provet slutar → Gratis (ingen data raderas, D-048).
- **Nedgradering mellan betalda planer gäller vid periodens slut** (ingen kredit/proration nedåt). Uppgradering direkt med proration, planen ändras först när fakturan är betald.
- **Pilotföretag:** `plan_override_until` börjar styra — vid datumet går de till Gratis automatiskt, med mejl 14 och 3 dagar innan. Admin sätter datumet per företag.
- Standardval (koordinatorn): grace period 14 dagar vid misslyckad betalning; befintliga abonnemang behåller sitt pris vid prisändring (Stripes standard); ny env `STRIPE_VAT_RATE_ID` med `STRIPE_SMS_VAT_RATE_ID` som reserv (samma 25 % exklusive); Checkout samlar in organisationsnummer/momsregistreringsnummer frivilligt (`tax_id_collection`) och företagsnamn/adress för fakturan.
