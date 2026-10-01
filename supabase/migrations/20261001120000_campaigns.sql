-- WP-31 · Erbjudanden (kampanjer) + "Te echamos de menos" (db-engineer)
-- F#: F14. Plan: docs/tasks/plans/WP-31-utskick.md, "Kampanjer".
-- INV: INV-3 (RLS på varje tabell, inga anon-policies), INV-4 (tenant-isolering,
-- sammansatta FK, D-014).
--
-- `channel` återanvänder `public.message_channel` ('email', 'sms'),
-- skapad av 20260929110000_message_outbox.sql: exakt samma två värden som
-- planen kräver för kampanjens kanal, och samma betydelse (vilken kanal
-- utskicket går via). Ingen ny enum behövs.
--
-- `campaigns.channel` + `message` är en MALL (kanal + text), inte själva
-- utskicket — det riktiga utskicket går via `message_outbox` (category
-- 'marketing', D-029/D-030), en rad per mottagare, skapad av servern
-- (integrations-engineer, utanför den här migrationen). `campaign_recipients`
-- är kampanjens EGEN mottagarlogg (en rad per kund som fått/ska få
-- erbjudandet), med token-hash för erbjudandelänken `/{slug}?o=<token>` —
-- skild från `message_outbox.dedupe_key`, som styr själva
-- leveransförsöket/retries.
--
-- RLS (planens ord, ordagrant): "ägare eller can_manage_all_bookings"
-- (skicka kräver ägare/can_manage_all_bookings; läs historik samma) — för
-- BÅDA tabellerna, läsning OCH skrivning. `private.has_perm` (20260930150000)
-- kortsluter redan till `true` för `role = 'owner'`, så en enda
-- `has_perm(business_id, 'can_manage_all_bookings')`-klausul räcker (samma
-- mönster som skrivning av `customers`, 20260930170000).
set search_path = public, extensions;

create type public.campaign_status as enum ('draft', 'sent');

