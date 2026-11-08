-- WP-88 (D-074) · Ficha de atención + consentimiento informado
-- INV: INV-3 (RLS på varje tabell, inga anon-policies), INV-4 (tenant-isolering,
-- sammansatta FK, D-014). Ley 21.719: fichans innehåll kan vara uppgifter om
-- hälsa (känsliga personuppgifter) — därför en egen behörighet
-- (`can_view_records`), inga breda SELECT-policyer för personal, och
-- anonymisering raderar innehållet.
--
-- Innehåll:
--   1. consent_kind += 'informed' (används bara som text i den här filen: ett
--      nytt enum-värde får inte användas i samma transaktion som det läggs till).
--   2. Behörigheten `can_view_records` på memberships/member_invitations,
--      `private.has_perm` och `accept_invitation` uppdaterade.
--   3. Planfunktionen `records` (Emprende och uppåt), speglar src/config/plans.ts.
--   4. `businesses.record_fields`: vilka fasta fält fichan visar.
--   5. consent_templates + consent_template_versions (oföränderliga versioner,
--      version = sha256 av titel + text) + service_consent_templates.
--   6. customer_records (fasta fält per kund) + customer_record_entries
--      (daterade anteckningar, ev. kopplade till en bokning).
--   7. consent_events: kolumner för mall, bokning och källa; läsbar för
--      `can_view_records` (bara consentimiento informado).
--   8. consent_signing_links: engångslänk för att signera i salongen (bara
--      hash av token sparas, som bookings.manage_token_hash/D-029).
--   9. Anonymisering av en kund raderar fichan (trigger, gäller både
--      anonymizeCustomer och private.run_retention).

-- 1. consent_kind ---------------------------------------------------------------
alter type public.consent_kind add value if not exists 'informed';

-- 2. Behörigheten can_view_records ------------------------------------------------
-- Standard `false` (minsta privilegium): ägaren slår på den per person i
-- Ajustes → Equipo. Ägaren har den alltid (`has_perm` kortsluter).
alter table public.memberships
  add column can_view_records boolean not null default false;
alter table public.member_invitations
  add column can_view_records boolean not null default false;

grant update (can_view_records) on public.memberships to authenticated;

create or replace function private.has_perm(b uuid, perm text)
returns boolean
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  m record;
begin
  if perm not in (
    'can_manage_own_bookings', 'can_manage_all_bookings', 'can_cancel_bookings',
    'can_edit_catalog', 'can_manage_team', 'can_view_reports', 'can_edit_settings',
    'can_view_records'
  ) then
    raise exception 'private.has_perm: perm desconocido %', perm;
  end if;

  select role, can_manage_own_bookings, can_manage_all_bookings, can_cancel_bookings,
         can_edit_catalog, can_manage_team, can_view_reports, can_edit_settings,
         can_view_records
    into m
    from public.memberships
   where business_id = b
     and user_id = (select auth.uid());

  if not found then
    return false;
  end if;

  if m.role = 'owner' then
    return true;
  end if;

  if m.role <> 'staff' then
    return false;
  end if;

  return case perm
    when 'can_manage_own_bookings' then m.can_manage_own_bookings
    when 'can_manage_all_bookings' then m.can_manage_all_bookings
    when 'can_cancel_bookings' then m.can_cancel_bookings
    when 'can_edit_catalog' then m.can_edit_catalog
    when 'can_manage_team' then m.can_manage_team
    when 'can_view_reports' then m.can_view_reports
    when 'can_edit_settings' then m.can_edit_settings
    when 'can_view_records' then m.can_view_records
  end case;
end;
$$;

-- Samma som 20261011040100_plan_custom_limits.sql, plus `can_view_records`.
create or replace function public.accept_invitation(token text)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user uuid := (select auth.uid());
  v_user_email text;
  v_hash bytea;
  v_inv public.member_invitations%rowtype;
  v_limit integer;
