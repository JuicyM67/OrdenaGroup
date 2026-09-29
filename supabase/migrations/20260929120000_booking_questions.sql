-- WP-40 · Steg 1 · Tjänstekategorier och bokningsfrågor
-- F#: bygger ut F1 (tjänster), F5 (bokningssidan), F6 (agenda).
-- INV: INV-3 (RLS på varje tabell, inga anon-policies), INV-4 (sammansatta FK, D-014).
-- Beslut: D-031 (docs/decisions/DECISIONS.md), plan docs/tasks/plans/WP-40-falt-kategorier.md.
--
-- search_path utökas till extensions för den här sessionen, se
-- 20260927100200_catalog_and_hours.sql (inte strikt nödvändigt här eftersom
-- den här migrationen inte skapar någon exclusion constraint, men följer
-- samma mönster för konsekvens).
set search_path = public, extensions;

-- service_categories ---------------------------------------------------
create table public.service_categories (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.businesses (id) on delete cascade,
  name text not null,
  sort integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (business_id, id),
  unique (business_id, name),
  constraint service_categories_name_not_blank check (char_length(btrim(name)) > 0)
);

create index service_categories_business_id_idx on public.service_categories (business_id);

create trigger set_updated_at
  before update on public.service_categories
  for each row execute function private.set_updated_at();

alter table public.service_categories enable row level security;
create policy "owners full access" on public.service_categories
  for all
  to authenticated
  using (private.is_member(business_id, array['owner', 'admin']::public.member_role[]))
  with check (private.is_member(business_id, array['owner', 'admin']::public.member_role[]));
grant select, insert, update, delete on public.service_categories to authenticated;
grant select, insert, update, delete on public.service_categories to service_role;

-- services.category_id ---------------------------------------------------
-- D-031: fritextkolumnen `services.category` migreras till rader i
-- `service_categories` och tas sedan bort. Ingen kod i src/ läser
-- `services.category` i dag (kontrollerat: bara `businesses.category`, ett
-- annat fält/en annan tabell — företagets bransch, oberört av den här
-- migrationen), så borttaget kräver ingen uppföljande ändring i
-- scheduling-/ui-lagren. `src/types/database.ts` regenereras i det sista
-- steget.
alter table public.services add column category_id uuid;

-- Datamigrering: en kategori-rad per unikt (business_id, fritextvärde) med
-- ett icke-tomt värde, sedan koppling av varje tjänst till sin nya rad.
-- Seed-datan (Barbería Norte) sätter aldrig `category` i dag, så det här är
-- en formalitet för verklig/framtida data, inte något som seed.sql behöver
-- ändra.
insert into public.service_categories (business_id, name)
select distinct s.business_id, btrim(s.category)
from public.services s
where s.category is not null and btrim(s.category) <> ''
on conflict (business_id, name) do nothing;

update public.services s
set category_id = c.id
from public.service_categories c
where c.business_id = s.business_id
  and c.name = btrim(s.category)
  and s.category is not null
  and btrim(s.category) <> '';

alter table public.services drop column category;

-- `on delete set null (category_id)` (kolumn-listform, PostgreSQL 15+) i
-- stället för ett bart `on delete set null`: en composite FK:s bara-`set
-- null` sätter ANDRA FK-kolumner till null också, inklusive `business_id` —
-- vilket bryter mot `business_id not null` så fort en kategori tas bort.
-- Kolumn-listan begränsar SET NULL till just `category_id`.
alter table public.services
  add constraint services_category_id_fkey
  foreign key (business_id, category_id) references public.service_categories (business_id, id)
  on delete set null (category_id);

create index services_category_id_idx on public.services (category_id);

-- Bokningsfrågor -----------------------------------------------------------
create type public.question_kind as enum (
  'short_text', 'long_text', 'single_choice', 'multi_choice', 'number', 'yes_no', 'date'
);
create type public.booking_question_applies_to as enum ('all', 'targets');

