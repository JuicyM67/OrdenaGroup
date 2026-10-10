# WP-76 · SMS-krediter: "ladda upp kontot" (SE)

Bygger på WP-73 (D-048: sms-kvot per plan och kalendermånad, `reserveSmsQuotaIn` med advisory lock + `message_outbox.quota_reserved_at`) och WP-64 (D-044: Stripe-klient, webhook, `inbound_events`). Beroende: WP-73 och WP-64 mergade till `main` innan steg 2 startar. Rör samma område som M4 (Stripe-abonnemang SE) — M4 får återanvända kund-/skatteupplägget härifrån.

Ägarens beslut (2026-10-10): alla planer, även Gratis, kan köpa sms-krediter för 1 kr/sms ("ladda upp kontot" som hos Bokadirekt).

**Antaganden (planerarens, ej bekräftade av ägaren; se FRÅGA i avsnitt 6):**
- A1. Paket 100 / 250 / 500 / 1000 sms (100 / 250 / 500 / 1 000 kr exkl. moms).
- A2. Priset är exkl. moms (B2B); 25 % moms läggs på i Checkout (100 sms = 125 kr inkl. moms).
- A3. Betalning via Stripe Checkout på plattformens **eget** konto (inte Connect, inget `stripeAccount`), `mode=payment`.
- A4. Krediter förbrukas först när månadens kvot är slut.
- A5. Giltighet 12 månader per köp; förbrukning FIFO (äldsta oförbrukade köp som inte gått ut först).
- A6. Slut på kvot och krediter → som idag: sms-raden avbryts (`sms_quota`), e-postraden är reserven.
- A7. Varning till ägaren (e-post) vid 80 % av månadskvoten och när sms börjar blockeras (kvot + krediter slut).
- A8. Saldo + köphistorik under Inställningar → Plan.
- A9. Bara SE nu. I CL döljs köpet helt (CL senare via Mercado Pago, egen WP).
- A10. 1 kredit = 1 outbox-rad med `channel='sms'` (samma räkneenhet som kvoten i D-048), oavsett antal segment.

---

## 1. Mål
Ett företag i SE kan köpa sms-krediter (Stripe Checkout, plattformens konto) som tas i anspråk automatiskt när månadskvoten (D-048) är slut, så att kundpåminnelser och utskick fortsätter som sms i stället för att falla tillbaka till e-post. Underlag: F7 (meddelanden/påminnelser, "klart när": påminnelsen går ut via vald kanal och via `message_outbox`) och F19 (planer/abonnemang, "klart när": planens gränser gäller på servern och ägaren ser sin användning).

## 2. Utanför scope
- Köp i CL (Mercado Pago) — idé i IDEAS.
- Automatisk påfyllning ("fyll på när saldot < X") — IDEAS.
- Byte av plan / Stripe Billing (M4 och WP-73:s "Byt plan" är oförändrade).
- Segmenträkning (långa sms = flera krediter) — A10, se FRÅGA.
- Tvister/chargebacks (`charge.dispute.*`) utöver att händelsen sparas i `inbound_events`; hanteras manuellt i Stripe Dashboard i v1.
- Överföring av krediter mellan företag, rabatterade volympriser, kampanjkoder.
- Plattformsadminens vy över krediter i `/admin` (manuell kreditering/korrigering) — IDEAS.
- Ändring av WhatsApp-flödet i CL.

## 3. Ägare och mappar
WP-73 måste vara mergad först (samma filer: `entitlements.ts`, `worker.ts`, `plan-section.tsx`). Inga andra pågående WP rör dessa filer enligt BACKLOG; WP-67/68/69 använder migrationer `20261020*`/`20261021*` och pgTAP 120–129, så WP-76 tar `20261012*` och `118`.