begin
  if v_user is null then
    raise exception 'Se requiere autenticación' using errcode = '42501';
  end if;

  if token is null or btrim(token) = '' then
    raise exception 'Invitación inválida' using errcode = 'P0002';
  end if;

  v_hash := extensions.digest(token, 'sha256');

  select *
    into v_inv
    from public.member_invitations
   where token_hash = v_hash
   for update;

  if not found then
    raise exception 'Invitación inválida' using errcode = 'P0002';
  end if;

  if v_inv.revoked_at is not null then
    raise exception 'Esta invitación fue revocada' using errcode = 'P0001';
  end if;

  if v_inv.accepted_at is not null then
    raise exception 'Esta invitación ya fue utilizada' using errcode = 'P0001';
  end if;

  if v_inv.expires_at <= now() then
    raise exception 'Esta invitación expiró' using errcode = 'P0001';
  end if;

  select u.email into v_user_email from auth.users u where u.id = v_user;

  if v_user_email is null or lower(v_user_email) <> lower(v_inv.email) then
    raise exception 'Esta invitación es para otro correo electrónico' using errcode = '42501';
  end if;

  perform 1 from public.businesses where id = v_inv.business_id for update;
  v_limit := private.business_staff_limit(v_inv.business_id);
  if v_limit is not null and private.staff_seat_count(v_inv.business_id) >= v_limit then
    raise exception 'El plan actual no permite más cuentas de personal' using errcode = '42501';
  end if;

  insert into public.memberships (
    business_id, user_id, role, staff_id,
    can_manage_own_bookings, can_manage_all_bookings, can_cancel_bookings,
    can_edit_catalog, can_manage_team, can_view_reports, can_edit_settings,
    can_view_records
  ) values (
    v_inv.business_id, v_user, 'staff', v_inv.staff_id,
    v_inv.can_manage_own_bookings, v_inv.can_manage_all_bookings, v_inv.can_cancel_bookings,
    v_inv.can_edit_catalog, v_inv.can_manage_team, v_inv.can_view_reports, v_inv.can_edit_settings,
    v_inv.can_view_records
  );

  update public.member_invitations set accepted_at = now() where id = v_inv.id;

  return v_inv.business_id;
end;
$$;

-- 3. Planfunktionen `records` -------------------------------------------------------
-- Speglar `src/config/plans.ts` (ändra BÅDA).
create or replace function private.plan_has_feature(p_plan text, p_feature text)
returns boolean
language sql
immutable
set search_path = ''
as $$
  select case
    when p_feature in ('unbranded', 'online_payment', 'waitlist', 'records')
      then p_plan in ('emprende', 'equipo', 'local', 'custom')
    when p_feature in ('flash', 'campaigns', 'full_reports', 'staff_accounts', 'offers')
      then p_plan in ('equipo', 'local', 'custom')
    when p_feature = 'priority_support'
      then p_plan in ('local', 'custom')
    else false
  end;
$$;

-- 4. businesses.record_fields ------------------------------------------------------
-- Vilka fasta fält fichan visar (ägaren väljer i Ajustes → Ficha). Interna
-- nycklar, texterna finns i src/i18n/es-CL.ficha.ts.
create function private.record_fields_valid(f text[])
returns boolean
language sql
immutable
set search_path = ''
as $$
  select f <@ array['allergies', 'contraindications', 'observations']::text[]
     and cardinality(f) = cardinality(array(select distinct unnest(f)));
$$;

revoke all on function private.record_fields_valid(text[]) from public;
grant execute on function private.record_fields_valid(text[]) to authenticated, service_role;

alter table public.businesses
  add column record_fields text[] not null default '{}'::text[],
  add constraint businesses_record_fields_check check (private.record_fields_valid(record_fields));

-- Samma B2-mönster som övriga inställningar: kolumngrant + policyn "owners
-- update" (can_edit_settings, 20260930170000_permission_rls_gaps.sql).
grant update (record_fields) on public.businesses to authenticated;

-- 5. Consentimiento informado: mallar, versioner, koppling till tjänster ----------
create table public.consent_templates (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.businesses (id) on delete cascade,
  title text not null,
  body text not null,
  active boolean not null default true,
  -- sha256 (hex) av titel + "\n\n" + text. Sätts ALLTID av triggern nedan,
  -- aldrig av klienten (ingen kolumngrant).
  version text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (business_id, id),
  constraint consent_templates_title_check check (char_length(btrim(title)) between 1 and 120),
  constraint consent_templates_body_check check (char_length(btrim(body)) between 1 and 20000)
);

create index consent_templates_business_id_idx
  on public.consent_templates (business_id, created_at);