create table public.booking_questions (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.businesses (id) on delete cascade,
  label text not null,
  help text,
  kind public.question_kind not null,
  -- Krävs (icke-tom jsonb-array) för *_choice, annars null.
  options jsonb,
  required boolean not null default false,
  save_to_customer boolean not null default false,
  -- Branschförslagens nyckel (src/i18n/booking-question-presets.ts, ägs av
  -- copywriter-es-cl). Null för ägarens egna frågor. Ingen FK: presets finns
  -- bara i kod, inte i databasen (D-031).
  preset_key text,
  applies_to public.booking_question_applies_to not null default 'targets',
  active boolean not null default true,
  sort integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (business_id, id),
  constraint booking_questions_label_not_blank check (char_length(btrim(label)) > 0),
  constraint booking_questions_options_required_for_choice check (
    (kind in ('single_choice', 'multi_choice')) = (options is not null)
  ),
  constraint booking_questions_options_is_array check (
    options is null or jsonb_typeof(options) = 'array'
  ),
  constraint booking_questions_options_not_empty check (
    options is null or jsonb_array_length(options) > 0
  )
);

create index booking_questions_business_id_idx on public.booking_questions (business_id);

create trigger set_updated_at
  before update on public.booking_questions
  for each row execute function private.set_updated_at();

alter table public.booking_questions enable row level security;
create policy "owners full access" on public.booking_questions
  for all
  to authenticated
  using (private.is_member(business_id, array['owner', 'admin']::public.member_role[]))
  with check (private.is_member(business_id, array['owner', 'admin']::public.member_role[]));
grant select, insert, update, delete on public.booking_questions to authenticated;
-- Säkerhet S2: den publika bokningssidan läser frågor via servern med
-- service_role och ett explicit business_id/service_id-filter (D-014,
-- ARCHITECTURE.md princip 3), aldrig via en anon-policy.
grant select, insert, update, delete on public.booking_questions to service_role;

-- booking_question_targets ------------------------------------------------
-- Ett mål per rad: antingen en tjänst ELLER en kategori, aldrig båda/ingen.
-- Ett kategori-mål gäller automatiskt även nya tjänster som senare läggs i
-- kategorin (upplöses av servern vid läsning, ingen kopiering av rader) —
-- se plan §4 steg 3.
create table public.booking_question_targets (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.businesses (id) on delete cascade,
  question_id uuid not null,
  service_id uuid,
  category_id uuid,
  created_at timestamptz not null default now(),
  foreign key (business_id, question_id) references public.booking_questions (business_id, id) on delete cascade,
  foreign key (business_id, service_id) references public.services (business_id, id) on delete cascade,
  foreign key (business_id, category_id) references public.service_categories (business_id, id) on delete cascade,
  constraint booking_question_targets_exactly_one check (
    (case when service_id is not null then 1 else 0 end)
    + (case when category_id is not null then 1 else 0 end) = 1
  )
);

create index booking_question_targets_business_id_idx on public.booking_question_targets (business_id);
create index booking_question_targets_question_id_idx on public.booking_question_targets (question_id);
-- Samma tjänst/kategori kan inte målas två gånger av samma fråga.
create unique index booking_question_targets_question_service_uidx
  on public.booking_question_targets (question_id, service_id) where service_id is not null;
create unique index booking_question_targets_question_category_uidx
  on public.booking_question_targets (question_id, category_id) where category_id is not null;

alter table public.booking_question_targets enable row level security;
create policy "owners full access" on public.booking_question_targets
  for all
  to authenticated
  using (private.is_member(business_id, array['owner', 'admin']::public.member_role[]))
  with check (private.is_member(business_id, array['owner', 'admin']::public.member_role[]));
grant select, insert, update, delete on public.booking_question_targets to authenticated;
grant select, insert, update, delete on public.booking_question_targets to service_role;