| Agent | Får röra |
|---|---|
| db-engineer | `supabase/migrations/20261012010000_sms_credits.sql` (+ ev. `…010100` för funktioner), `supabase/tests/118_sms_credits.test.sql`, `src/types/database.ts` |
| integrations-engineer | `src/config/sms-credits.ts` (ny: paket, pris, giltighet), `src/server/billing/sms-credits/**` (ny: `checkout.ts`, `fulfill.ts`, `refund.ts`, `balance.ts`, `notices.ts` + tester), `src/server/payments/stripe/webhook.ts` (bara routing av händelser utan `account`), `src/server/plans/entitlements.ts` (reservation, återstående, användning), `src/server/messaging/outbox/worker.ts` (frisläpp kredit vid `dead`/`cancelled`, varningar), e-postmallarnas rendering i `src/server/messaging/email/**` |
| copywriter-es-cl (+ sv) | `src/i18n/sv-SE.app.ts`, `src/i18n/sv-SE.ts` (mejlmallar), `src/i18n/es-CL.ts` (nycklar för typparitet; texten används inte i CL i v1) |
| ui-engineer | `src/components/settings/sms-credits-card.tsx`, `src/components/settings/sms-credits-dialog.tsx`, `src/components/settings/plan-section.tsx` (bara inplacering av kortet), `src/app/(app)/app/ajustes/plan/page.tsx`, `src/app/(app)/app/ajustes/plan/actions.ts` (tunn server action → `createSmsCreditCheckout`), `src/app/design-lab/` (skiss av kortet och dialogen) |
| planner | `docs/tasks/BACKLOG.md`, `docs/tasks/IDEAS.md`, `docs/decisions/DECISIONS.md` (D-053 när ägaren godkänt) |

`src/lib/validation/sms-credits.ts` (Zod för paketval) skapas av integrations-engineer.

## 4. Steg (en PR per steg om inget annat anges)

### Steg 0 — Designskiss (ui-engineer, ingen produktionskod)
Skiss i artifact (claude.ai) av: kortet "Sms-krediter" på Plan-fliken (saldo, närmaste utgång, månadens förbrukning kvot/krediter, knapp "Köp sms"), köpdialogen (4 paket som radiokort med pris exkl. moms, moms och totalt; knapp "Till betalning"), historiklistan (datum, paket, belopp inkl. moms, status, kvar, gäller till) och kvittensbanner efter retur (`?sms=ok` / `?sms=avbrutet`). Mobil + desktop, ljust/mörkt, bara tokens. **Ägaren godkänner skissen innan steg 5.** Ingen `.dc.html`-referens finns → efter godkännande läggs skissen i `src/app/design-lab/` och blir referens för `npm run visual` (se D-053).

### Steg 1 — Beslut + texter (planner + copywriter)
- D-053 (förslag, nedan) skrivs in i `DECISIONS.md` när ägaren svarat på FRÅGA-punkterna.
- Copywriter levererar nycklar (sv-SE + es-CL, samma typade struktur):
  - `ajustes.plan.smsCredits.{titulo, saldo, saldoVacio, vencePronto, usoMes, usoCuota, usoCreditos, comprar, historial, historialVacio, estado.{pagado, reembolsado, reembolsoParcial, pendiente, expirado}, columnas.{fecha, paquete, monto, quedan, vence}, retornoOk, retornoCancelado, noDisponible}`
  - `ajustes.plan.smsCredits.dialogo.{titulo, paquete(n), precioNeto, iva, total, irAPagar, nota12Meses, notaOrden}` (notaOrden: "Krediterna används först när månadens sms i planen är slut.")
  - Mejlmallar (owner): `smsCuota80` ("Du har använt 80 % av månadens sms") och `smsAgotados` ("Dina sms är slut — påminnelser går nu som e-post"), med länk till Inställningar → Plan.
  - Felkoder: `sms_credits_unavailable`, `sms_credits_invalid_package`.

### Steg 2 — Datamodell, RLS, funktioner, pgTAP (db-engineer)
Migration `20261012010000_sms_credits.sql`:

**`public.sms_credit_purchases`** (ett köp = en lot)
- `id uuid pk`, `business_id uuid not null references businesses on delete cascade`, `created_by uuid` (ägaren, `auth.users`, `on delete set null`)
- `package_size int not null check (package_size in (100,250,500,1000))` (speglar `src/config/sms-credits.ts`; enhetstest kontrollerar att de är lika)
- `amount_net int not null`, `amount_vat int not null`, `amount_total int not null`, `currency text not null check (currency = 'sek')` — belopp i öre (minsta enhet, D-044), `check (amount_total = amount_net + amount_vat)`
- `status text not null check (status in ('pending','paid','expired_checkout','refunded','partially_refunded'))`
- `credits_total int not null check (> 0)`, `credits_remaining int not null default 0 check (credits_remaining between 0 and credits_total)`, `credits_refunded int not null default 0 check (credits_refunded between 0 and credits_total)`
- `stripe_checkout_session_id text unique`, `stripe_payment_intent_id text unique`, `stripe_invoice_id text`
- `paid_at timestamptz`, `expires_at timestamptz` (= `paid_at + interval '12 months'`), `created_at timestamptz default now()`
- `check ((status = 'pending') = (paid_at is null))` för paid/refunded, index `(business_id, expires_at) where credits_remaining > 0`.

