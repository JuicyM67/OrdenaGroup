# WP-77 · Presentkort (SE)

Bygger på WP-69 (D-057: värdebevis via Stripe Connect), WP-64 (D-044: Connect, webhook, `inbound_events`), WP-67 (D-054: kundkonton) och WP-76 (D-053: kumulativ återbetalning, ledger-mönster). Beroende: WP-69 mergad till `main` innan steg 2 startar (migrationerna `20261016010000`/`20261016010100` och `src/server/vouchers/` måste finnas på `main`).

**Ägarens beslut (2026-10-11):**
- Värdebaserat presentkort som gäller **alla tjänster** hos salongen (inte knutet till ett erbjudande eller en tjänst).
- Säljs **bara på salongens bokningssida**, på en egen rutt (SE `/<slug>/presentkort`), så att `/[slug]`:s JS-budget (D-039, 190 kB; SE i dag 184 kB, CL 172 kB) inte påverkas.
- Giltighet **24 månader**, fast.
- Avgift **1 %** (`application_fee_amount`, som D-044/D-047/D-057).
- Inloggad köpare ser sina presentkort under kontot.
- Moms: **flerfunktionsvoucher** — ingen moms vid försäljning, moms vid inlösen.

**Antaganden (planerarens, ej bekräftade; se FRÅGA i avsnitt 6):**
- A1. Köp kräver **inte** kundkonto: gäst anger namn + e-post. Inloggad köpare får presentkortet kopplat till kontot (`user_id`).
- A2. Förvalda belopp 300 / 500 / 1 000 kr + valfritt belopp **100–5 000 kr** i hela kronor.
- A3. Planspärr: samma som onlinebetalning (`online_payment`, Starta och uppåt, D-048), och företagets Stripe-konto måste ha `charges_enabled`. Ägaren slår på försäljningen i Inställningar → Betalningar (av som standard).
- A4. Schemalagd leverans kl. 08:00 lokal tid (företagets tidszon) på valt datum, högst 90 dagar fram. Utan datum: direkt efter betalning.
- A5. Giltigheten räknas från **köpdagen** (inte leveransdagen): t.o.m. samma kalenderdag 24 månader fram, 23:59:59 i företagets tidszon (samma regel som D-057).
- A6. "PDF/utskrift" = en utskriftsvänlig sida (print-CSS, "Skriv ut / spara som PDF" via webbläsaren), inget PDF-bibliotek och ingen bilaga i mejlet.
- A7. Resten av en bokning som inte täcks av saldot betalas i salongen; har företaget onlinebetalning "Obligatorisk" tas resten i befintlig Checkout (D-044).

---

## 1. Mål
En kund i SE kan köpa ett värdebaserat presentkort på `/<slug>/presentkort` (Stripe Connect direct charge, 1 % avgift), mottagaren får det som mejl med hälsning på valt datum, och saldot kan lösas in delvis, både vid onlinebokning på `/[slug]` och i kassan med kod. Moms redovisas som för en flerfunktionsvoucher. Underlag: F5 (publik bokningssida, "klart när": en bokning tar ≤ 3 skärmar och fungerar på en billig Android över 4G — inlösen får inte lägga till en skärm och inte spräcka JS-budgeten), F10 (enkel kassa, "klart när": summorna stämmer med bokningarna — sålda presentkort räknas inte som intäkt, inlösen räknas en gång) och F12 (dataskydd: export/radering, inga förkryssade samtycken). Det finns inget eget F# för presentkort; WP-77 är ett tillägg ovanpå D-057 i samma anda som WP-69.

## 2. Utanför scope
- Chile (dolt helt, som D-055/D-057; Mercado Pago senare).
- Presentkort i marknadsplatsen (`/upptack`, `/erbjudande`) och presentkort som gäller flera salonger.
- Fysiska presentkort / förtryckta koder som säljs i salongen (kassaförsäljning utan Stripe).
- QR-kod, Apple/Google Wallet, PDF-bilaga i mejlet.
- Ändra mottagare eller leveransdatum efter köpet, "skicka igen" till ny adress (bara samma adress, se steg 6).
- Påminnelsemejl före utgång.
- Företagets "Återbetala" i appen (görs i Stripe-dashboarden och speglas, som D-057).
- Tema/designval för kortet (en design per varumärke, efter referensen).
- Momsberäkning/momsrapport i kassan (kassan har ingen moms i dag; vi märker bara vad som är momspliktigt).
- Förlängning av giltighet, överlåtelse mellan konton, kampanjrabatt på presentkort ("köp för 500, få 600").
- Gemensam ledger med WP-69:s värdebevis (de förblir hel inlösen per tjänst).

Idéer ovan skrivs i `docs/tasks/IDEAS.md` av planeraren när planen godkänts.

