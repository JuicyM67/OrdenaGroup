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

-- Säkerhet S5: en ägare som lägger till/ändrar en kund manuellt i appen kan
-- bara sätta samtycke med consent_channel = 'manual'. `web` och `whatsapp`
-- betyder att kunden själv gav samtycke via bokningssidan/WhatsApp-flödet,
-- och ska bara kunna sättas av servern (som verkligen körde det flödet),
-- inte av en ägare som redigerar en kundrad direkt.
alter table public.customers enable row level security;
create policy "owners full access" on public.customers
  for all
  to authenticated
  using (private.is_member(business_id, array['owner', 'admin']::public.member_role[]))
  with check (
    private.is_member(business_id, array['owner', 'admin']::public.member_role[])
    and (consent_channel is null or consent_channel = 'manual')
  );
grant select, insert, update, delete on public.customers to authenticated;
grant select, insert, update, delete on public.customers to service_role;