**`public.sms_credit_ledger`** (append-only historik och idempotens för förbrukning)
- `id bigint generated always as identity pk`, `business_id uuid not null`, `purchase_id uuid not null references sms_credit_purchases on delete cascade`, `outbox_id uuid null references message_outbox on delete set null`
- `kind text check (kind in ('grant','consume','release','refund','expire'))`, `delta int not null` (+ för grant/release, − för consume/refund/expire), `created_at timestamptz default now()`
- Unik: `(outbox_id) where kind = 'consume'` och `(outbox_id) where kind = 'release'`; `(purchase_id) where kind = 'grant'`.
- Invariant (pgTAP): `credits_remaining = sum(delta)` per köp.

**RLS:** båda tabellerna `enable row level security`, `revoke all from anon, authenticated`, `grant select to authenticated`; policy `select` bara för företagets **ägare** (samma ägarhjälpare som `stripe_accounts` i D-044). Inga insert/update/delete-policys eller grants för `authenticated`. Service role skriver.

**Funktioner** (`private`, `security definer`, `search_path = ''`, `execute` bara för `service_role`):
- `private.sms_credit_grant(p_purchase uuid, p_payment_intent text, p_paid_at timestamptz) returns boolean` — `update … set status='paid', credits_remaining=credits_total, paid_at, expires_at=p_paid_at + '12 months' where id=p_purchase and status='pending'` + ledger `grant`. Andra anropet → `false`, ingen ändring (idempotent).
- `private.sms_credit_consume(p_business uuid, p_outbox uuid) returns uuid` — förutsätter att anroparen håller `pg_advisory_xact_lock(hashtext('sms:'||business_id))`. Finns redan `consume` för `p_outbox` → returnera samma `purchase_id` (retry av samma rad tar inte en ny kredit). Annars: `select … where business_id=p_business and status in ('paid','partially_refunded') and credits_remaining > 0 and expires_at > now() order by expires_at, paid_at, id limit 1 for update` → minska med 1, ledger `consume`. Ingen lot → `null`.
- `private.sms_credit_release(p_outbox uuid) returns boolean` — finns `consume` men ingen `release` för raden: ger tillbaka krediten till samma köp om det inte gått ut eller återbetalats helt (annars bara ledger-rad med `delta 0`, krediten är förlorad), ledger `release`.
- `private.sms_credit_refund(p_purchase uuid, p_credits_refunded_total int) returns int` — kumulativ: `to_void = least(credits_remaining, p_credits_refunded_total - credits_refunded)` om > 0; uppdaterar `credits_refunded`, `credits_remaining`, status (`refunded` om `p_credits_refunded_total >= credits_total`, annars `partially_refunded`), ledger `refund`. Samma totala värde två gånger → 0 (idempotent). Saldot blir aldrig negativt; redan förbrukade sms dras inte tillbaka.
- `private.sms_credit_balance(p_business uuid) returns table(balance int, next_expiry timestamptz)` — summan av `credits_remaining` för icke utgångna köp.
- Utgång sker lazy (frågorna filtrerar `expires_at > now()`). `run_retention` (befintlig cron) skriver ledger `expire` och nollar `credits_remaining` för utgångna köp, en gång per köp (unik `(purchase_id) where kind='expire'`), så historiken visar "utgick".

**Dataskydd:** tabellerna innehåller ingen persondata om kunder (bara företag, belopp, Stripe-id). `created_by` blir `null` om användaren raderas. Raderas företaget kaskaderas raderna; Stripe-fakturan är bokföringsunderlaget (se FRÅGA om arkiv). Företagsexporten (befintlig) får köphistoriken.