## 3. Ägare och mappar
Inga andra pågående WP rör `src/server/gift-cards/`. WP-69 (◐) äger `src/server/vouchers/` och `src/server/payments/stripe/` — WP-77 startar först när WP-69 är mergad, och rör då bara de filer som anges nedan. WP-78 (abonnemang) rör också `webhook.ts`: **samordna** — den av WP-77/WP-78 som mergar sist rebasar; ingen av dem ändrar den andras gren i `dispatch`.

Migration `20261017010000_gift_cards.sql` (+ ev. `…010100_gift_cards_hardening.sql` efter säkerhetsgranskning), pgTAP **135**.

| Agent | Får röra |
|---|---|
| db-engineer | `supabase/migrations/20261017010000_gift_cards.sql`, `supabase/tests/135_gift_cards.test.sql`, `src/types/database.ts` (regenereras) |
| integrations-engineer | `src/server/gift-cards/**` (ny: `rules.ts`, `checkout.ts`, `fulfill.ts`, `redeem.ts`, `withdraw.ts`, `sweep.ts`, `delivery.ts`, `account.ts`, `caja.ts` + `gift-cards.db.test.ts`), `src/server/vouchers/rules.ts` (bara: kodgeneratorn tar längd som parameter, oförändrat beteende för värdebevis), `src/server/payments/stripe/webhook.ts` (bara presentkortsgrenen i Connect-händelserna), `src/server/payments/stripe/checkout.ts` (bara: beloppet för resten minus presentkortsreservationen, A7), `src/server/messaging/**` (nya mallar + mottagartyp `gift_recipient`), `src/app/api/cron/outbox/route.ts` (anrop till svepet), `src/config/gift-cards.ts` (ny), `src/lib/validation/gift-cards.ts` (ny) |
| scheduling-engineer | `src/server/bookings/create.ts`, `src/server/bookings/move.ts` (reservation av saldo i bokningens transaktion, flytt förbi utgång → `too_far`) |
| copywriter-es-cl (+ sv) | `src/i18n/sv-SE*.ts`, `src/i18n/es-CL*.ts` (nycklar för typparitet, används inte i CL), `docs/content/` (villkorstext presentkort) |
| ui-engineer | `src/app/[slug]/tarjeta-regalo/**` (SE `/<slug>/presentkort` via `routes.ts`), `src/app/[slug]/page.tsx` + bokningsflödets komponent (bara länken "Köp presentkort" och kodfältet), `src/app/(consumer)/cuenta/regalos/**` (SE `/konto/presentkort`), `src/app/(app)/app/caja/regalos/**` (SE `/app/kassa/presentkort`), `src/app/(app)/app/ajustes/pagos/**` (bara av/på-reglaget), `src/components/gift-cards/**` (ny), `src/config/routes.ts` (nya rutter), `src/app/design-lab/` |
| planner | `docs/tasks/BACKLOG.md`, `docs/tasks/IDEAS.md`, `docs/decisions/DECISIONS.md` (D-058 när ägaren godkänt), `docs/legal/JURIST_FRAGOR.md` (nya frågor) |

## 4. Steg (en PR per steg om inget annat anges)

### Steg 0 — Designreferens (ui-engineer, ingen produktionskod)
Ägarens godkända artifact läggs som `docs/design/reference/presentkort/*.dc.html` (finns inte i repot än). Förväntade vyer: köpsidan (belopp, mottagare, hälsning, leveransdatum, sammanfattning), kvittosidan efter Checkout, mejlet till mottagaren, utskriftssidan, "Mina presentkort", kodfältet i bokningsflödet, Kassa → Presentkort (lista + "Lös in kod"). Saknas en vy i artifacten → skiss i design-lab som ägaren godkänner innan steg 7.

### Steg 1 — Beslut, texter, juristfrågor (planner + copywriter)
- D-058 (förslag, nedan) in i `DECISIONS.md` när ägaren svarat på FRÅGA-punkterna.
- Copywriter (sv-SE + es-CL-paritet): köpsidan, mejlen `presentkortKvitto` (till köparen), `presentkortLeverans` (till mottagaren, med hälsning, kod, saldo, giltighet, "Boka"-länk), `presentkortAngrat`, utskriftssidan, kontot, kassan, felkoder (`gift_card_invalid`, `gift_card_expired`, `gift_card_empty`, `gift_card_frozen`, `gift_card_rate_limited`, `gift_card_amount_out_of_range`), villkorstext (giltighet 24 mån, ångerrätt 14 dagar om oanvänt, ej inlösen mot kontanter, saldo kvar efter delinlösen, vad som gäller om salongen stänger), kvittorad "Presentkort — flerfunktionsvoucher, moms redovisas vid inlösen".
- `JURIST_FRAGOR.md`: nya frågor 20–24 (se avsnitt 6).

### Steg 2 — Datamodell, RLS, funktioner, pgTAP (db-engineer)
`20261017010000_gift_cards.sql` — **nya tabeller** (WP-69:s `voucher_orders`/`vouchers` kan inte återanvändas: de kräver `offer_id`/`service_id`, `user_id not null`, och `booking_id unique` = hel inlösen).