-- Varje text som någonsin funnits, oföränderlig: det kunden godkände går
-- alltid att visa (version = hashen i consent_events.version).
create table public.consent_template_versions (
  business_id uuid not null references public.businesses (id) on delete cascade,
  template_id uuid not null,
  version text not null,
  title text not null,
  body text not null,
  created_at timestamptz not null default now(),
  primary key (business_id, template_id, version),
  foreign key (business_id, template_id)
    references public.consent_templates (business_id, id) on delete cascade
);

create function private.consent_templates_set_version()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  new.title := btrim(new.title);
  new.body := btrim(new.body);
  new.version := encode(
    extensions.digest(new.title || E'\n\n' || new.body, 'sha256'),
    'hex'
  );
  if tg_op = 'UPDATE' then
    new.updated_at := now();
    -- Mallen byter aldrig företag.
    new.business_id := old.business_id;
  end if;
  return new;
end;
$$;

create function private.consent_templates_store_version()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.consent_template_versions (business_id, template_id, version, title, body)
  values (new.business_id, new.id, new.version, new.title, new.body)
  on conflict (business_id, template_id, version) do nothing;
  return null;
end;
$$;

revoke all on function private.consent_templates_set_version() from public;
revoke all on function private.consent_templates_store_version() from public;

create trigger consent_templates_set_version
  before insert or update on public.consent_templates
  for each row execute function private.consent_templates_set_version();

create trigger consent_templates_store_version
  after insert or update of title, body on public.consent_templates
  for each row execute function private.consent_templates_store_version();

create table public.service_consent_templates (
  business_id uuid not null references public.businesses (id) on delete cascade,
  service_id uuid not null,
  template_id uuid not null,
  created_at timestamptz not null default now(),
  primary key (business_id, service_id, template_id),
  foreign key (business_id, service_id)
    references public.services (business_id, id) on delete cascade,
  foreign key (business_id, template_id)
    references public.consent_templates (business_id, id) on delete cascade
);

create index service_consent_templates_template_idx
  on public.service_consent_templates (business_id, template_id);

alter table public.consent_templates enable row level security;
alter table public.consent_template_versions enable row level security;
alter table public.service_consent_templates enable row level security;

-- Mallarna är företagets egna texter (kunden ser dem på bokningssidan), så
-- all personal får läsa dem. Bara den som får ändra inställningar skriver,
-- och bara med planfunktionen.
create policy "read consent_templates" on public.consent_templates
  for select to authenticated
  using (private.is_member(business_id, array['owner', 'staff']::public.member_role[]));

create policy "insert consent_templates" on public.consent_templates
  for insert to authenticated
  with check (
    private.has_perm(business_id, 'can_edit_settings')
    and private.business_has_feature(business_id, 'records')
  );

create policy "update consent_templates" on public.consent_templates
  for update to authenticated
  using (private.has_perm(business_id, 'can_edit_settings'))
  with check (
    private.has_perm(business_id, 'can_edit_settings')
    and private.business_has_feature(business_id, 'records')
  );

create policy "read consent_template_versions" on public.consent_template_versions
  for select to authenticated
  using (private.is_member(business_id, array['owner', 'staff']::public.member_role[]));

create policy "read service_consent_templates" on public.service_consent_templates
  for select to authenticated
  using (private.is_member(business_id, array['owner', 'staff']::public.member_role[]));

create policy "insert service_consent_templates" on public.service_consent_templates
  for insert to authenticated
  with check (
    private.has_perm(business_id, 'can_edit_settings')
    and private.business_has_feature(business_id, 'records')
  );

create policy "delete service_consent_templates" on public.service_consent_templates
  for delete to authenticated
  using (private.has_perm(business_id, 'can_edit_settings'));

-- Ingen DELETE på mallar: en mall som kunder godkänt ska finnas kvar
-- (arkiveras med `active = false`).
grant select on public.consent_templates to authenticated;
grant insert (id, business_id, title, body, active) on public.consent_templates to authenticated;
grant update (title, body, active) on public.consent_templates to authenticated;
grant select on public.consent_template_versions to authenticated;
grant select, insert, delete on public.service_consent_templates to authenticated;

-- service_role (bokningssidan, kundens länk, export): bara läsning. Samma
-- gotcha som consent_events: plattformens standardprivilegier ger annars
-- service_role full CRUD på nya tabeller.
revoke all on public.consent_templates from service_role;
revoke all on public.consent_template_versions from service_role;
revoke all on public.service_consent_templates from service_role;
grant select on public.consent_templates to service_role;
grant select on public.consent_template_versions to service_role;
grant select on public.service_consent_templates to service_role;