Tester: `supabase/tests/118_sms_credits.test.sql` (se avsnitt 5). Sedan `npm run db:types` → `src/types/database.ts`.

### Steg 3 — Förbrukning i kvoten (integrations-engineer)
`src/server/plans/entitlements.ts`:
- `reserveSmsQuotaIn(q, businessId, outboxId)` returnerar i stället `"quota" | "credit" | null` (null = blockerad). Ordning, **allt under samma `pg_advisory_xact_lock(hashtext('sms:'||businessId))`**:
  1. `max === null` (obegränsat) → `"quota"`.
  2. Låset tas även när `max <= 0` (Gratis), eftersom krediter nu kan finnas.
  3. Räkna som idag (skickade + reserverade i `sending`, månad i `APP_TZ`). Raden räknas oavsett om den finansierats av kvot eller kredit, så när kvoten väl är slut förblir den slut resten av månaden. `n < max` → sätt `quota_reserved_at`, returnera `"quota"`.
  4. Annars `select private.sms_credit_consume($1,$2)`; lot → sätt `quota_reserved_at`, returnera `"credit"`; ingen lot → `null`.
  5. Varningar köas i samma transaktion (steg 4).
- `smsRemainingIn` → `quotaLeft + creditBalance` (Gratis: bara krediter). `checkCampaignPlan` nekar sms-utskick om mottagarna inte ryms i summan. (Utskick kräver fortfarande Team enligt D-048 — krediter låser inte upp funktioner.)
- `loadPlanUsage` får `smsCredits: { balance, nextExpiry, usedThisMonth }`.

`src/server/messaging/outbox/worker.ts`:
- `smsBlockedByPlan` använder det nya returvärdet; `null` → `finalizeQuotaCancelled` som idag.
- När en sms-rad som fått `"credit"` slutar som `dead` eller `cancelled` (inte `sent`) → `private.sms_credit_release(outbox_id)` i samma transaktion som slutstatusen. `queued` (retry) behåller krediten; nästa försök återanvänder samma `consume` (idempotent per rad).
- Uppdatera befintlig mock i `worker.test.ts` till nya signaturen.

### Steg 4 — Varningar till ägaren (integrations-engineer + copywriter)
`src/server/billing/sms-credits/notices.ts`, anropas från `reserveSmsQuotaIn` i samma transaktion (insert i `message_outbox`, `channel='email'`, `recipient_kind='owner'`, kategori transaktionell, `on conflict (dedupe_key) do nothing`):
- `smsCuota80`: när en `"quota"`-reservation gör att `n + 1 >= ceil(0,8 · max)` och `max > 0`. `dedupe_key = 'sms_quota_80:<business>:<YYYY-MM i APP_TZ>'`.
- `smsAgotados`: första gången en sms-rad blockeras (`null`) under månaden, **bara om** `max > 0` eller företaget någon gång köpt krediter (annars får varje Gratis-företag ett mejl i månaden). `dedupe_key = 'sms_empty:<business>:<YYYY-MM>'`.
- Mejlen innehåller ingen kundinformation, bara siffror och länk.

### Steg 5 — Köp via Stripe Checkout (integrations-engineer)
`src/config/sms-credits.ts`: `SMS_CREDIT_PACKAGES = [100, 250, 500, 1000]`, `SMS_CREDIT_UNIT_NET_ORE = 100`, `SMS_CREDIT_VAT_BPS = 2500`, `SMS_CREDIT_VALIDITY_MONTHS = 12`, `smsCreditsAvailable()` = `MARKET === 'SE' && STRIPE_SECRET_KEY && STRIPE_SMS_VAT_RATE_ID` (D-035: dolt när nyckel saknas).