**`public.businesses`**: `gift_cards_enabled boolean not null default false` (ägaren ändrar via befintlig kolumn-grant för inställningar).

**`public.gift_card_orders`** (samma form som `voucher_orders`): `id`, `business_id` (cascade), `user_id uuid null references auth.users` (**nullable**: gäst; ingen kaskad, som D-054), `buyer_name`, `buyer_email` (gäst eller kontots e-post vid köpet), `amount_minor` (`check between 10000 and 500000`), `fee_minor` (`<= amount_minor`), `currency check = 'SEK'`, `stripe_account_id`, `session_id unique`, `payment_intent_id unique`, `status open|paid|expired|failed`, `expires_at`, `paid_at`, `attempts`, `next_attempt_at`, `recipient_name`, `recipient_email null`, `greeting text null check (char_length <= 300)`, `deliver_on date null`, `withdraw_token_hash bytea null` (gästens "Ångra köp"-länk, D-029-mönstret: bara SHA-256), timestamps. Index som `voucher_orders`.

**`public.gift_cards`**: `id`, `business_id`, `order_id unique` (FK sammansatt), `user_id null`, `code text unique check (code ~ '^[A-Z]{2}-[0-9A-HJKMNP-TV-Z]{4}-[0-9A-HJKMNP-TV-Z]{4}-[0-9A-HJKMNP-TV-Z]{4}$')` — **12 tecken Crockford base32 (60 bitar)**, längre än värdebevisens 8 eftersom koden ensam (utan konto) ger åtkomst till pengar; `initial_minor`, `balance_minor int not null check (balance_minor >= 0 and balance_minor <= initial_minor)`, `currency = 'SEK'`, `purchased_at`, `expires_at` (`> purchased_at`), `status active|refunding|refunded|expired|disputed|depleted`, `delivered_at`, timestamps.

**`public.gift_card_ledger`** (append-only, även för `service_role` — inga update/delete-grants, som `sms_credit_ledger`): `id bigint identity`, `business_id`, `gift_card_id`, `kind issue|hold|release|redeem|refund|expire|dispute`, `delta_minor int` (+ för issue/release, − för övriga), `booking_id null` (FK sammansatt), `payment_id null` (kassans betalningsrad), `actor_user_id null`, `created_at`. Unika: `(gift_card_id) where kind='issue'`, `(booking_id) where kind='hold'` (en reservation per bokning), `(booking_id) where kind='release'`. **Invariant:** `balance_minor = sum(delta_minor)` per kort.

**`payment_method`**: `alter type public.payment_method add value 'gift_card'` (egen migration före tabellerna, samma mönster som `…_payment_method_add_stripe.sql`).

**RLS** (INV-3, inga anon-policies):
- `gift_card_orders`, `gift_cards`: köparen läser sina (`user_id = auth.uid()`) — **koden bara via `private.my_gift_cards()`**; medlemmar med `can_view_reports` läser företagets **utan** `code`, `user_id`, `buyer_email`, `recipient_email`, `greeting` (kolumn-grants, som D-057). Bara servern skriver.
- `gift_card_ledger`: `can_view_reports` läser företagets; köparen läser sina korts rader via `my_gift_cards()`.

