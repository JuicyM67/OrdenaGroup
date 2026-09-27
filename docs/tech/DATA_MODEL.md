# Datamodell (utkast)

> Utgångspunkt för `db-engineer`. Detaljer får förbättras, men invarianterna (markerade **INV**) får inte tas bort utan ett nytt beslut i DECISIONS.md.

## Konventioner
- `id uuid primary key default gen_random_uuid()`, `created_at timestamptz default now()`, `updated_at` via trigger (`private.set_updated_at()`).
- Alla tenant-tabeller har `business_id uuid not null references businesses on delete cascade` + index.
- Belopp: `integer` CLP, `check (x >= 0)`. Tider: `timestamptz` / `tstzrange`. Telefon: `text` E.164 med check `^\+[1-9][0-9]{7,14}$`.
- Enums som Postgres-typer.
- **D-014, tenant-integritet:** varje tabell som pekar på en annan tenant-tabell gör det med en **sammansatt FK** `(business_id, x_id) references x (business_id, id)`, inte bara `x_id references x (id)`. Det kräver `unique (business_id, id)` på den refererade tabellen. En rad i företag A kan då aldrig peka på en rad i företag B, inte ens med service role som förbigår RLS (bevisas av pgTAP-punkt 8, "tvärtenant-FK", i varje tabells testfil). Avvikelse från tidigare utkast: `staff_services` och `staff_hours` har därför fått en egen `business_id`-kolumn (de har den inte i en normaliserad modell, men det krävs för RLS-policyn och den sammansatta FK:en).
- RLS-hjälpfunktioner (`is_member` m.fl.) ligger i schemat **`private`**, inte `public`. Schemat exponeras inte i Data API (ingår inte i `api.schemas`), så funktionerna kan bara anropas inifrån policies/andra funktioner, aldrig som RPC. De är `security definer`, `stable` och sätter `search_path = ''` för att inte vara sårbara för sökvägskapning. Undantaget är `public.create_business()`, som medvetet ligger i `public` eftersom den anropas direkt av klienten (se nedan).
- Grants (rättat två gånger, säkerhetsgranskning): `anon` har inga rättigheter alls i `public` (varken tabeller, sekvenser eller funktioner), varken direkt eller via `PUBLIC`-standardrättigheter. Den lokala Supabase-plattformen sätter en default-privilege SPECIFIK FÖR SCHEMAT `public` (en egen rad i `pg_default_acl` för roll `postgres`/schema `public`) som annars ger `anon`, `authenticated` och `service_role` fullt CRUD på nya tabeller (motsvarande `auto_expose_new_tables` i molnet). **Hur det kombineras** (rättad förklaring): en schema-specifik default-privilege-rad (`in schema X`) och en schemalös (global) rad för samma roll är två separata rader som **läggs ovanpå varandra** (adderas) — det är inte så att den mest specifika "vinner" och den andra ignoreras helt. Konsekvens: det som getts **per schema** kan bara återkallas med en revoke **i samma schema** (en schemalös revoke rör en annan, obesläktad global rad och gör ingenting åt den schema-specifika — det var precis det som hände i en tidigare version av `core_foundation`-migrationen: `anon` behöll fullt CRUD i `public` trots att revoken "såg rätt ut"). Omvänt: det som getts **globalt** kan inte återkallas med en schema-specifik revoke, bara med en annan schemalös sats. Vår revoke för `anon`/`authenticated` är därför `alter default privileges for role postgres in schema public ...`, medan regeln för Postgres inbyggda PUBLIC-execute-standard på funktioner (`revoke execute on functions from public`, där "from public" är pseudo-rollen, inte schemat) medvetet är schemalös, eftersom `public` inte har någon egen schema-specifik rad för just den SQL-standardregeln (bara för anon/authenticated/service_role) — den schemalösa raden täcker då `private` och alla framtida scheman i ett steg, utan att kollidera med `public`s egen rad. Se `core_foundation`-migrationen för den exakta ordningen (default-privilegier måste sättas innan `private.set_updated_at()` skapas).

## Tabeller