`src/server/billing/sms-credits/checkout.ts` → `createSmsCreditCheckout(businessId, userId, packageSize)`:
1. Kontroller på servern: inloggad användare är företagets **ägare**, `smsCreditsAvailable()`, paketet finns i listan (Zod, `src/lib/validation/sms-credits.ts`), rate limit (befintlig `rate_limits`, t.ex. 5 sessioner/timme/företag).
2. Beloppet räknas på servern (`package × 100` öre netto, moms 25 %), aldrig från klienten.
3. Insert `sms_credit_purchases` (`pending`) i en transaktion, sedan `getStripe().checkout.sessions.create` **utan** `stripeAccount`: `mode='payment'`, en rad `price_data { currency:'sek', unit_amount: 100, product_data.name: "<n> sms" }`, `quantity: n`, `tax_rates: [STRIPE_SMS_VAT_RATE_ID]` (exklusiv 25 %), `invoice_creation.enabled = true` (faktura med moms till företaget), `tax_id_collection.enabled = true`, `customer_email` = ägarens e-post, `client_reference_id = purchase.id`, `metadata { kind:'sms_credits', business_id, purchase_id }`, `payment_intent_data.metadata` samma, `expires_at` = 30 min, `success_url` = Plan-fliken `?sms=ok&session={CHECKOUT_SESSION_ID}`, `cancel_url` = `?sms=avbrutet`. Idempotency-key = `purchase.id`.
4. Spara `stripe_checkout_session_id`; returnera URL → redirect (ingen Stripe.js, D-039).

`src/server/billing/sms-credits/fulfill.ts` → `fulfillSmsCreditCheckout(sessionId)`:
- Hämtar sessionen från Stripes API (payloaden litas aldrig på, D-044 punkt 7), kräver `metadata.kind === 'sms_credits'`, `payment_status === 'paid'`, att `amount_total`/`currency` matchar raden och att `metadata.purchase_id` + `business_id` matchar raden i DB. Sedan `private.sms_credit_grant(...)`. Idempotent.
- Anropas från webhooken **och** från Plan-sidan vid retur med `?session=` (säkerhetsnät om webhooken dröjer; samma idempotenta funktion, sessionens `metadata.business_id` måste vara den inloggade ägarens företag).
- `checkout.session.expired` → `status='expired_checkout'` om fortfarande `pending`.

### Steg 6 — Webhook och återbetalning (integrations-engineer)
`src/server/payments/stripe/webhook.ts` — idag hanteras checkout-händelser bara när `event.account` finns (Connect). Tillägg i `dispatch` för händelser **utan** `account` (plattformens endpoint):
- `checkout.session.completed` / `checkout.session.async_payment_succeeded` → `fulfillSmsCreditCheckout(obj.id)` (no-op om sessionen inte är `sms_credits`).
- `checkout.session.expired` → `expireSmsCreditCheckout(obj.id)`.
- `charge.refunded` → `refundSmsCredits(chargeId)` (`refund.ts`): hämtar charge från API, hittar köpet via `payment_intent`, räknar `credits_refunded_total = floor(charge.amount_refunded × credits_total / amount_total)` (kumulativt, så delåterbetalningar och omleveranser blir rätt) och anropar `private.sms_credit_refund`. Ingen åtgärd om köpet saknas.
- Befintliga Connect-grenar oförändrade. Idempotens som idag via `inbound_events` (`claimEvent`/`markProcessed`); fel → 500 så Stripe skickar igen.
- Driftsteg för ägaren (dokumenteras i PR, inte av agenten): plattformens webhook-endpoint i Stripe Dashboard måste prenumerera på `checkout.session.completed`, `checkout.session.async_payment_succeeded`, `checkout.session.expired`, `charge.refunded`; en skatterad 25 % exklusiv skapas och dess id sätts i `STRIPE_SMS_VAT_RATE_ID` (test- och live-läge).

### Steg 7 — UI (ui-engineer, efter godkänd skiss)
- `sms-credits-card.tsx` (serverkomponent där det går): saldo ("312 sms"), "Närmast utgår: 120 sms den 3 okt 2027" (`src/lib/format/dates.ts`, `APP_TZ`), månadens förbrukning (kvot X/Y + krediter Z), knapp "Köp sms", historik (senaste 10, "Visa alla" = `?historik=alla`, serverpaginering).
- `sms-credits-dialog.tsx` (Radix Dialog, omstylad): 4 paket som radiokort (ingen förvald? se FRÅGA — förslag: inget förvalt, knappen inaktiv tills val), pris exkl. moms, moms och totalt via formatfunktionen, knapp "Till betalning" → server action `buySmsCreditsAction(packageSize)` → redirect till Checkout.
- Retur: banner via `?sms=ok` (anropar `fulfillSmsCreditCheckout(session)` först, visar "Krediterna är tillagda" eller "Betalningen behandlas" om ännu inte `paid`) och `?sms=avbrutet`.
- Kortet renderas bara när `smsCreditsAvailable()` (SE + nycklar). I CL och utan nycklar syns inget nytt; Plan-fliken ser ut som efter WP-73.
- Gratis: kortet syns (alla planer kan köpa), texten förklarar att planen inte har sms och att krediter används direkt.
- Design-lab-sida med tillstånden: tomt saldo, saldo med utgång snart, historik med återbetalt/delvis, dialog, retur ok/behandlas.