**Funktioner** (`private`, security definer, `search_path = ''`, `execute` bara `service_role` om inget annat sägs):
- `gift_card_open_order(...)` — som `voucher_open_order` men utan lager: validerar `gift_cards_enabled`, `charges_enabled`, planfunktionen, beloppsintervallet; återanvänder en öppen order med levande session för samma köpare + belopp (dubbelklick).
- `gift_card_fulfill(order, session, payment_intent, amount, currency, now)` — **återanvänder logiken i `voucher_fulfill`** (kräver session, belopp/valuta måste stämma, annars fel → webhook 500). Skapar i EN transaktion: order `paid`, `gift_cards`-raden (kod genereras i servern och skickas in; unik-krock → nytt försök), ledger `issue`, kvittomejlet till köparen och leveransmejlet till mottagaren i `message_outbox` (`next_attempt_at` = leveranstidpunkten, se steg 6). Idempotent: andra anropet returnerar befintligt kort.
- `gift_card_hold(card, booking, amount, now)` — `select … for update` på kortet, kräver `status='active'`, `expires_at > bokningens start`, samma företag; `amount = least(balance, bokningens att-betala)`; ledger `hold`, `balance_minor -= amount`. Anropas i bokningens transaktion.
- `gift_card_redeem_at_till(business, code, amount, booking null, actor, now)` — för kassan: låser kortet, kräver aktivt + giltigt + `amount <= balance`; ledger `redeem` + `payments`-rad (`method='gift_card'`, `status='approved'`) i samma transaktion. Får köras som inloggad medlem (security definer med egen behörighetskontroll = samma behörighet som att markera betalt i kassan), annars `42501`.
- Trigger på `bookings.status` (återanvänder mönstret i `vouchers_on_booking_status`): avbokad/nekad/utgången förfrågan → ledger `release` (+belopp, saldot tillbaka; har kortet gått ut under tiden: `release` följt av `expire`); genomförd/no-show eller bekräftad vars tid passerat (svepet) → `payments`-rad `gift_card` för det reserverade beloppet (intäkten bokförs vid tjänsten, moms då). Ingen ny ledger-rad vid genomförande (hold är redan debiteringen).
- `gift_card_mark_payment(card, kind, refunded_total, now)` — som `voucher_mark_payment`: `withdrawn` (bara från `refunding`), `refunded` (Stripe-dashboard, **kumulativ** som D-053: `to_void = least(balance, refunded_total - redan_återbetalt)`, ledger `refund`, aldrig negativt), `disputed` (frysning: ingen ny inlösen; öppna `hold` på framtida bokningar släpps och bokningen blir obetald, som D-057 S1).
- `gift_card_sweep(now)` — utgångna `active` → ledger `expire` (−saldo), status `expired`; `balance_minor = 0` efter inlösen → `depleted`.
- `my_gift_cards()` — köparens kort med kod, saldo, utgång, företagets namn/slug/tidszon, ledger-sammanfattning.
- `export_my_account()` (D-054) utökas med presentkort och ordrar; företagets kundexport rörs inte (gästköpare är inte `customers`-rader).
- Företagsradering: `open_gift_cards` blockerar som `open_vouchers` (D-057) så länge något kort har saldo > 0 och inte gått ut.

### Steg 3 — Köp via Stripe Connect (integrations-engineer)
**Återanvänds från WP-69 oförändrat:** `getStripe()`, `stripeEnabled()`, `businessCanSellVouchers` (charges_enabled-kontrollen, generaliseras till `businessCanSell(businessId)`), `MARKETPLACE_FEE_BPS` (1 %) i `src/config/platform-fee.ts`, sessionens livslängd 31 min, idempotensnyckel = order-id, `metadata.kind`-routing, `hitRateLimit`.

**Nytt:** `src/config/gift-cards.ts` (`GIFT_CARD_PRESETS_SEK = [300, 500, 1000]`, `MIN = 100`, `MAX = 5000`, `VALIDITY_MONTHS = 24`, `DELIVERY_MAX_DAYS = 90`, `DELIVERY_LOCAL_TIME = "08:00"`, `giftCardsAvailable()` = SE + Stripe-nyckel + marknadens flagga). `src/lib/validation/gift-cards.ts` (Zod: belopp i hela kronor, e-post, namn ≤ 80, hälsning ≤ 300 utan URL:er, datum i `[i dag, i dag + 90]` i företagets tidszon).

`createGiftCardCheckout({ slug, form, userId|null, ip, now })`:
1. Rate limit: per IP + företag 5 / 10 min, per köpar-e-post 5 / timme (hashade nycklar, ingen persondata i `rate_limits`).
2. Servern räknar belopp och avgift (`floor(belopp × 100 / 10 000)`), aldrig klienten.
3. `gift_card_open_order` → `checkout.sessions.create` med `stripeAccount`, `mode: 'payment'`, en rad "Presentkort {företag}" **utan** skattesats (flerfunktionsvoucher), `payment_intent_data.application_fee_amount`, `payment_intent_data.description = "Presentkort (flerfunktionsvoucher) – moms redovisas vid inlösen"`, `customer_email`, `metadata { kind: 'gift_card', order_id, business_id }`, `success_url` = `/<slug>/presentkort/klart?session={CHECKOUT_SESSION_ID}`, `cancel_url` = köpsidan.
4. Ingen Stripe.js (hostad redirect).

`fulfillGiftCardSession(sessionId, account)` — samma kontroller som `fulfillVoucherSession` (hämtar sessionen från API:t med `stripeAccount`, `metadata.kind === 'gift_card'`, `payment_status === 'paid'`, belopp/valuta/order/företag stämmer) → `private.gift_card_fulfill`. Anropas från webhooken, retursidan och svepet (backoff via `next_attempt_at`, som `runVoucherSweep`).

### Steg 4 — Webhook (integrations-engineer)
`webhook.ts`, Connect-grenen (`event.account` satt): före värdebevisets hanterare anropas `handleGiftCardCheckoutEvent` / `handleGiftCardPaymentEvent` (ordern slås upp på session/PaymentIntent; returnerar `false` om ingen presentkortsorder finns → nästa hanterare som i dag). Händelser: `checkout.session.completed`, `checkout.session.async_payment_succeeded`, `checkout.session.expired`, `charge.refunded`, `charge.dispute.created`. Idempotens och 500-vid-fel som D-044/D-057. Inga nya händelsetyper i Stripe Dashboard behövs (samma som WP-69).

