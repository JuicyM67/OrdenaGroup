-- WP-01 · Kärnschema · Kunder
-- F#: F9 (kundregister och besökshistorik).
-- INV: INV-3, INV-4. Dataskydd (Ley 21.719, docs/legal/COMPLIANCE.md): samtycken
-- är alltid nullable utan default (aldrig förkryssat).

create table public.customers (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.businesses (id) on delete cascade,
  -- Nullable bara när anonymized_at är satt (WP-26 kan anonymisera utan ny migration).
  phone_e164 text,
  name text,
  email text,
  notes text,
  -- Samtycken: aldrig förkryssade. Ingen default på något av dessa fält.
  consent_terms_at timestamptz,
  consent_marketing_at timestamptz,
  consent_version text,
  consent_channel public.consent_channel,
  visits_count integer not null default 0,
  no_show_count integer not null default 0,
  last_visit_at timestamptz,
  anonymized_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (business_id, id),
  unique (business_id, phone_e164),
  constraint customers_phone_e164_format check (phone_e164 is null or phone_e164 ~ '^\+[1-9][0-9]{7,14}$'),
  constraint customers_phone_required_unless_anonymized check (phone_e164 is not null or anonymized_at is not null),
  constraint customers_name_required_unless_anonymized check (name is not null or anonymized_at is not null),
  constraint customers_email_format check (email is null or email ~ '^[^@[:space:]]+@[^@[:space:]]+\.[^@[:space:]]+$'),
  constraint customers_visits_count_check check (visits_count >= 0),
  constraint customers_no_show_count_check check (no_show_count >= 0),
  constraint customers_consent_requires_version_and_channel check (
    (consent_terms_at is null and consent_marketing_at is null)
    or (consent_version is not null and consent_channel is not null)
  )
);

create index customers_business_id_idx on public.customers (business_id);

create trigger set_updated_at
  before update on public.customers
  for each row execute function private.set_updated_at();

-- Säkerhet S5, rättad (granskningsfynd, blockerande): en tidigare version
-- lade consent_channel-villkoret i en enda `for all`-policy. Det gäller då
-- även UPDATE:s `with check`, som utvärderas mot HELA den nya raden — så
-- fort en kund redan hade consent_channel = 'web'/'whatsapp' (från det
-- publika bokningsflödet) kunde ägaren inte längre ändra ens `notes` eller
-- namnet, eftersom den oförändrade consent_channel-kolumnen i den nya raden
-- fortfarande var 'web' och stötte på samma villkor. Alla kunder med ett
-- riktigt samtycke (hela seeden) drabbades.
--
-- Lösning: RLS-policyerna nedan är bara tenant-isolering (is_member), en per
-- kommando. Reglerna för VILKA FÄLT som får ändras/sättas ligger i stället i
-- en trigger, som kan jämföra ny rad mot gammal rad (`is distinct from`) —
-- något en RLS-policy inte kan uttrycka (den ser antingen bara den nya raden
-- eller bara den gamla, aldrig båda samtidigt).
alter table public.customers enable row level security;

create policy "owners select" on public.customers
  for select
  to authenticated
  using (private.is_member(business_id, array['owner', 'admin']::public.member_role[]));

create policy "owners insert" on public.customers
  for insert
  to authenticated
  with check (private.is_member(business_id, array['owner', 'admin']::public.member_role[]));

create policy "owners update" on public.customers
  for update
  to authenticated
  using (private.is_member(business_id, array['owner', 'admin']::public.member_role[]))
  with check (private.is_member(business_id, array['owner', 'admin']::public.member_role[]));

create policy "owners delete" on public.customers
  for delete
  to authenticated
  using (private.is_member(business_id, array['owner', 'admin']::public.member_role[]));

grant select, insert, update, delete on public.customers to authenticated;
grant select, insert, update, delete on public.customers to service_role;

-- Trigger-versionen av S5. `security invoker` räcker (ingen förhöjd
-- rättighet behövs, funktionen bara jämför NEW/OLD och kastar fel) men
-- `search_path = ''` sätts ändå av princip. Gäller bara `authenticated`
-- (ägarens app) — `postgres`/`service_role` (servern, WP-25/WP-26) berörs
-- inte, eftersom de kör de riktiga web/whatsapp-samtyckesflödena.
create function private.customers_guard_consent()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $$
begin
  if current_user <> 'authenticated' then
    return new;
  end if;

  if tg_op = 'INSERT' then
    if new.consent_channel is not null and new.consent_channel <> 'manual' then
      raise exception 'authenticated kan bara sätta consent_channel = manual' using errcode = '42501';
    end if;
    return new;
  end if;

  -- UPDATE: bara bry sig om raden faktiskt försöker ändra ett samtyckesfält.
  -- Det vanliga fallet (ändra notes/namn/telefon utan att röra samtycket)
  -- ska aldrig nå längre än hit.
  if (new.consent_terms_at is distinct from old.consent_terms_at)
     or (new.consent_marketing_at is distinct from old.consent_marketing_at)
     or (new.consent_version is distinct from old.consent_version)
     or (new.consent_channel is distinct from old.consent_channel) then
    -- Tillåtet: ägaren sätter/ändrar samtycke via 'manual' (hon la in det själv).
    if new.consent_channel = 'manual' then
      return new;
    end if;
    -- Tillåtet: anonymisering nollar samtycket (WP-26), samtidigt som
    -- anonymized_at sätts.
    if new.anonymized_at is not null
       and new.consent_terms_at is null
       and new.consent_marketing_at is null
       and new.consent_version is null
       and new.consent_channel is null then
      return new;
    end if;
    raise exception 'authenticated kan bara ändra consent_* via consent_channel = manual eller vid anonymisering' using errcode = '42501';
  end if;

  return new;
end;
$$;

create trigger customers_guard_consent
  before insert or update on public.customers
  for each row execute function private.customers_guard_consent();