### Steg 8 — Docs (planner)
D-053 in i `DECISIONS.md`, BACKLOG-status, IDEAS (CL/Mercado Pago, automatisk påfyllning, admin-korrigering, segmenträkning), sms-FAQ på marknadssidan (SE) nämner krediterna (copywriter-text, ui-engineer placerar — kan vänta till separat PR).

## 5. Tester
Hålls snävt (en DB-testfil, enhetstester på de nya modulerna, en e2e-väg).

**pgTAP `118_sms_credits.test.sql`**
- Tabeller finns, RLS på, inga `anon`-grants, `authenticated` har bara `select`.
- Tenant-isolering: ägare A ser A:s köp/ledger, inte B:s; personal (icke-ägare) i A ser 0 rader; anon ser 0.
- `authenticated` kan inte insert/update/delete (42501) och kan inte köra `private.sms_credit_*`.
- `grant` två gånger → en `grant`-rad, `credits_remaining = credits_total`.
- FIFO: två köp (äldre utgår tidigare) → `consume` tar från det äldre tills det är 0, sedan från nästa.
- Utgånget köp (`expires_at = now() - 1s`) används inte; köp som går ut exakt `now()` används inte (`>`).
- `consume` två gånger för samma `outbox_id` → samma köp, saldot minskar med 1.
- `release` efter `consume` → tillbaka; `release` två gånger → en gång; `release` på utgånget köp → ingen ökning.
- `refund` kumulativt: köp 100, förbruka 30, refund total 50 → `remaining 50`, `partially_refunded`; samma anrop igen → 0; refund total 100 → `remaining 0`, `refunded`, aldrig negativt.
- Invariant `credits_remaining = sum(delta)` efter alla fall.
- Checks: ogiltigt paket, `amount_total <> net + vat`, `currency <> 'sek'` nekas.

**Enhet (Vitest)**
- `reserveSmsQuotaIn`: Gratis utan krediter → `null`; Gratis med krediter → `"credit"`; Starta 49/50 → `"quota"`, 50/50 med krediter → `"credit"`; 50/50 utan → `null`; `custom` obegränsat → `"quota"`.
- Månadsgräns i `APP_TZ` (Europe/Stockholm): rad skickad 2026-10-31 23:30 lokal tid räknas i oktober; 2026-11-01 00:10 i november; sommartidsskiftet 2026-10-25 påverkar inte räkningen (befintlig hjälpare). Utgång: köp 2026-03-29 (DST-dagen) → `expires_at` 2027-03-29 samma UTC-ögonblick + 12 mån, visas rätt datum.
- Varningar: 80 % köas en gång per månad (40:e av 50); `smsAgotados` köas inte för Gratis som aldrig köpt; köas en gång per månad annars.
- `createSmsCreditCheckout`: icke-ägare nekas, CL nekas, okänt paket nekas, belopp 250 sms = 25 000 öre netto + 6 250 moms, inget `stripeAccount` skickas.
- `fulfillSmsCreditCheckout`: `payment_status !== 'paid'` → ingen kredit; fel `amount_total` → ingen kredit (loggas utan persondata); fel `business_id` i retur → nekas; två anrop → en kredit.
- `webhook.test.ts`: `checkout.session.completed` utan `account` routas till sms-krediter, med `account` till Connect som idag; dubblett-event → `duplicate`; `charge.refunded` delvis → rätt antal krediter.

**Samtidighet**
- DB-test (Vitest mot lokal DB, befintligt `*.db.test.ts`-mönster): 10 parallella reservationer för ett företag med kvot slut och 5 krediter → exakt 5 `"credit"`, 5 `null`, saldo 0.
- Webhook + retur-sidan samtidigt för samma session → en `grant`.