### Steg 5 — Inlösen (scheduling-engineer + integrations-engineer)
**Online på `/[slug]`:** bokningsflödets sista steg får ett hopfällt fält "Har du ett presentkort?" (ett `<input>` i befintligt formulär, ingen ny klientmodul). Koden skickas med bokningen; `createIn` (scheduling) normaliserar koden (versaler, Crockford-ersättningar O→0, I/L→1), slår upp kortet **bundet till företaget** (en kod från ett annat företag ger samma fel som en okänd kod) och anropar `gift_card_hold` i bokningens transaktion. Bokningen får ingen rabatt (`discount_clp` oförändrad) — presentkortet är ett **betalningsmedel**, inte en rabatt (moms: tjänsten säljs till fullt pris). Bekräftelsen visar "Betalt med presentkort: X kr · kvar att betala: Y kr · saldo kvar: Z kr". Om "Obligatorisk" onlinebetalning och Y > 0: Checkout för Y (A7); Y < 5 kr (D-044:s minimum) → Y betalas i salongen. Flytt förbi kortets utgång → `too_far` (återanvänder `voucher_expiry_for_booking`-mönstret). Fel kod → fältfel, bokningen skapas inte; rate limit på misslyckade uppslag (steg 8).
- Valfri förkontroll "Visa saldo" är **inte** med i v1 (sparar JS och en gissningsyta) — se FRÅGA.

**I kassan:** `/app/kassa/presentkort` → "Lös in kod": kod → servern visar saldo, utgång och mottagarens förnamn (ingen e-post) → belopp (standard = min(saldo, vald boknings att-betala)) → valfri koppling till en bokning → `gift_card_redeem_at_till`. Kvittot/bokningskortet visar "Presentkort ···XXXX" (bara fyra sista tecknen).

### Steg 6 — Leverans, schemaläggning, utskrift (integrations-engineer + ui-engineer)
- Ny mottagartyp `gift_recipient` (`alter type public.message_recipient_kind add value`). Workern slår upp adressen **vid sändning** ur `gift_card_orders.recipient_email` via `payload.gift_card_id` (ingen adress i payload, som i dag). Saknas mottagaradress → leveransmejlet går till köparen.
- Schemaläggning = `next_attempt_at` = `deliver_on` kl. 08:00 i företagets tidszon (konvertering via `src/lib/format/dates.ts`, testas över sommartid). Ingen ny kömekanism. `dedupe_key = 'gift_delivery:<card_id>'`. `delivered_at` sätts när raden blir `sent`.
- Mejlets kod ligger i payload bara medan raden väntar och nollas när raden är `sent`/`dead` (D-029-mönstret).
- "Ångra köp" ändrar leveransraden till `cancelled` om den inte skickats.
- Köparen kan "Skicka igen" (samma adress) en gång per dygn från kontot eller gästlänken; ny outbox-rad med egen `dedupe_key`.
- Utskriftssida `/<slug>/presentkort/kort/<id>?t=<token>` (token = engångsgenererad, bara SHA-256 lagras, giltig lika länge som kortet) och för inloggad köpare utan token. Serverrenderad, `noindex`, `Referrer-Policy: no-referrer`, ingen klient-JS utöver `window.print()`-knappen.

### Steg 7 — UI (ui-engineer, efter godkänd referens)
- `/<slug>/presentkort`: egen rutt med egen layout — **importerar inget från bokningsflödets klientkomponenter**, så `/[slug]` påverkas inte. Formulär: beloppsknappar 300/500/1 000 + "Annat belopp", mottagare (namn, e-post — eller "Till mig själv"), hälsning, leveransdatum, köparens namn/e-post (förifyllt om inloggad), villkorsruta (aldrig förkryssad) → server action → redirect till Checkout. Budget: ≤ 120 kB gzip first-load (som Upptäck, D-055).
- `/[slug]`: textlänk "Köp presentkort" i profilen (serverrenderad, bara när `gift_cards_enabled` och företaget kan sälja) + kodfältet (steg 5). **Mätning:** `/[slug]` får öka högst 2 kB gzip (SE ≤ 186 kB), mäts i e2e.
- `/<slug>/presentkort/klart`: anropar `fulfillGiftCardSession` först (som `confirmVoucherReturn`), visar "Klart!" + utskriftslänk + när mejlet skickas, eller "Betalningen behandlas".
- `/konto/presentkort`: köparens kort (saldo, utgång, status, historik, leveransstatus, "Skriv ut", "Skicka igen", "Ångra köp" inom 14 dagar och oanvänt). Länk från kontots meny bredvid "Mina värdebevis".
- Gästens "Ångra köp": länk i kvittomejlet → `/<slug>/presentkort/angra?t=<token>` → bekräftelse → `withdrawGiftCard`.
- `/app/kassa/presentkort`: sålda (antal, belopp — **inte intäkt**), inlösta, utestående saldo (skuld), utgångna + lista (···XXXX, belopp, saldo, status, köpdatum, utgång; ingen kod/e-post) + "Lös in kod". Kassans översikt räknar `payments.method='gift_card'` som betalning på bokningen (intäkt vid inlösen) och visar sålda presentkort på en egen rad utanför försäljningen.
- Inställningar → Betalningar: reglaget "Sälj presentkort" (ägaren; syns bara när Stripe är aktivt och planen har `online_payment`).

