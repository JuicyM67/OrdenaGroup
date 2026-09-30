-- WP-26 · Steg 1 · Samtyckeslogg
-- F#: F12 (dataskydd: samtycke, export, radering, Ley 21.719).
-- INV: INV-3 (RLS på varje tabell, inga anon-policies), INV-4 (tenant-isolering,
-- sammansatt FK, D-014).
--
-- `customers.consent_*` (en kolumn per typ, skrivs över vid varje nytt
-- samtycke) behålls som cache för snabb läsning, men bevisar inte HISTORIK.
-- `consent_events` är en append-only logg: en rad per samtyckeshändelse
-- (kund ELLER ägare), aldrig uppdaterad förutom att `customer_id` nollas när
-- kunden anonymiseras (WP-26 steg 2) — samtyckesloggen behålls då utan
-- koppling till kunden (D-033-förslaget, ägarens svar 2026-09-30: 5 år).
--
-- Skrivning bara via servern (service_role): `authenticated` (ägaren) läser
-- bara sitt eget företags rader, ingen insert/update/delete — precis som
-- `message_outbox` (D-019).
create type public.consent_subject as enum ('customer', 'owner');
create type public.consent_kind as enum ('terms', 'marketing', 'waitlist', 'owner_terms', 'dpa');

create table public.consent_events (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.businesses (id) on delete cascade,
  -- Null från början för subject = 'owner' (inget kund-samtycke), och nollas
  -- av anonymizeCustomer (WP-26 steg 2) för subject = 'customer'.
  customer_id uuid,
  subject public.consent_subject not null,
  kind public.consent_kind not null,
  version text not null,
  -- Återanvänder public.consent_channel (web/whatsapp/manual, se
  -- 20260927100000_core_foundation.sql) — samma betydelse: hur samtycket togs
  -- emot, oavsett om det är kundens eller ägarens (onboarding räknas som
  -- 'web').
  channel public.consent_channel not null,
  granted boolean not null,
  created_at timestamptz not null default now(),
  -- D-014: sammansatt FK. `on delete set null (customer_id)` (kolumn-
  -- listform, samma mönster som booking_answers.question_id): om en kundrad
  -- någon gång RADERAS (inte bara anonymiseras) ska loggraden ändå bestå,
  -- utan koppling. Ingen effekt i normalfallet, eftersom D-033 anonymiserar
  -- i stället för att radera.
  foreign key (business_id, customer_id) references public.customers (business_id, id) on delete set null (customer_id),
  constraint consent_events_version_not_blank check (char_length(btrim(version)) > 0),
  -- En kundtyp hör bara till kund-samtycken, en ägartyp bara till
  -- ägar-samtycken (onboardingens villkorsruta, DPA).
  constraint consent_events_subject_kind_check check (
    (subject = 'customer' and kind in ('terms', 'marketing', 'waitlist'))
    or (subject = 'owner' and kind in ('owner_terms', 'dpa'))
  ),
  constraint consent_events_customer_id_requires_customer_subject check (
    customer_id is null or subject = 'customer'
  )
);

create index consent_events_business_id_idx on public.consent_events (business_id);
create index consent_events_customer_id_idx on public.consent_events (customer_id) where customer_id is not null;

alter table public.consent_events enable row level security;

create policy "owners select" on public.consent_events
  for select
  to authenticated
  using (private.is_member(business_id, array['owner', 'admin']::public.member_role[]));

grant select on public.consent_events to authenticated;

-- Säkerhet S2/D-019: bara service_role skriver. Append-only: `insert` för nya
-- händelser, och en kolumnbegränsad `update` för ENDAST `customer_id` (bara
-- anonymizeCustomer/run_retention nollar den) — aldrig `delete`, aldrig andra
-- kolumner (försvar på djupet, samma mönster som B2 på `businesses`).
--
-- Samma gotcha som D-014-korrigendumet i DATA_MODEL.md, men för service_role
-- i stället för anon/authenticated: den lokala plattformens defaultprivilegier
-- ger `service_role` FULLT CRUD på en NY tabell automatiskt (bara anon/
-- authenticated revokas globalt i 20260927100000_core_foundation.sql — verifierat
-- direkt mot den lokala databasen: `payments` har av samma anledning redan
-- `delete` för service_role i dag, trots kommentaren i bookings_payments.sql om
-- att kassahistorik aldrig ska kunna försvinna; ett separat, tidigare fynd,
-- utanför den här migrationens ändringar). Ett explicit `revoke all` krävs
-- alltså HÄR, tabell för tabell, för att append-only faktiskt ska gälla för
-- consent_events.
revoke all on public.consent_events from service_role;
grant select, insert on public.consent_events to service_role;
grant update (customer_id) on public.consent_events to service_role;

-- Backfill från customers.consent_* (en rad per satt samtyckesfält). Körs som
-- postgres (migrationens ägarroll), förbigår RLS. `created_at` sätts till
-- själva samtyckestidpunkten (inte "nu"), så historiken blir korrekt.
insert into public.consent_events (business_id, customer_id, subject, kind, version, channel, granted, created_at)
select business_id, id, 'customer', 'terms', consent_version, consent_channel, true, consent_terms_at
  from public.customers
 where consent_terms_at is not null;

insert into public.consent_events (business_id, customer_id, subject, kind, version, channel, granted, created_at)
select business_id, id, 'customer', 'marketing', consent_version, consent_channel, true, consent_marketing_at
  from public.customers
 where consent_marketing_at is not null;