**E2E (Playwright, SE, Stripe testläge eller stubbad Checkout som WP-64)**
- Ägaren öppnar Plan → Köp sms → väljer 100 → Checkout (test) → retur → saldot visar 100, historiken en rad "Betald".
- Personal utan ägarroll ser inte Plan-fliken (befintligt) och server action nekas.
- CL-installation: kortet syns inte.

**Visuell**
- `npm run visual` på design-lab-sidan för kortet och dialogen (< 2 %) mot godkänd skiss. Plan-flikens befintliga skärm får en accepterad avvikelse (nytt kort), se D-053.

## 6. Risker och öppna frågor
- **Risk: kvot räknas på rader, inte segment.** Långa sms (> 160 tecken / Unicode 70) kostar oss flera segment hos leverantören men en kredit. Med 1 kr/sms kan marginalen bli negativ för långa mallar.
  FRÅGA: Ska 1 kredit = 1 sms-rad (som kvoten i D-048, A10), eller 1 kredit per 160-teckens segment (som Bokadirekt)? Segmenträkning kräver att även kvoten byter enhet.
- **Risk: moms och faktura.** Fast skatterad (25 % exkl.) förutsätter att alla köpare är svenska företag. Utländska kunder (omvänd skattskyldighet) hanteras inte.
  FRÅGA: Är Stripe Tax aktiverat på plattformskontot (då `automatic_tax` i stället för en fast `tax_rate`)? Och räcker Stripes faktura (`invoice_creation`) med företagsnamn + valfritt momsnummer som underlag, eller ska vi skicka organisationsnummer från `businesses`?
- FRÅGA: Bekräftar du paketen 100/250/500/1000 och att priset visas exkl. moms (125 kr inkl. moms för 100 sms)? Volymrabatt?
- FRÅGA: Giltighet 12 månader — och vad händer med krediterna när företaget raderar kontot (förfaller utan återbetalning, föreslås; skrivs i villkoren)?
- FRÅGA: Ska varningarna (80 % och "slut") gå som e-post till ägaren (förslag) eller också som klocknotis i appen?
- FRÅGA: Ska krediter också kunna användas för sms-utskick (kräver Team, D-048) — förslag ja, samma saldo.
- **Risk: återbetalning efter förbrukning.** Återbetalas ett köp där krediter redan använts dras bara resterande krediter; förbrukade sms bär plattformen. Ägaren styr återbetalningar själv i Stripe Dashboard.
- **Risk: tvister** (`charge.dispute.created`) dras inte av automatiskt i v1 (IDEAS).
- **Risk: villkor/ångerrätt.** B2B-köp, ingen ångerrätt enligt distansavtalslagen, men villkoren bör nämna krediter, giltighet och återbetalning — copywriter + security-reviewer, ev. `docs/legal/JURIST_FRAGOR.md`.
- **Risk: filkollision** med M4 (Stripe-abonnemang) om den startar samtidigt (`webhook.ts`, `src/server/billing/`). M4 ska vänta eller samordnas.
- **Risk: Connect- vs plattformshändelser.** Plattformens endpoint får checkout-händelser för allt plattformen skapar; routingen måste kräva `metadata.kind === 'sms_credits'` hämtat från API:t så att framtida abonnemangs-sessioner (M4) inte tolkas som sms-köp.

### D-053 (förslag) · SMS-krediter i SE: förbetalda, 1 kr/sms exkl. moms, används efter månadskvoten (WP-76)
Alla planer i SE kan köpa sms-krediter i paket (100/250/500/1000) via Stripe Checkout på plattformens eget konto (`mode=payment`, moms 25 % i Checkout, faktura från Stripe). Krediterna gäller 12 månader per köp och förbrukas FIFO först när planens månadskvot (D-048) är slut, under samma advisory lock som kvoten; 1 kredit = 1 sms-rad i `message_outbox`. En rad som slutar `dead`/`cancelled` ger tillbaka sin kredit. Slut på kvot och krediter → som D-048 (sms avbryts, e-post är reserven). Krediteras bara efter verifierad betalning (webhook + API-hämtning, idempotent via `inbound_events` och `sms_credit_grant`). Återbetalning i Stripe drar bort motsvarande oförbrukade krediter, aldrig under 0. Tabeller `sms_credit_purchases` + `sms_credit_ledger`: ägaren läser, bara servern skriver (pgTAP 118). Dolt i CL och utan Stripe-nycklar (D-035). Plan-flikens visuella avvikelse (nytt kort) accepteras; referens = godkänd design-lab-skiss.