-- campaigns -------------------------------------------------------------
create table public.campaigns (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.businesses (id) on delete cascade,
  name text not null,
  channel public.message_channel not null,
  -- {kind: 'all'|'members'|'regulars'|'inactive'|'selected', days?: number, customerIds?: uuid[]}
  -- (planens form). Upplöses till faktiska mottagare av servern vid utskick
  -- (skriver en campaign_recipients-rad per vald kund), inte av databasen.
  audience jsonb not null,
  message text not null,
  offer_pct smallint,
  offer_text text,
  offer_valid_until date,
  status public.campaign_status not null default 'draft',
  sent_at timestamptz,
  created_by uuid not null references auth.users (id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (business_id, id),
  constraint campaigns_name_not_blank check (char_length(btrim(name)) > 0),
  constraint campaigns_message_not_blank check (char_length(btrim(message)) > 0),
  -- Planen: högst 320 tecken för sms, högst 1000 för e-post.
  constraint campaigns_message_length_check check (
    (channel = 'sms' and char_length(message) <= 320)
    or (channel = 'email' and char_length(message) <= 1000)
  ),
  constraint campaigns_offer_pct_check check (offer_pct is null or offer_pct between 1 and 100),
  constraint campaigns_offer_text_length_check check (offer_text is null or char_length(offer_text) <= 200),
  -- `audience` måste vara ett jsonb-OBJEKT (inte en array/skalär/null) för
  -- att `?`/`->`-operatorerna nedan ska betyda något meningsfullt. `?`
  -- returnerar `false` (aldrig `null`) för en skalär/array-topp, så den här
  -- checken är egentligen redundant mot kind-checken nedan, men ger ett
  -- tydligare fel för ett helt fel format (t.ex. en jsonb-array).
  constraint campaigns_audience_is_object check (jsonb_typeof(audience) = 'object'),
  -- `audience ? 'kind'` är `false` (aldrig `null`) om nyckeln saknas, så
  -- `and`-kedjan kortsluts säkert i stället för att ge `null` (som en CHECK
  -- tolkar som "uppfylld") — se kommentaren vid selected-checken nedan för
  -- varför det här är viktigt.
  constraint campaigns_audience_kind_check check (
    audience ? 'kind' and audience->>'kind' in ('all', 'members', 'regulars', 'inactive', 'selected')
  ),
  -- VIKTIGT (`null`-fälla): `audience->'customerIds'` är SQL `null` (inte
  -- jsonb `null`) när nyckeln saknas, och `jsonb_typeof(null)`/
  -- `jsonb_array_length(null)` ger då `null`, inte `false` — en CHECK som
  -- byggt det här villkoret med `->` i stället för `?` hade därför TILLÅTIT
  -- `kind = 'selected'` utan `customerIds` alls (`false or null` = `null`,
  -- och en CHECK blockerar bara ett uttryckligt `false`, aldrig `null`).
  -- Lösning: `audience ? 'customerIds'` (alltid `false`/`true`) som FÖRSTA
  -- villkor i AND-kedjan, precis som kind-checken ovan.
  constraint campaigns_audience_selected_requires_customer_ids check (
    coalesce(audience->>'kind', '') <> 'selected'
    or (
      audience ? 'customerIds'
      and jsonb_typeof(audience->'customerIds') = 'array'
      and jsonb_array_length(audience->'customerIds') > 0
    )
  ),
  -- `days` är valfritt (planens `days?`), men om satt måste det vara ett
  -- positivt heltal. `audience ? 'days'` kortsluter (samma `null`-fälla som
  -- ovan) om nyckeln saknas, så `(audience->>'days')::numeric`-casten
  -- aldrig körs på ett ogiltigt/saknat värde.
  constraint campaigns_audience_days_is_positive_int check (
    not (audience ? 'days')
    or (
      jsonb_typeof(audience->'days') = 'number'
      and (audience->>'days')::numeric > 0
      and (audience->>'days')::numeric = floor((audience->>'days')::numeric)
    )
  ),
  -- Samma mönster som `bookings_cancelled_at_check`: sent_at är satt precis
  -- när (och bara när) statusen är 'sent'.
  constraint campaigns_sent_at_check check ((status = 'sent') = (sent_at is not null))
);

-- D-014/schema_guard: index som börjar på business_id. Planens uttryckliga
-- krav: (business_id, created_at) — historikvyn (/app/clientes/utskick)
-- listar kampanjer per företag i skapad-ordning.
create index campaigns_business_id_created_at_idx on public.campaigns (business_id, created_at);

create trigger set_updated_at
  before update on public.campaigns
  for each row execute function private.set_updated_at();

alter table public.campaigns enable row level security;

create policy "manage campaigns" on public.campaigns
  for all
  to authenticated
  using (private.has_perm(business_id, 'can_manage_all_bookings'))
  with check (private.has_perm(business_id, 'can_manage_all_bookings'));

grant select, insert, update, delete on public.campaigns to authenticated;
-- Säkerhet S2: service_role (det dagliga winback-jobbet, WP-31-fortsättningen,
-- och utskicksarbetaren som sätter sent_at) har fullt CRUD.
grant select, insert, update, delete on public.campaigns to service_role;

-- campaign_recipients -----------------------------------------------------
-- En rad per kund som fått (eller ska få) kampanjens erbjudandelänk.
-- `token_hash`: samma mönster som `bookings.manage_token_hash`/
-- `member_invitations.token_hash` (FRÅGA 6/D-029-mönstret) — bara en
-- SHA-256-hash sparas, klartexten finns bara i länken/meddelandet tills den
-- är skickad.
create table public.campaign_recipients (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.businesses (id) on delete cascade,
  campaign_id uuid not null,
  customer_id uuid not null,
  token_hash bytea not null unique,
  sent_at timestamptz,
  -- Inlösen: vilken bokning som använde erbjudandet. `on delete set null`
  -- (kolumn-listform, samma skäl som `services.category_id`/
  -- `booking_answers.question_id`): om bokningen någon gång raderas (sker
  -- inte i dag, men ingen `on delete cascade` här ändå) ska mottagarraden
  -- bestå utan koppling, inte försvinna med business_id nollställt.
  redeemed_booking_id uuid,
  redeemed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (business_id, id),
  foreign key (business_id, campaign_id) references public.campaigns (business_id, id) on delete cascade,
  foreign key (business_id, customer_id) references public.customers (business_id, id) on delete cascade,
  foreign key (business_id, redeemed_booking_id) references public.bookings (business_id, id) on delete set null (redeemed_booking_id),
  -- K1 (samma resonemang som bookings_manage_token_hash_length): en SHA-256-
  -- hash är alltid exakt 32 byte.
  constraint campaign_recipients_token_hash_length_check check (octet_length(token_hash) = 32),
  constraint campaign_recipients_redeemed_at_check check ((redeemed_booking_id is not null) = (redeemed_at is not null))
);

create index campaign_recipients_business_id_idx on public.campaign_recipients (business_id);
create index campaign_recipients_campaign_id_idx on public.campaign_recipients (campaign_id);

create trigger set_updated_at
  before update on public.campaign_recipients
  for each row execute function private.set_updated_at();

alter table public.campaign_recipients enable row level security;

create policy "manage campaign_recipients" on public.campaign_recipients
  for all
  to authenticated
  using (private.has_perm(business_id, 'can_manage_all_bookings'))
  with check (private.has_perm(business_id, 'can_manage_all_bookings'));

grant select, insert, update, delete on public.campaign_recipients to authenticated;
-- Säkerhet S2: service_role skapar mottagarraderna (token-hash, en per vald
-- kund) och sätter sent_at/redeemed_booking_id/redeemed_at när utskicket går
-- respektive erbjudandet löses in.
grant select, insert, update, delete on public.campaign_recipients to service_role;