-- booking_answers -----------------------------------------------------------
-- Snapshot av etikett/typ så att svaret går att läsa även om frågan senare
-- ändras eller tas bort (`question_id` sätts till null).
--
-- Avvikelse från DATA_MODEL.md-utkastet/planen: `primary key (booking_id,
-- question_id)` går inte ihop med "`question_id` null on delete set null" —
-- en primärnyckelkolumn är alltid implicit NOT NULL i Postgres, så ett
-- `on delete set null` mot en PK-kolumn hade gjort borttaget av frågan
-- misslyckas (not-null-brott) i stället för att bevara svaret, precis tvärt
-- emot syftet. Lösning: surrogat-PK (`id`) + ett partiellt unikt index som
-- ger samma "högst ett svar per fråga och bokning"-regel MEN bara medan
-- `question_id` fortfarande pekar på en levande fråga; flera bevarade svar
-- med `question_id = null` för samma bokning är tillåtna (de är redan
-- åtskilda via sina egna snapshottar).
--
-- Samma kolumn-listform som på `services.category_id` ovan
-- (`on delete set null (question_id)`, inte ett bart `on delete set null`):
-- annars skulle Postgres sätta HELA FK-kolumnuppsättningen till null,
-- inklusive `business_id`, och krascha mot `business_id not null`.
create table public.booking_answers (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.businesses (id) on delete cascade,
  booking_id uuid not null,
  question_id uuid,
  label_snapshot text not null,
  kind_snapshot public.question_kind not null,
  value jsonb not null,
  created_at timestamptz not null default now(),
  foreign key (business_id, booking_id) references public.bookings (business_id, id) on delete cascade,
  foreign key (business_id, question_id) references public.booking_questions (business_id, id) on delete set null (question_id),
  constraint booking_answers_label_snapshot_not_blank check (char_length(btrim(label_snapshot)) > 0)
);

create index booking_answers_business_id_idx on public.booking_answers (business_id);
create index booking_answers_booking_id_idx on public.booking_answers (booking_id);
create unique index booking_answers_booking_question_uidx
  on public.booking_answers (booking_id, question_id) where question_id is not null;

alter table public.booking_answers enable row level security;
-- Plan §4 steg 1: select för medlemmar, skrivs av service_role (bokningsflödet,
-- createBooking i samma transaktion som bokningen) och ägaren (kundkortets
-- historik/manuell rättelse). "Medlemmar" begränsas här till samma
-- owner/admin-nivå som `bookings`/`customers`/`message_outbox` — WP-01:s
-- fas 1 ger ännu ingen roll `staff` åtkomst till någon katalog- eller
-- bokningstabell (se kommentaren i 20260927100200_catalog_and_hours.sql);
-- den utökningen hör till WP:t som bygger profesionalens egen inloggning/
-- agenda (F6), inte till den här migrationen.
create policy "owners full access" on public.booking_answers
  for all
  to authenticated
  using (private.is_member(business_id, array['owner', 'admin']::public.member_role[]))
  with check (private.is_member(business_id, array['owner', 'admin']::public.member_role[]));
grant select, insert, update, delete on public.booking_answers to authenticated;
grant select, insert, update, delete on public.booking_answers to service_role;

-- customer_answers -----------------------------------------------------------
-- Senaste värde per fråga och kund, bara för frågor med `save_to_customer`.
-- Ingen snapshot här (till skillnad från booking_answers): om frågan tas
-- bort försvinner det sparade värdet med den (cascade) — det är en bekvämlig-
-- hetskopia för att förifylla nästa bokning, inte en historik.
create table public.customer_answers (
  business_id uuid not null references public.businesses (id) on delete cascade,
  customer_id uuid not null,
  question_id uuid not null,
  value jsonb not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (customer_id, question_id),
  foreign key (business_id, customer_id) references public.customers (business_id, id) on delete cascade,
  foreign key (business_id, question_id) references public.booking_questions (business_id, id) on delete cascade
);

create index customer_answers_business_id_idx on public.customer_answers (business_id);

create trigger set_updated_at
  before update on public.customer_answers
  for each row execute function private.set_updated_at();

alter table public.customer_answers enable row level security;
create policy "owners full access" on public.customer_answers
  for all
  to authenticated
  using (private.is_member(business_id, array['owner', 'admin']::public.member_role[]))
  with check (private.is_member(business_id, array['owner', 'admin']::public.member_role[]));
grant select, insert, update, delete on public.customer_answers to authenticated;
grant select, insert, update, delete on public.customer_answers to service_role;