```sql
-- Företag och åtkomst
businesses (id, slug unique, name, comuna, category, timezone default 'America/Santiago',
  phone, address, logo_url, accent_color,
  min_notice_minutes default 60, max_days_ahead default 30,
  cancel_window_hours default 3, slot_interval_minutes default 15,
  waitlist_mode enum('sequential','broadcast') default 'sequential',
  plan enum('free','emprende','equipo','local') default 'free',
  trial_ends_at, status enum('active','frozen') default 'active')

memberships (business_id, user_id references auth.users, role enum('owner','staff','vendor','admin'),
  staff_id null references staff, primary key (business_id, user_id))
  -- Säkerhet S3: rollen 'admin' här är en FÖRETAGSNIVÅ-roll (samma
  -- rättigheter som 'owner' i den här tabellens policies), inte
  -- plattformsadministration. En ägare kan inte ge ut den via appen (RLS:
  -- with check role <> 'admin'); bara service role sätter den. VARNING inför
  -- F19 (intern admin-konsol): plattformsadmin FÅR INTE bygga sin
  -- auktorisering på memberships.role = 'admin' i något företag — det är två
  -- olika begrepp som råkar dela ett enum-värde. F19 behöver en egen,
  -- företagsoberoende mekanism (t.ex. en separat platform_admins-tabell eller
  -- en claim på auth.users), vilket ska beslutas i DECISIONS.md innan F19
  -- påbörjas.

-- Katalog och schema
staff (id, business_id, name, color, active, sort)
  -- color är ett TOKENNAMN ('staff-1' … 'staff-6', se src/styles/tokens.css), inte ett hex-värde.
  -- Hex-koder är en stil-fråga för UI:t, inte data. unique (business_id, id) för sammansatta FK.
services (id, business_id, name, category, duration_min check > 0, price_clp,
  buffer_after_min default 0, deposit_kind enum('none','fixed','percent'), deposit_value,
  remind_after_weeks null, active, sort)
  -- unique (business_id, id) för sammansatta FK.
staff_services (business_id, staff_id, service_id, primary key (staff_id, service_id))
  -- business_id (D-014, se ovan) + sammansatta FK (business_id, staff_id) -> staff, (business_id, service_id) -> services.
business_hours (business_id, weekday 1-7 (ISO, 1 = lunes), start_time, end_time)   -- flera rader per dag tillåts, ingen överlappning samma dag (exclusion constraint)
staff_hours (business_id, staff_id, weekday, start_time, end_time)
  -- business_id (D-014) + sammansatt FK (business_id, staff_id) -> staff.
  -- Semantik (FRÅGA 5, godkänd): en profesional UTAN rader följer företagets business_hours rakt av.
  -- En profesional MED rader arbetar bara inom snittet av sina egna rader och företagets — snävar in,
  -- vidgar aldrig. Databasen tvingar inte fram snittet (motorn i WP-10 räknar det); en staff_hours-rad
  -- som råkar vara bredare än business_hours ger inte fel i databasen (R6 i WP-01-planen).
time_off (id, business_id, staff_id null = hela företaget, period tstzrange, kind enum('block','lunch','vacation','holiday'), note)
  -- sammansatt FK (business_id, staff_id) -> staff när staff_id inte är null.

-- Kunder
customers (id, business_id, phone_e164, name, email null, notes,
  consent_terms_at, consent_marketing_at null, consent_version, consent_channel,
  visits_count default 0, no_show_count default 0, last_visit_at, anonymized_at null,
  unique (business_id, id), unique (business_id, phone_e164))
  -- phone_e164 och name är nullable BARA när anonymized_at är satt (check), så att WP-26 kan
  -- anonymisera en kund utan ny migration. consent_*-fälten saknar default (aldrig förkryssat,
  -- hård regel 7/Ley 21.719): om consent_terms_at eller consent_marketing_at är satt måste
  -- consent_version och consent_channel också vara satta.
  -- R7 (qa8): visits_count/no_show_count är denormaliserade räknare. WP-21
  -- MÅSTE uppdatera dem i SAMMA transaktion som bokningens statusbyte
  -- (completed/no_show), annars glider de isär från den faktiska historiken
  -- i bookings. WP-01 skapar bara kolumnerna (default 0); ingen trigger
  -- underhåller dem än.

-- Bokningar
bookings (id, business_id, staff_id, service_id, customer_id,
  period tstzrange not null,              -- själva tjänsten
  blocked tstzrange not null,             -- period + buffert, används av constraint
  status enum('pending_payment','confirmed','completed','no_show','cancelled'),
  source enum('web','manual','waitlist','flash'),
  price_clp, discount_clp default 0, deposit_clp default 0,
  manage_token_hash bytea unique,         -- FRÅGA 6 (godkänd): SHA-256-hash av kundens länk-token,
                                           -- inte klartext. Klartexten finns bara i länken/meddelandet;
                                           -- en databasläcka ger då inte åtkomst till kundernas bokningar.
  pending_expires_at null, cancelled_at, cancel_reason, reminded_at, confirmed_by_customer_at,
  notes)
  -- unique (business_id, id) + sammansatta FK (business_id, staff_id) -> staff osv.

-- INV-1: ingen dubbelbokning av samma profesional
alter table bookings add constraint no_overlap
  exclude using gist (staff_id with =, blocked with &&)
  where (status in ('pending_payment','confirmed','completed'));

payments (id, business_id, booking_id, kind enum('deposit','balance','full'),
  method enum('cash','card_terminal','transfer','mercadopago'),
  amount_clp, status enum('pending','approved','rejected','refunded'),
  provider_ref null, paid_at)

-- Unika funktioner
waitlist_entries (id, business_id, customer_id, service_id, staff_id null, date date,
  status enum('waiting','offered','booked','expired','cancelled'), offered_at, offer_expires_at, position)
flash_slots (id, business_id, staff_id, service_id, period tstzrange, discount_pct check 5..70,
  status enum('open','booked','expired','cancelled'), booking_id null)
loyalty_programs (business_id primary key, every_n_visits, reward_text, active)
loyalty_cards (business_id, customer_id, stamps, rewards_redeemed, primary key (business_id, customer_id))

-- Meddelanden
message_outbox (id, business_id, booking_id null, to_phone, channel enum('whatsapp','email'),
  template, payload jsonb, category enum('utility','marketing','service'),
  status enum('queued','sending','sent','delivered','read','failed','dead'),
  attempts default 0, next_attempt_at, provider_message_id, error, dedupe_key unique)
inbound_events (provider, event_id, payload jsonb, received_at, primary key (provider, event_id))  -- INV-2: idempotens

-- Integrationer och abonnemang
integrations (business_id, provider enum('mercadopago'), account_id, access_token_enc, refresh_token_enc, expires_at)
subscriptions (business_id, plan, status enum('trialing','active','past_due','cancelled'), provider, provider_ref, current_period_end)
usage_monthly (business_id, month date, whatsapp_utility, whatsapp_marketing, primary key)

-- Försäljning och drift
vendors (id, user_id, name, phone, commission_pct)
vendor_businesses (vendor_id, business_id, signed_at, primary key)
audit_log (id, business_id null, actor_user_id null, action, entity, entity_id, meta jsonb, at)
```