### Steg 8 — Säkerhet och dataskydd (integrations-engineer + db-engineer, granskas av security-reviewer)
- **Kodgissning:** 60 bitar slump (`crypto.randomInt`), koden bara giltig hos utfärdande företag. Misslyckade uppslag rate-limitas: per IP 10 / timme (bokningssidan), per medlem 20 / timme (kassan), per företag 100 / timme globalt (larm i loggen med kod, utan persondata). Samma felmeddelande för okänd, fel företag och utgången kod på `/[slug]` (ingen orakel-skillnad); kassan får visa "utgången" eftersom medlemmen är autentiserad.
- **Saldo-race:** all debitering under `select … for update` på kortraden + `check (balance_minor >= 0)` — två samtidiga inlösen kan aldrig ta mer än saldot; den andra får `gift_card_empty`. Ångra köp tar `refunding` under samma lås (D-057 B1-mönstret).
- **RLS:** se steg 2; inga anon-policies; publika sidor läser via servern som service_role med explicita filter.
- **Persondata:** mottagarens namn/e-post, köparens e-post och hälsningen raderas/nollas av `run_retention` 90 dagar efter att kortet blivit `depleted`/`expired`/`refunded` (beloppsraderna behålls avidentifierade för bokföring, se FRÅGA). Ingen kod, e-post eller hälsning i loggar. Integritetspolicy (SE) + RAT: ny rad "presentkort" (företaget är personuppgiftsansvarigt för köpare/mottagare, plattformen biträde — som för bokningar).
- **Missbruk av hälsningen** (plattformen skickar fri text till godtycklig adress): kräver genomförd betalning, ≤ 300 tecken, inga URL:er (Zod + server), visas som ren text.

### Steg 9 — Docs (planner)
D-058 in i `DECISIONS.md`, BACKLOG ◐ → ☑, IDEAS (avsnitt 2), `JURIST_FRAGOR.md` 20–24.

## 5. Tester (snålt, enligt ägarens önskemål)

**pgTAP `135_gift_cards.test.sql`** (en fil):
- RLS på alla tre tabellerna, inga anon-grants; `authenticated` har bara `select` (kolumn-grants: `code`, e-post, hälsning inte läsbara för medlemmar).
- Tenant-isolering: medlem i A ser inte B:s kort/ordrar/ledger; köpare ser bara sina; personal utan `can_view_reports` ser 0.
- `authenticated` kan inte köra `private.gift_card_*` utom `redeem_at_till` (och den nekar medlem i annat företag / utan behörighet med 42501).
- `fulfill` två gånger → ett kort, en `issue`, två outbox-rader (kvitto + leverans) med rätt `next_attempt_at`.
- `hold` större än saldot → tar bara saldot; avbokad bokning → `release`, saldot tillbaka; utgånget kort vid avbokning → `release` + `expire`.
- `check (balance_minor >= 0)` och ledger utan update/delete även för `service_role`.
- Invariant `balance_minor = sum(delta_minor)` efter alla fall.
- `mark_payment('refunded')` kumulativt: kort 500, inlöst 200, Stripe återbetalar 500 → saldo 0, aldrig negativt; samma anrop igen → ingen ändring.

**Integrationsfall (Vitest mot lokal DB, `src/server/gift-cards/gift-cards.db.test.ts`):**
1. **Samtidig inlösen:** kort med 500 kr, två parallella `redeem_at_till` à 400 → en lyckas, en `gift_card_empty`, saldo 100.
2. **Webhook + retursida samtidigt** för samma session → ett kort.
3. **Schemalagd leverans över sommartid:** `deliver_on = 2026-10-25` (DST-skiftet i Europe/Stockholm) → `next_attempt_at = 2026-10-25T07:00:00Z` (08:00 CET); `2027-03-28` → `06:00Z` (08:00 CEST).
4. **Utgång:** köp 2028-02-29 (skottdag) → utgår 2030-02-28 23:59:59 lokal tid; köp 2026-10-11 → 2028-10-11 23:59:59.
5. **Ångra köp** efter en inlösen på 1 kr → nekas; oanvänt dag 14 23:58 → ok; dag 15 00:00 → nekas.

Inga nya e2e eller visuella tester utöver: JS-budgetmätningen för `/[slug]` och `/<slug>/presentkort` (befintlig e2e-mätning utökas med en rad) och `npm run visual` för de nya skärmarna mot referensen (< 2 %).

