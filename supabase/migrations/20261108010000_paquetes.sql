-- WP-86 (D-072) · Paquetes: förbetalda paket med N sessioner.
--
-- Ägaren skapar paketmallar ("10 sesiones de kinesiología"), säljer ett paket
-- till en kund i salongen (efectivo/transferencia/tarjeta, ingen
-- onlinebetalning) och drar en session när en bokning som paketet täcker
-- markeras som utförd/betald ("Usar paquete"). Sessionsrörelserna är en
-- append-only ledger; kvarvarande sessioner = sessions_total + summan av delta.
--
-- INV-3: RLS på alla nya tabeller, inga anon-grants (default privileges i
-- 20260927100000 tar redan bort dem; grants nedan är explicita).
-- INV-4 (D-014): `business_id` på varje tabell, sammansatta FK:er
-- (business_id, id) så att en rad aldrig kan peka på ett annat företags kund,
-- tjänst, bokning eller paket.
--
-- Databasen har sista ordet (hård regel 2): försäljningen kopierar namn,
-- sessioner, pris, giltighet och tjänster från mallen i en trigger (klientens
-- värden ignoreras); inlösen kontrolleras under lås (rätt kund, tjänsten
-- ingår, sessioner kvar, inte förfallet, inte redan betald/inlöst).
--
-- Planspärr: att skapa mallar och sälja kräver en betald plan (`packages` i
-- src/config/plans.ts: emprende, equipo, local, custom). Inlösen och
-- visning spärras aldrig — kunden har redan betalat. Spärren gäller rollen
-- `authenticated` (samma modell som 20261011070000_plan_db_guards.sql);
-- service_role/postgres är betrodda. Egen funktion i stället för
-- `private.plan_has_feature` så att två parallella migrationer inte skriver
-- över varandras `create or replace` av den.
set search_path = public, extensions;