## RLS-mönster

```sql
-- Ligger i schemat `private` (exponeras aldrig i Data API), inte `public`.
create function private.is_member(b uuid, roles public.member_role[] default null)
returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (select 1 from public.memberships m
    where m.business_id = b and m.user_id = (select auth.uid())
    and (roles is null or m.role = any(roles)));
$$;
revoke all on function private.is_member(uuid, public.member_role[]) from public;
grant execute on function private.is_member(uuid, public.member_role[]) to authenticated;

alter table public.services enable row level security;
create policy "owners full access" on public.services for all to authenticated
  using (private.is_member(business_id, array['owner','admin']::public.member_role[]))
  with check (private.is_member(business_id, array['owner','admin']::public.member_role[]));
grant select, insert, update, delete on public.services to authenticated;
```

- **INV-3:** RLS på **varje** tabell, **inga** policies för `anon` (varje `create policy` anger `to authenticated` uttryckligen, så `pg_policies.roles` aldrig innehåller `anon`/`public`). `anon` saknar dessutom helt grants i `public` (försvar på djupet, D-014). Den publika bokningssidan läser via servern (Server Components/Actions med service role och explicit `business_id` från slug) och exponerar bara publika fält.
- I WP-01 (fas 1) har rollerna `staff` och `vendor` ingen åtkomst till katalog, kunder eller bokningar — bara sin egen `memberships`-rad och företagets `businesses`-rad (FRÅGA 4). Policies för profesionalens egen agenda (F6) och säljarvyn (F18) läggs till i det WP som bygger inloggningen.
- `businesses` har ingen insert-policy: nya företag skapas bara via `public.create_business()` (security definer, kräver `auth.uid()`, skapar företaget och ägarens medlemskap i samma transaktion).
- **INV-4:** en pgTAP-test per tabell bevisar att företag A inte kan läsa eller skriva B:s rader, och att en rad i A inte kan peka på personal/tjänst/kund/bokning i B (sammansatta FK, D-014).
- Kunden (utan konto) når sin bokning bara via sin länk; servern jämför tokenens SHA-256-hash mot `bookings.manage_token_hash`.
- **Säkerhetsgranskningsfynd, ytterligare begränsningar utöver `is_member`:**
  - `payments` (B1): `authenticated` kan bara skapa/ändra rader med `method in ('cash','card_terminal','transfer')` och `provider_ref is null`. `mercadopago`-rader är skrivskyddade för `authenticated` (både insert och update), och skapas/ändras bara av `service_role` i webhook-hanteraren (WP-25).
  - `businesses` (B2): `authenticated` har bara kolumnbegränsad `update` (affärsfält). `plan`, `status`, `trial_ends_at`, `id`, `timezone` kan bara ändras av `service_role` (billing/D-011/WP-26).
  - `memberships` (S3): `with check (role <> 'admin')` på insert/update, och kolumnbegränsad `update (role, staff_id)` — `business_id`/`user_id` kan inte ändras av `authenticated`.
  - `customers` (S5, rättad — blockerande granskningsfynd): RLS-policyerna är bara tenant-isolering (`is_member`), en per kommando (select/insert/update/delete), INTE en enda `for all`-policy. Anledningen: en `for all`-policys `with check` gäller även UPDATE och utvärderas mot HELA den nya raden — om villkoret "`consent_channel` null eller `manual`" satt där, blockerades varje uppdatering (även av `notes`) på en kund som redan hade `consent_channel = 'web'/'whatsapp'` från det publika bokningsflödet, eftersom den oförändrade kolumnen i den nya raden fortfarande bröt mot villkoret. Reglerna för samtyckesfälten ligger i stället i triggern `private.customers_guard_consent()` (`before insert or update`, `security invoker`, `search_path = ''`), som bara agerar när `current_user = 'authenticated'`: vid INSERT måste `consent_channel` vara null eller `'manual'`; vid UPDATE nekas ändring av något `consent_*`-fält (`is distinct from` den gamla raden) UTOM när det nya värdet har `consent_channel = 'manual'`, eller när kunden anonymiseras (`anonymized_at` sätts och samtycket nollas i samma sats). En trigger kan jämföra ny rad mot gammal rad, vilket en RLS-policy inte kan uttrycka.
  - `private.protect_last_owner()` (S4): hoppar över kontrollen om `businesses`-raden redan är borta (kaskad), låser `businesses`-raden (`for update`) innan den räknar kvarvarande owners (skydd mot samtidiga degraderingar), och blockerar byte av `business_id` på en `memberships`-rad även för roller som förbigår RLS.
  - Samtliga tabeller har explicita `grant ... to service_role` (S2): den lokala plattformens dolda auto-expose-standard ska inte vara den enda anledningen till att servern (cron/webhooks) fungerar — samma grants gäller oavsett plattformskonfiguration. `businesses` har dessutom `delete` för `service_role` (WP-26 raderar ett företag på ägarens begäran; kaskaden tar bort memberships/staff/services/... samtidigt). `payments` har medvetet **ingen** `delete`, inte ens för `service_role` — kassahistorik ska aldrig kunna försvinna, oavsett vilken roll som frågar.
  - **Radering av ett ägarkonto** (`auth.users`): eftersom `protect_last_owner()` hindrar att det sista owner-medlemskapet i ett företag tas bort, går det inte att radera en `auth.users`-rad som är sista ägaren i ett aktivt företag (cascade till `memberships` skulle blockeras av triggern). WP-26 måste därför först radera företaget (`service_role`, se ovan) eller överlåta det till en annan ägare, innan ägarens konto kan raderas.
