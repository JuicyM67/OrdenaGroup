-- WP-73 · Planspärrar (D-048) · säkerhetsgranskning: spärrarna ska inte gå att
-- kringgå med ägarens JWT direkt mot PostgREST. Serverkoden kontrollerar redan
-- planen (vänliga felkoder); här är databasens sista skydd.
--
-- Triggarna gäller rollen `authenticated` (PostgREST och serverns
-- `withOwnerTx`, båda `set local role authenticated`; funktionerna är security
-- definer, så rollen läses ur `current_setting('role')`, inte `current_user`). `service_role`/`postgres` (servern efter egen kontroll,
-- plattformsadmin, seed/demo, tester) är betrodda och spärras inte här.
--
-- Matrisen speglar `src/config/plans.ts` — ändra BÅDA (pgTAP 117 + vitest
-- `src/config/plans.test.ts` håller dem ihop).

-- 1. Planens funktioner -----------------------------------------------------
create function private.plan_has_feature(p_plan text, p_feature text)
returns boolean
language sql
immutable
set search_path = ''
as $$
  select case
    when p_feature in ('unbranded', 'online_payment', 'waitlist')
      then p_plan in ('emprende', 'equipo', 'local', 'custom')
    when p_feature in ('flash', 'campaigns', 'full_reports', 'staff_accounts')
      then p_plan in ('equipo', 'local', 'custom')
    when p_feature = 'priority_support'
      then p_plan in ('local', 'custom')
    else false
  end;
$$;

create function private.business_has_feature(b uuid, p_feature text)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select coalesce(
    (select private.plan_has_feature(bz.plan::text, p_feature)
       from public.businesses bz where bz.id = b),
    false
  );
$$;

-- `null` = obegränsat. Bara Gratis har en gräns (3 aktiva tjänster).
create function private.business_service_limit(b uuid)
returns integer
language sql
stable
security definer
set search_path = ''
as $$
  select case when bz.plan::text = 'free' then 3 end
    from public.businesses bz where bz.id = b;
$$;

revoke all on function private.plan_has_feature(text, text) from public;
revoke all on function private.business_has_feature(uuid, text) from public;
revoke all on function private.business_service_limit(uuid) from public;
grant execute on function private.plan_has_feature(text, text) to authenticated, service_role;
grant execute on function private.business_has_feature(uuid, text) to authenticated, service_role;
grant execute on function private.business_service_limit(uuid) to authenticated, service_role;

-- 2. Aktiva tjänster (Gratis max 3) -----------------------------------------
-- Felet: SQLSTATE 23514 med constraint `plan_limit_services` (servern mappar
-- den till samma kod som sin egen förkontroll).
create function private.services_guard_plan_limit()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_limit integer;
  v_active integer;
begin
  if coalesce(current_setting('role', true), '') <> 'authenticated' or not new.active then
    return new;
  end if;
  if tg_op = 'UPDATE' and old.active then
    return new;
  end if;
  -- Serialiserar samtidiga inserts/aktiveringar för samma företag.
  perform 1 from public.businesses where id = new.business_id for update;
  v_limit := private.business_service_limit(new.business_id);
  if v_limit is null then
    return new;
  end if;
  select count(*) into v_active from public.services
   where business_id = new.business_id and active and id <> new.id;
  if v_active >= v_limit then
    raise exception 'El plan actual no permite más servicios activos'
      using errcode = '23514', constraint = 'plan_limit_services';
  end if;
  return new;
end;
$$;

create trigger services_guard_plan_limit
  before insert or update of active on public.services
  for each row execute function private.services_guard_plan_limit();

-- 3. Blixttider (Team+) -----------------------------------------------------
create function private.flash_slots_guard_plan()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if coalesce(current_setting('role', true), '') = 'authenticated'
     and not private.business_has_feature(new.business_id, 'flash') then
    raise exception 'El plan actual no incluye horas flash'
      using errcode = '42501';
  end if;
  return new;
end;
$$;

create trigger flash_slots_guard_plan
  before insert on public.flash_slots
  for each row execute function private.flash_slots_guard_plan();

-- 4. Medlemsrabatt och "Vi saknar dig" (Team+) -------------------------------
-- Att stänga av (null) går alltid; att slå på kräver planen.
create function private.businesses_guard_campaign_settings()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if coalesce(current_setting('role', true), '') <> 'authenticated' then
    return new;
  end if;
  if (new.member_discount_pct is not null
        and new.member_discount_pct is distinct from old.member_discount_pct)
     or (new.member_benefit_text is not null
        and new.member_benefit_text is distinct from old.member_benefit_text)
     or (new.winback_days is not null
        and new.winback_days is distinct from old.winback_days) then
    if not private.plan_has_feature(new.plan::text, 'campaigns') then
      raise exception 'El plan actual no incluye beneficios para socios ni envíos'
        using errcode = '42501';
    end if;
  end if;
  return new;
end;
$$;

create trigger businesses_guard_campaign_settings
  before update of member_discount_pct, member_benefit_text, winback_days
  on public.businesses
  for each row execute function private.businesses_guard_campaign_settings();

-- 5. Sms-kvoten: reservation per rad -----------------------------------------
-- Workern tar `pg_advisory_xact_lock(hashtext('sms:' || business_id))`,
-- räknar skickade + reserverade (`sending` med `quota_reserved_at`) sms denna
-- månad och reserverar sin rad innan den skickar, så att parallella pass inte
-- överskrider kvoten. Ingen persondata.
alter table public.message_outbox add column quota_reserved_at timestamptz;

comment on column public.message_outbox.quota_reserved_at is
  'WP-73/D-048: när sms-raden reserverade en plats i månadens sms-kvot (workern).';

-- 6. Medlemskap skapas bara via accept_invitation/create_business ------------
-- Gammal lucka: "owners insert" + insert-grant lät ägaren lägga in
-- medlemskap förbi platsgränsen (D-037). Appen skapar aldrig medlemskap
-- direkt — bara `public.create_business` och `public.accept_invitation`
-- (båda security definer) samt servern som service role.
drop policy "owners insert" on public.memberships;
revoke insert on public.memberships from authenticated;