-- 6. Fichan ---------------------------------------------------------------------------
create table public.customer_records (
  business_id uuid not null references public.businesses (id) on delete cascade,
  customer_id uuid not null,
  allergies text,
  contraindications text,
  observations text,
  updated_at timestamptz not null default now(),
  updated_by uuid references auth.users (id) on delete set null,
  primary key (business_id, customer_id),
  foreign key (business_id, customer_id)
    references public.customers (business_id, id) on delete cascade,
  constraint customer_records_allergies_length check (char_length(allergies) <= 1000),
  constraint customer_records_contraindications_length check (char_length(contraindications) <= 1000),
  constraint customer_records_observations_length check (char_length(observations) <= 1000)
);

create table public.customer_record_entries (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.businesses (id) on delete cascade,
  customer_id uuid not null,
  booking_id uuid,
  body text not null,
  author_user_id uuid references auth.users (id) on delete set null,
  -- Personalraden som skrev (för namnet i fichan); null för ägare utan personalrad.
  author_staff_id uuid,
  created_at timestamptz not null default now(),
  unique (business_id, id),
  foreign key (business_id, customer_id)
    references public.customers (business_id, id) on delete cascade,
  foreign key (business_id, booking_id)
    references public.bookings (business_id, id) on delete set null (booking_id),
  foreign key (business_id, author_staff_id)
    references public.staff (business_id, id) on delete set null (author_staff_id),
  constraint customer_record_entries_body_check check (char_length(btrim(body)) between 1 and 4000)
);

create index customer_record_entries_customer_idx
  on public.customer_record_entries (business_id, customer_id, created_at desc);

-- En anteckning kopplad till en bokning måste gälla samma kund.
create function private.customer_record_entries_check_booking()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if new.booking_id is not null and not exists (
    select 1 from public.bookings bk
     where bk.business_id = new.business_id
       and bk.id = new.booking_id
       and bk.customer_id = new.customer_id
  ) then
    raise exception 'La reserva no corresponde a este cliente' using errcode = '23514';
  end if;
  return new;
end;
$$;

revoke all on function private.customer_record_entries_check_booking() from public;

create trigger customer_record_entries_check_booking
  before insert on public.customer_record_entries
  for each row execute function private.customer_record_entries_check_booking();

alter table public.customer_records enable row level security;
alter table public.customer_record_entries enable row level security;

-- Bara ägaren och personal med `can_view_records` läser eller skriver.
-- Skrivning kräver dessutom planfunktionen; läsning gör det inte (en
-- nedgradering raderar aldrig data, D-048 — UI:t visar uppgraderingsrutan).
create policy "read customer_records" on public.customer_records
  for select to authenticated
  using (private.has_perm(business_id, 'can_view_records'));

create policy "insert customer_records" on public.customer_records
  for insert to authenticated
  with check (
    private.has_perm(business_id, 'can_view_records')
    and private.business_has_feature(business_id, 'records')
    and updated_by = (select auth.uid())
  );

create policy "update customer_records" on public.customer_records
  for update to authenticated
  using (private.has_perm(business_id, 'can_view_records'))
  with check (
    private.has_perm(business_id, 'can_view_records')
    and private.business_has_feature(business_id, 'records')
    and updated_by = (select auth.uid())
  );

create policy "read customer_record_entries" on public.customer_record_entries
  for select to authenticated
  using (private.has_perm(business_id, 'can_view_records'));

create policy "insert customer_record_entries" on public.customer_record_entries
  for insert to authenticated
  with check (
    private.has_perm(business_id, 'can_view_records')
    and private.business_has_feature(business_id, 'records')
    and author_user_id = (select auth.uid())
    and author_staff_id is not distinct from private.member_staff_id(business_id)
  );

-- Den som skrev anteckningen, eller ägaren, kan ta bort den.
create policy "delete customer_record_entries" on public.customer_record_entries
  for delete to authenticated
  using (
    private.has_perm(business_id, 'can_view_records')
    and (
      author_user_id = (select auth.uid())
      or private.is_member(business_id, array['owner']::public.member_role[])
    )
  );

grant select on public.customer_records to authenticated;
grant insert (business_id, customer_id, allergies, contraindications, observations, updated_at, updated_by)
  on public.customer_records to authenticated;