## 7. Klart när
- [ ] Ägaren har godkänt designskissen (artifact) och svarat på FRÅGA-punkterna; D-053 inskrivet.
- [ ] Migration + `118_sms_credits.test.sql` gröna (`npm run test:db`); RLS: ägaren läser, ingen skrivrätt för `authenticated`, tenant-isolering testad.
- [ ] Köp i SE: Checkout på plattformens konto, belopp från servern, kreditering bara via verifierad betalning, idempotent (webhook + retur).
- [ ] `reserveSmsQuotaIn`: kvot först, sedan äldsta giltiga köp, under samma lås; Gratis med krediter skickar sms; utan kvot och krediter blir det e-post som idag.
- [ ] Krediten återlämnas när en sms-rad slutar `dead`/`cancelled`; retry tar ingen ny kredit.
- [ ] `charge.refunded` (hel och delvis) drar rätt antal oförbrukade krediter, aldrig negativt saldo.
- [ ] Varningar 80 % och "slut" köas via `message_outbox`, högst en per typ och månad.
- [ ] Plan-fliken (SE) visar saldo, närmaste utgång, månadens förbrukning, köpdialog och historik; i CL syns inget nytt.
- [ ] sv-SE- och es-CL-nycklar finns (typparitet); inga hårdkodade strängar, bara tokens.
- [ ] `npm run typecheck && npm run lint && npm run test` gröna; `npm run visual` < 2 % för kortet/dialogen; e2e-köpvägen grön i testläge.
- [ ] security-reviewer har granskat (`supabase/`, `src/app/api/`, `src/server/payments/`, `src/server/billing/`).
- [ ] Driftsteg dokumenterade för ägaren (webhook-händelser, `STRIPE_SMS_VAT_RATE_ID`); inget körts mot produktion.
- [ ] BACKLOG uppdaterad (◐ → ☑), IDEAS kompletterad.

## Ägarens beslut 2026-10-10

1. **1 kredit = 1 segment.** GSM-7: 160 tecken (153 per del vid flera delar); å/ä/ö ingår i GSM-7. Innehåller texten tecken utanför GSM-7 (t.ex. emoji) gäller UCS-2: 70 tecken (67 per del). Segmenten räknas på servern vid reservation; kvoten i D-048 räknas också i segment från och med WP-76.
2. **Moms:** fast 25 % i Stripe Checkout (tax rate), Stripes kvitto är underlag; organisationsnummer visas på kvittot om det finns.
3. **Paket (exkl. moms):** 100 SMS = 100 kr · 250 SMS = 250 kr · 500 SMS = 450 kr (50 kr rabatt) · 1 000 SMS = 900 kr (100 kr rabatt). Paketen definieras i kod (`src/config/sms-credits.ts`), servern bestämmer priset.
4. **Radering av företag:** krediter förfaller utan återbetalning; skrivs i villkoren.
5. **Varningar** (80 % och slut): e-post + notis i appen (klockan).
6. **Krediterna gäller även SMS-utskick** (som kräver Team).

## Designbeslut 2026-10-10 (artifact godkänd: https://claude.ai/artifact/C8WULT8omx8MhLHcMFZxw3)

- **Bekräftelsedialog** före Stripe Checkout: paket, belopp inkl. moms, momsdel, giltighetsdatum, "Gå till betalning" / "Avbryt".
- **Kvittodialog** vid retur från Checkout (`?sms=klart`): "Klart! N SMS har lagts till", nytt saldo, CTA "Skicka SMS-marknadsföring" (→ Kampanjer; saknar planen kampanjer → uppgraderingsdialog) + "Inte nu".
- **Marknadsföringskort** på Plan-fliken: tre steg (välj mottagare, skriv erbjudande med blixttider, skicka/schemalägg), ett exempel-SMS och CTA "Skicka SMS-marknadsföring", plus raden "Du har N krediter, räcker till N kunder".