## 6. Risker och öppna frågor
- FRÅGA: **Gästköp** — räcker namn + e-post utan konto (A1)? Gästen ångrar via länk i kvittomejlet. Alternativ: kräv konto som WP-69 (enklare, men sämre konvertering för presenter).
- FRÅGA: **Belopp** — min 100 kr och max 5 000 kr för valfritt belopp (A2)? Högre max ökar risken vid kortbedrägeri (stulna kort → presentkort).
- FRÅGA: **Plan** — ska försäljningen kräva Starta+ (`online_payment`, A3), eller gå på alla planer inkl. Gratis (bara 1 % + Stripe-konto)?
- FRÅGA: **Leveranstid** — 08:00 lokal tid, högst 90 dagar fram (A4)?
- FRÅGA: **Saldokontroll** — ska mottagaren kunna se saldo utan att boka ("Visa saldo"-sida med kod)? Förslag: nej i v1; saldot står i mejlet och, för inloggad köpare, i kontot. En publik saldosida är den största gissningsytan.
- FRÅGA: **Resten vid delinlösen** — betalas i salongen, och via Checkout bara när företaget har "Obligatorisk" onlinebetalning (A7)? Eller alltid i salongen?
- FRÅGA: **Koden i databasen** — lagras i klartext med kolumn-grants (som D-057, krävs för "Skriv ut" och "Skicka igen") eller bara som HMAC + fyra sista tecken (säkrare, men köparen kan då inte se koden igen)? Förslag: klartext som D-057.
- FRÅGA: **Mottagare med konto** — ska mottagaren kunna "lägga till presentkortet i mitt konto" med koden? Förslag: nej i v1 (IDEAS).
- **Juridik** (nya frågor i `JURIST_FRAGOR.md`, skarp lansering först efter svar, som D-057):
  - 20. **Giltighet och preskription:** Konsumentverket anser att presentkort bör gälla minst ett år och att villkoren ska framgå tydligt vid köpet; allmän preskription är 10 år (preskriptionslagen 1981:130) om inget annat avtalats. Räcker 24 månader + tydlig villkorstext? Får företaget behålla restvärdet efter utgång?
  - 21. **Ångerrätt (lag 2005:59):** gäller 14 dagar för presentkortet som sådant, men upphör den när kortet använts delvis? Vi föreslår: full återbetalning om oanvänt, annars ingen ångerrätt.
  - 22. **Moms (mervärdesskattelagen 2023:200, voucherreglerna):** är ett presentkort som gäller alla salongens tjänster en flerfunktionsvoucher även när alla tjänster har 25 % moms (då kan det vara en enfunktionsvoucher med moms vid försäljning)? Vad gäller om salongen har både momsfria (t.ex. legitimerad vård) och momspliktiga tjänster? Momsen på restvärde som förfaller?
  - 23. **Bokföring och kassaregister:** räcker Stripes kvitto + vår kassavy (sålt = skuld, inlöst = betalning) som underlag för salongen? Behöver onlineförsäljningen av presentkort registreras i salongens kassaregister?
  - 24. **Konkurs/upphörande:** vad gäller kunderna om salongen stänger med utestående presentkort (radering blockeras, men pengarna ligger hos salongen)? Behövs en text i villkoren?
- **Risk — momsklassningen är salongens ansvar**, men vår kvittotext påstår "flerfunktionsvoucher". Är jurist 22 negativ för en viss salong måste texten kunna ändras per företag (inte i v1).
- **Risk — kortbedrägeri:** presentkort är ett vanligt sätt att tvätta stulna kort. Stripe Radar på företagets konto + beloppsgräns + rate limit; tvist fryser saldot.
- **Risk — JS-budget på `/[slug]`:** kodfältet är det enda tillägget; spräcker det 186 kB tas fältet bort och inlösen sker bara i kassan (beslutas i PR:en).
- **Risk — filkollision** i `webhook.ts` med WP-78 och i `src/server/bookings/create.ts` med andra pågående WP. Se avsnitt 3.
- **Risk — leveransmejl i skräppost:** avsändare = plattformens domän (Resend), "från {företag}" i namnet; SPF/DKIM finns redan.