-- ---------------------------------------------------------------------------
-- Planspärren (speglar `packages` i src/config/plans.ts — ändra båda)
-- ---------------------------------------------------------------------------
create function private.business_has_packages(b uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select coalesce(
    (select bz.plan::text in ('emprende', 'equipo', 'local', 'custom')
       from public.businesses bz where bz.id = b),
    false
  );
$$;

revoke all on function private.business_has_packages(uuid) from public;
grant execute on function private.business_has_packages(uuid) to authenticated, service_role;

-- ---------------------------------------------------------------------------
-- package_templates: ägarens paketmallar (katalog, `can_edit_catalog`)
-- ---------------------------------------------------------------------------
create table public.package_templates (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.businesses (id) on delete cascade,
  name text not null
    check (char_length(btrim(name)) between 1 and 80),
  sessions integer not null
    check (sessions between 1 and 100),
  price_clp integer not null
    check (price_clp between 1 and 100000000),
  -- `null` = vence aldrig. Räknas i hela dagar från försäljningsdagen.
  validity_days integer
    check (validity_days is null or validity_days between 1 and 1095),
  -- Visas som "Disponible en pack…" på bokningssidan.
  show_public boolean not null default false,
  active boolean not null default true,
  sort integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (business_id, id)
);

create index package_templates_business_id_idx on public.package_templates (business_id);

create trigger set_updated_at
  before update on public.package_templates
  for each row execute function private.set_updated_at();

create function private.package_templates_guard_plan()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if coalesce(current_setting('role', true), '') = 'authenticated'
     and not private.business_has_packages(new.business_id) then
    raise exception 'plan_locked' using errcode = '42501';
  end if;
  return new;
end;
$$;

create trigger package_templates_guard_plan
  before insert or update on public.package_templates
  for each row execute function private.package_templates_guard_plan();

alter table public.package_templates enable row level security;

create policy "read package_templates" on public.package_templates
  for select
  to authenticated
  using (private.is_member(business_id, array['owner', 'staff']::public.member_role[]));

create policy "insert package_templates" on public.package_templates
  for insert
  to authenticated
  with check (private.has_perm(business_id, 'can_edit_catalog'));

create policy "update package_templates" on public.package_templates
  for update
  to authenticated
  using (private.has_perm(business_id, 'can_edit_catalog'))
  with check (private.has_perm(business_id, 'can_edit_catalog'));

-- Ingen delete: en mall avaktiveras (sålda paket pekar på den).
grant select, insert, update on public.package_templates to authenticated;
grant select, insert, update, delete on public.package_templates to service_role;

-- ---------------------------------------------------------------------------
-- package_template_services: vilka tjänster mallen täcker (en eller flera)
-- ---------------------------------------------------------------------------
create table public.package_template_services (
  business_id uuid not null references public.businesses (id) on delete cascade,
  template_id uuid not null,
  service_id uuid not null,
  primary key (business_id, template_id, service_id),
  foreign key (business_id, template_id)
    references public.package_templates (business_id, id) on delete cascade,
  foreign key (business_id, service_id)
    references public.services (business_id, id) on delete cascade
);

create index package_template_services_service_idx
  on public.package_template_services (business_id, service_id);

alter table public.package_template_services enable row level security;

create policy "read package_template_services" on public.package_template_services
  for select
  to authenticated
  using (private.is_member(business_id, array['owner', 'staff']::public.member_role[]));

create policy "insert package_template_services" on public.package_template_services
  for insert
  to authenticated
  with check (private.has_perm(business_id, 'can_edit_catalog'));

create policy "delete package_template_services" on public.package_template_services
  for delete
  to authenticated
  using (private.has_perm(business_id, 'can_edit_catalog'));

grant select, insert, delete on public.package_template_services to authenticated;
grant select, insert, delete on public.package_template_services to service_role;

-- ---------------------------------------------------------------------------
-- customer_packages: ett sålt paket (= försäljningen, betald i salongen)
-- ---------------------------------------------------------------------------
create table public.customer_packages (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.businesses (id) on delete cascade,
  customer_id uuid not null,
  template_id uuid not null,
  -- Ögonblicksbild från mallen vid försäljningen (triggern sätter dem).
  name text not null,
  sessions_total integer not null check (sessions_total between 1 and 100),
  price_clp integer not null check (price_clp between 1 and 100000000),
  payment_method public.payment_method not null
    check (payment_method in ('cash', 'card_terminal', 'transfer')),
  sold_at timestamptz not null default now(),
  -- Sista giltiga dagen (företagets tidszon), `null` = vence aldrig.
  expires_on date,
  sold_by uuid references auth.users (id) on delete set null,
  status text not null default 'active'
    check (status in ('active', 'voided')),
  voided_at timestamptz,
  voided_by uuid references auth.users (id) on delete set null,
  created_at timestamptz not null default now(),
  unique (business_id, id),
  constraint customer_packages_voided_consistent
    check ((status = 'voided') = (voided_at is not null)),
  -- NO ACTION (inte cascade): en kund eller mall med sålda paket raderas inte
  -- av misstag; hela företaget kan fortfarande kaskadraderas (kontrollen sker
  -- i slutet av satsen, då paketen redan är borta).
  foreign key (business_id, customer_id) references public.customers (business_id, id),
  foreign key (business_id, template_id) references public.package_templates (business_id, id)
);

create index customer_packages_customer_idx
  on public.customer_packages (business_id, customer_id);
create index customer_packages_sold_at_idx
  on public.customer_packages (business_id, sold_at);

-- Försäljning: allt utom kund, mall och betalmetod sätts här från mallen.
create function private.customer_packages_before_insert()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  t record;
  v_tz text;
begin
  -- Behörigheten först (samma regel som policyn): RLS:s with check körs
  -- först EFTER before-triggern, och triggerns egna fel får aldrig avslöja
  -- något om ett annat företags mallar eller kunder.
  if coalesce(current_setting('role', true), '') = 'authenticated' then
    if not (private.has_perm(new.business_id, 'can_view_reports')
            or private.has_perm(new.business_id, 'can_manage_all_bookings')) then
      raise exception 'forbidden' using errcode = '42501';
    end if;
    if not private.business_has_packages(new.business_id) then
      raise exception 'plan_locked' using errcode = '42501';
    end if;
  end if;

  select pt.name, pt.sessions, pt.price_clp, pt.validity_days, pt.active
    into t
    from public.package_templates pt
   where pt.business_id = new.business_id and pt.id = new.template_id;
  if not found or not t.active then
    raise exception 'package_template_inactive' using errcode = '23514';
  end if;
  if not exists (
    select 1 from public.package_template_services pts
     where pts.business_id = new.business_id and pts.template_id = new.template_id
  ) then
    raise exception 'package_template_without_services' using errcode = '23514';
  end if;
  if exists (
    select 1 from public.customers c
     where c.business_id = new.business_id and c.id = new.customer_id
       and c.anonymized_at is not null
  ) then
    raise exception 'customer_anonymized' using errcode = '23514';
  end if;

  select bz.timezone into v_tz from public.businesses bz where bz.id = new.business_id;

  new.name := t.name;
  new.sessions_total := t.sessions;
  new.price_clp := t.price_clp;
  new.sold_at := now();
  new.expires_on := case
    when t.validity_days is null then null
    else (now() at time zone coalesce(v_tz, 'America/Santiago'))::date + t.validity_days
  end;
  new.status := 'active';
  new.voided_at := null;
  new.voided_by := null;
  new.sold_by := coalesce((select auth.uid()), new.sold_by);
  return new;
end;
$$;

create trigger customer_packages_before_insert
  before insert on public.customer_packages
  for each row execute function private.customer_packages_before_insert();

-- Anular venta: bara active → voided, bara utan använda sessioner. Inget
-- annat får ändras (kolumn-grant + den här kontrollen).
create function private.customer_packages_before_update()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if coalesce(current_setting('role', true), '') = 'authenticated'
     and not (private.has_perm(old.business_id, 'can_view_reports')
              or private.has_perm(old.business_id, 'can_manage_all_bookings')) then
    raise exception 'forbidden' using errcode = '42501';
  end if;
  if old.status <> 'active' or new.status <> 'voided'
     or new.business_id <> old.business_id
     or new.customer_id <> old.customer_id
     or new.template_id <> old.template_id
     or new.name <> old.name
     or new.sessions_total <> old.sessions_total
     or new.price_clp <> old.price_clp
     or new.payment_method <> old.payment_method
     or new.sold_at <> old.sold_at
     or new.expires_on is distinct from old.expires_on then
    raise exception 'customer_package_immutable' using errcode = '23514';
  end if;
  if exists (
    select 1 from public.customer_package_moves m
     where m.business_id = old.business_id and m.customer_package_id = old.id
       and m.kind = 'redeem'
       and not exists (
         select 1 from public.customer_package_moves r
          where r.business_id = m.business_id and r.reverses_id = m.id
       )
  ) then
    raise exception 'customer_package_in_use' using errcode = '23514';
  end if;
  new.voided_at := now();
  new.voided_by := coalesce((select auth.uid()), new.voided_by);
  return new;
end;
$$;

alter table public.customer_packages enable row level security;

create policy "read customer_packages" on public.customer_packages
  for select
  to authenticated
  using (private.is_member(business_id, array['owner', 'staff']::public.member_role[]));

-- Samma regel som kassan: att sälja är en kassahändelse.
create policy "sell customer_packages" on public.customer_packages
  for insert
  to authenticated
  with check (
    private.has_perm(business_id, 'can_view_reports')
    or private.has_perm(business_id, 'can_manage_all_bookings')
  );

create policy "void customer_packages" on public.customer_packages
  for update
  to authenticated
  using (
    private.has_perm(business_id, 'can_view_reports')
    or private.has_perm(business_id, 'can_manage_all_bookings')
  )
  with check (
    private.has_perm(business_id, 'can_view_reports')
    or private.has_perm(business_id, 'can_manage_all_bookings')
  );

grant select, insert on public.customer_packages to authenticated;
grant update (status) on public.customer_packages to authenticated;
grant select, insert, update on public.customer_packages to service_role;

-- ---------------------------------------------------------------------------
-- customer_package_services: tjänsterna det sålda paketet täcker
-- (ögonblicksbild — en senare ändring av mallen påverkar inte sålda paket).
-- Skrivs bara av triggern nedan; authenticated har bara select.
-- ---------------------------------------------------------------------------
create table public.customer_package_services (
  business_id uuid not null references public.businesses (id) on delete cascade,
  customer_package_id uuid not null,
  service_id uuid not null,
  primary key (business_id, customer_package_id, service_id),
  foreign key (business_id, customer_package_id)
    references public.customer_packages (business_id, id) on delete cascade,
  foreign key (business_id, service_id) references public.services (business_id, id)
);

alter table public.customer_package_services enable row level security;

create policy "read customer_package_services" on public.customer_package_services
  for select
  to authenticated
  using (private.is_member(business_id, array['owner', 'staff']::public.member_role[]));

grant select on public.customer_package_services to authenticated;
grant select on public.customer_package_services to service_role;

create function private.customer_packages_after_insert()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.customer_package_services (business_id, customer_package_id, service_id)
  select new.business_id, new.id, pts.service_id
    from public.package_template_services pts
   where pts.business_id = new.business_id and pts.template_id = new.template_id;
  return null;
end;
$$;

create trigger customer_packages_after_insert
  after insert on public.customer_packages
  for each row execute function private.customer_packages_after_insert();

-- ---------------------------------------------------------------------------
-- customer_package_moves: append-only ledger för sessionsrörelser
--   redeem  (delta −1): en session dras för en bokning
--   reverse (delta +1): ångrar exakt en redeem (`reverses_id`)
-- Ingen update/delete-grant till någon roll (bara kaskad när företaget,
-- paketet raderas; `booking_id` nollas om bokningen raderas — bara vid
-- företagsradering och demo-omseedning).
-- ---------------------------------------------------------------------------
create table public.customer_package_moves (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.businesses (id) on delete cascade,
  customer_package_id uuid not null,
  kind text not null check (kind in ('redeem', 'reverse')),
  delta smallint not null,
  booking_id uuid,
  reverses_id uuid,
  -- Ägaren drog sessionen trots att kunden inte kom (no-show).
  no_show boolean not null default false,
  created_by uuid references auth.users (id) on delete set null,
  created_at timestamptz not null default now(),
  unique (business_id, id),
  constraint customer_package_moves_delta_kind
    check ((kind = 'redeem' and delta = -1) or (kind = 'reverse' and delta = 1)),
  constraint customer_package_moves_reverse_ref
    check ((kind = 'reverse') = (reverses_id is not null)),
  foreign key (business_id, customer_package_id)
    references public.customer_packages (business_id, id) on delete cascade,
  foreign key (business_id, booking_id)
    references public.bookings (business_id, id) on delete set null (booking_id),
  foreign key (business_id, reverses_id)
    references public.customer_package_moves (business_id, id) on delete cascade
);

-- En redeem ångras högst en gång.
create unique index customer_package_moves_reverses_uidx
  on public.customer_package_moves (business_id, reverses_id)
  where reverses_id is not null;
create index customer_package_moves_package_idx
  on public.customer_package_moves (business_id, customer_package_id);
create index customer_package_moves_booking_idx
  on public.customer_package_moves (business_id, booking_id)
  where booking_id is not null;

create function private.customer_package_moves_before_insert()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  p record;
  bk record;
  orig record;
  v_tz text;
  v_remaining integer;
begin
  if new.booking_id is null then
    raise exception 'package_move_booking_required' using errcode = '23514';
  end if;

  -- Behörigheten först (samma regel som policyn nedan): RLS:s with check
  -- körs först EFTER before-triggern, och triggerns egna fel får aldrig
  -- avslöja något om ett annat företags paket eller bokningar.
  if coalesce(current_setting('role', true), '') = 'authenticated'
     and not (
       private.has_perm(new.business_id, 'can_view_reports')
       or private.has_perm(new.business_id, 'can_manage_all_bookings')
       or (
         private.has_perm(new.business_id, 'can_manage_own_bookings')
         and exists (
           select 1 from public.bookings b
            where b.business_id = new.business_id and b.id = new.booking_id
              and b.staff_id = private.member_staff_id(new.business_id)
         )
       )
     ) then
    raise exception 'forbidden' using errcode = '42501';
  end if;

  -- Samma lås som "Marcar pagada" (src/server/payments/mark-paid.ts):
  -- betalning och inlösen av samma bokning serialiseras.
  perform pg_advisory_xact_lock(hashtextextended(
    'booking-payment:' || new.business_id::text || ':' || new.booking_id::text, 0));

  select cp.customer_id, cp.status, cp.sessions_total, cp.expires_on
    into p
    from public.customer_packages cp
   where cp.business_id = new.business_id and cp.id = new.customer_package_id
   for update;
  if not found then
    raise exception 'package_not_found' using errcode = '23503';
  end if;

  new.created_at := now();
  new.created_by := coalesce((select auth.uid()), new.created_by);

  if new.kind = 'reverse' then
    select m.kind, m.customer_package_id, m.booking_id, m.no_show
      into orig
      from public.customer_package_moves m
     where m.business_id = new.business_id and m.id = new.reverses_id;
    if not found or orig.kind <> 'redeem'
       or orig.customer_package_id <> new.customer_package_id
       or orig.booking_id is distinct from new.booking_id then
      raise exception 'package_reverse_mismatch' using errcode = '23514';
    end if;
    new.delta := 1;
    new.no_show := orig.no_show;
    return new;
  end if;

  -- kind = 'redeem'
  new.delta := -1;

  if p.status <> 'active' then
    raise exception 'package_not_active' using errcode = '23514';
  end if;

  select bz.timezone into v_tz from public.businesses bz where bz.id = new.business_id;
  if p.expires_on is not null
     and (now() at time zone coalesce(v_tz, 'America/Santiago'))::date > p.expires_on then
    raise exception 'package_expired' using errcode = '23514';
  end if;

  select coalesce(sum(m.delta), 0)::int + p.sessions_total
    into v_remaining
    from public.customer_package_moves m
   where m.business_id = new.business_id and m.customer_package_id = new.customer_package_id;
  if v_remaining <= 0 then
    raise exception 'package_no_sessions' using errcode = '23514';
  end if;

  select b.customer_id, b.service_id, b.status::text as status
    into bk
    from public.bookings b
   where b.business_id = new.business_id and b.id = new.booking_id;
  if not found then
    raise exception 'booking_not_found' using errcode = '23503';
  end if;
  if bk.customer_id <> p.customer_id then
    raise exception 'package_wrong_customer' using errcode = '23514';
  end if;
  if not exists (
    select 1 from public.customer_package_services s
     where s.business_id = new.business_id
       and s.customer_package_id = new.customer_package_id
       and s.service_id = bk.service_id
  ) then
    raise exception 'package_service_not_included' using errcode = '23514';
  end if;
  if bk.status not in ('confirmed', 'completed', 'no_show') then
    raise exception 'package_booking_status' using errcode = '23514';
  end if;
  new.no_show := (bk.status = 'no_show');

  -- Redan inlöst (med något paket) och inte ångrad?
  if exists (
    select 1 from public.customer_package_moves m
     where m.business_id = new.business_id and m.booking_id = new.booking_id
       and m.kind = 'redeem'
       and not exists (
         select 1 from public.customer_package_moves r
          where r.business_id = m.business_id and r.reverses_id = m.id
       )
  ) then
    raise exception 'package_already_used' using errcode = '23514';
  end if;
  -- Redan betald i kassan?
  if exists (
    select 1 from public.payments pm
     where pm.business_id = new.business_id and pm.booking_id = new.booking_id
       and pm.status = 'approved' and pm.kind in ('full', 'balance')
  ) then
    raise exception 'booking_already_paid' using errcode = '23514';
  end if;

  return new;
end;
$$;

create trigger customer_package_moves_before_insert
  before insert on public.customer_package_moves
  for each row execute function private.customer_package_moves_before_insert();

-- Nu när ledger-tabellen finns: triggern för "Anular venta".
create trigger customer_packages_before_update
  before update on public.customer_packages
  for each row execute function private.customer_packages_before_update();

alter table public.customer_package_moves enable row level security;

create policy "read customer_package_moves" on public.customer_package_moves
  for select
  to authenticated
  using (private.is_member(business_id, array['owner', 'staff']::public.member_role[]));

-- Samma regel som "Marcar pagada" (payments, 20260930200200): kassan, alla
-- bokningar, eller egna bokningar (bokningens profesional = den egna raden).
create policy "insert customer_package_moves" on public.customer_package_moves
  for insert
  to authenticated
  with check (
    private.has_perm(business_id, 'can_view_reports')
    or private.has_perm(business_id, 'can_manage_all_bookings')
    or (
      private.has_perm(business_id, 'can_manage_own_bookings')
      and exists (
        select 1 from public.bookings bk
         where bk.business_id = customer_package_moves.business_id
           and bk.id = customer_package_moves.booking_id
           and bk.staff_id = private.member_staff_id(customer_package_moves.business_id)
      )
    )
  );

grant select, insert on public.customer_package_moves to authenticated;
grant select, insert on public.customer_package_moves to service_role;