grant update (allergies, contraindications, observations, updated_at, updated_by)
  on public.customer_records to authenticated;
grant select, delete on public.customer_record_entries to authenticated;
grant insert (id, business_id, customer_id, booking_id, body, author_user_id, author_staff_id)
  on public.customer_record_entries to authenticated;

-- service_role: bara läsning (export). Radering sker via triggern nedan och
-- via kaskad när företaget raderas.
revoke all on public.customer_records from service_role;
revoke all on public.customer_record_entries from service_role;
grant select on public.customer_records to service_role;
grant select on public.customer_record_entries to service_role;

-- 7. consent_events: consentimiento informado --------------------------------------
alter table public.consent_events
  add column consent_template_id uuid,
  add column booking_id uuid,
  -- Var kunden godkände: i bokningen på /[slug], på sin länk /r/[token] eller
  -- på en engångslänk i salongen. Satt endast för consentimiento informado.
  add column source text,
  add constraint consent_events_template_fk foreign key (business_id, consent_template_id)
    references public.consent_templates (business_id, id) on delete set null (consent_template_id),
  add constraint consent_events_booking_fk foreign key (business_id, booking_id)
    references public.bookings (business_id, id) on delete set null (booking_id),
  add constraint consent_events_source_check check (
    source is null or source in ('booking', 'manage_link', 'in_person')
  ),
  add constraint consent_events_informed_source_check check (
    (kind::text = 'informed') = (source is not null)
  ),
  drop constraint consent_events_subject_kind_check,
  add constraint consent_events_subject_kind_check check (
    (subject = 'customer' and kind::text in ('terms', 'marketing', 'waitlist', 'whatsapp', 'informed'))
    or (subject = 'owner' and kind::text in ('owner_terms', 'dpa'))
  );

create index consent_events_informed_idx
  on public.consent_events (business_id, customer_id, consent_template_id)
  where source is not null;

create index consent_events_booking_idx
  on public.consent_events (business_id, booking_id)
  where booking_id is not null;

-- Personal med `can_view_records` ser vilka consentimientos kunden godkänt
-- (men inte övriga samtycken, som fortfarande bara ägaren läser).
create policy "records select informed" on public.consent_events
  for select to authenticated
  using (source is not null and private.has_perm(business_id, 'can_view_records'));

-- 8. Engångslänk för att signera i salongen ----------------------------------------
-- Personalen skapar den från fichan, kunden öppnar den (på salongens eller
-- sin egen enhet) och godkänner. Bara servern (service_role) läser och
-- skriver; ingen grant till authenticated.
create table public.consent_signing_links (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.businesses (id) on delete cascade,
  customer_id uuid not null,
  template_id uuid not null,
  booking_id uuid,
  token_hash bytea not null unique,
  created_by uuid references auth.users (id) on delete set null,
  expires_at timestamptz not null,
  used_at timestamptz,
  created_at timestamptz not null default now(),
  foreign key (business_id, customer_id)
    references public.customers (business_id, id) on delete cascade,
  foreign key (business_id, template_id)
    references public.consent_templates (business_id, id) on delete cascade,
  foreign key (business_id, booking_id)
    references public.bookings (business_id, id) on delete set null (booking_id)
);

create index consent_signing_links_customer_idx
  on public.consent_signing_links (business_id, customer_id);

alter table public.consent_signing_links enable row level security;

revoke all on public.consent_signing_links from service_role;
grant select, insert on public.consent_signing_links to service_role;
grant update (used_at) on public.consent_signing_links to service_role;

-- 9. Anonymisering raderar fichan ----------------------------------------------------
-- Gäller både anonymizeCustomer (src/server/privacy/customer.ts) och
-- private.run_retention, som båda sätter `anonymized_at`. Samtyckesloggen
-- behålls frikopplad (customer_id = null) som förut.
create function private.customers_purge_records()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if new.anonymized_at is not null and old.anonymized_at is null then
    delete from public.customer_record_entries
     where business_id = new.business_id and customer_id = new.id;
    delete from public.customer_records
     where business_id = new.business_id and customer_id = new.id;
    delete from public.consent_signing_links
     where business_id = new.business_id and customer_id = new.id;
  end if;
  return null;
end;
$$;

revoke all on function private.customers_purge_records() from public;

create trigger customers_purge_records
  after update of anonymized_at on public.customers
  for each row execute function private.customers_purge_records();