### D-058 (förslag) · Presentkort i SE: värdebaserat, alla tjänster, 24 månader, delinlösen, flerfunktionsvoucher (WP-77)
Presentkort säljs bara på salongens egen rutt `/<slug>/presentkort` (CL dolt), som Stripe Checkout direct charge på företagets konto med `application_fee_amount` 1 % (`MARKETPLACE_FEE_BPS`, D-057) och **utan** skattesats: presentkortet är en flerfunktionsvoucher, moms redovisas av salongen vid inlösen. Köp kräver inte konto (gäst: namn + e-post; inloggad köpare får kortet i `/konto/presentkort`). Belopp 300/500/1 000 kr eller valfritt 100–5 000 kr, beräknat på servern. Giltigt t.o.m. samma kalenderdag 24 månader efter köpet, 23:59:59 i företagets tidszon. Kod `XX-XXXX-XXXX-XXXX` (12 tecken Crockford base32, 60 bitar), bara giltig hos utfärdande företag, rate-limitad. Leverans som mejl till mottagaren med hälsning (≤ 300 tecken, utan länkar), schemalagd via `message_outbox.next_attempt_at` (08:00 lokal tid, ≤ 90 dagar). Saldot förs i `gift_card_ledger` (append-only, `balance_minor = sum(delta)`, `check >= 0`, radlås vid varje debitering). Inlösen är en **betalning** (`payment_method = 'gift_card'`), inte en rabatt: online på `/[slug]` reserveras `min(saldo, att betala)` i bokningens transaktion (släpps vid avbokning, blir betalning vid genomförd); i kassan med kod. Kassan visar sålda presentkort som skuld, inte intäkt. Ångra köp inom 14 dagar om oanvänt (`refunding` under radlås, full refund med `refund_application_fee`); återbetalning från Stripe dras kumulativt från saldot, tvist fryser kortet. Webhook, idempotens, svep och returkontroll återanvänder D-057. Tabeller `gift_card_orders`, `gift_cards`, `gift_card_ledger` med RLS (köparen läser sina, `can_view_reports` läser företagets utan kod/e-post/hälsning, bara servern skriver), pgTAP 135. Skarp lansering först efter juristsvar (`JURIST_FRAGOR.md` 20–24).

## 7. Klart när
- [ ] Ägaren har svarat på FRÅGA-punkterna; referensen `docs/design/reference/presentkort/*.dc.html` finns; D-058 inskrivet.
- [ ] Migration + `135_gift_cards.test.sql` gröna (`npm run test:db`): RLS, tenant-isolering, invariant, saldo aldrig negativt.
- [ ] Köp på `/<slug>/presentkort` (SE): direct charge med 1 % avgift, ingen skattesats, belopp från servern, gästköp och inloggat köp fungerar; CL ger 404.
- [ ] Fulfill idempotent från webhook, retursida och svep; kort, ledger, kvitto och leveransmejl skapas i en transaktion.
- [ ] Leveransmejlet går till mottagaren på valt datum kl. 08:00 lokal tid (även över sommartid), med hälsning; utskriftssidan fungerar.
- [ ] Delinlösen online (reservation släpps vid avbokning, blir betalning vid genomförd) och i kassan med kod; två samtidiga inlösen kan inte överskrida saldot.
- [ ] Kassan visar sålda presentkort som skuld och inlösen som betalning; summorna stämmer med bokningarna (F10).
- [ ] Ångra köp (14 dagar, oanvänt), Stripe-återbetalning (kumulativ) och tvist (frysning) speglas korrekt.
- [ ] Kodgissning rate-limitad; inga koder, e-postadresser eller hälsningar i loggar; export och `run_retention` täcker presentkorten.
- [ ] `/[slug]` ≤ 186 kB gzip i SE (ökning ≤ 2 kB), `/<slug>/presentkort` ≤ 120 kB.
- [ ] `npm run typecheck && npm run lint && npm run test` gröna; `npm run visual` < 2 % för de nya skärmarna.
- [ ] security-reviewer har granskat (`supabase/`, `src/app/api/`, `src/server/payments/`, `src/server/gift-cards/`); inget körts mot produktion.
- [ ] `JURIST_FRAGOR.md` 20–24 inlagda; BACKLOG ◐ → ☑; IDEAS kompletterad.

## Ägarens beslut 2026-10-11 (går före antaganden och FRÅGOR ovan)
- Design godkänd: `docs/design/reference/presentkort/{Main,Mobil,Mejl,Kassa}.dc.html` (artifact https://claude.ai/artifact/YTP3uWTzEK5tZWXT9T7J1a). Hälsningskortets design: Lime / Lila / Foto.
- **Gästköp utan konto** (namn + e-post). Inloggad köpare får kortet i sitt konto.
- **Planer:** säljs från **Starta och uppåt** (samma som onlinebetalning); kräver Stripe-konto med charges_enabled.
- Giltighet 24 månader fast, avgift 1 %, säljs bara på salongens egen presentkortssida.
- Standardval (koordinatorn): valfritt belopp 100–5 000 kr; leverans kl. 08:00 lokal tid, högst 90 dagar fram; ingen publik saldosida i v1 (saldo syns via mejlets länk med signerad token); det presentkortet inte täcker betalas i salongen; koden lagras som i D-057 (klartext, skyddad av RLS, bara köpare/mottagarlänk ser den) med 12 tecken; mottagaren kan inte lägga kortet i sitt konto i v1; juristfrågorna 20–24 läggs i JURIST_FRAGOR.md.
