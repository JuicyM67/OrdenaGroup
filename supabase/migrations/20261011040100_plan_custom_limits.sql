-- WP-73 · Planspärrar (D-048) · steg 2: avtalade gränser för `custom`.
--
-- `businesses.custom_limits` = {"staff": int, "sms": int} (båda valfria).
-- Sätts bara av plattformsadmin (service role, /admin) — `authenticated` har
-- bara kolumnvisa update-grants på businesses, och den här kolumnen läggs inte
-- till där. Läses av servern (`src/server/plans/entitlements.ts`) för sms-kvoten
-- och av personalgränsen nedan. Ignoreras för andra planer än `custom`.
alter table public.businesses
  add column custom_limits jsonb not null default '{}'::jsonb
  constraint businesses_custom_limits_check check (
    jsonb_typeof(custom_limits) = 'object'
    and (not custom_limits ? 'staff'
         or (jsonb_typeof(custom_limits -> 'staff') = 'number'
             and (custom_limits ->> 'staff')::numeric between 1 and 10000))
    and (not custom_limits ? 'sms'
         or (jsonb_typeof(custom_limits -> 'sms') = 'number'
             and (custom_limits ->> 'sms')::numeric between 0 and 1000000))
  );

comment on column public.businesses.custom_limits is
  'WP-73/D-048: avtalade gränser för plan custom ({"staff": n, "sms": n}). Bara service role skriver.';

-- Personalgräns per FÖRETAG (inte bara per plan): custom läser sin avtalade
-- siffra, standard 10 (= Företag) om inget avtalats. Övriga planer som D-037
-- via `private.plan_staff_limit`. Jämför planen som text — det nya enum-värdet
-- får inte refereras i samma transaktion som det skapades (se steg 1).
create function private.business_staff_limit(b uuid)
returns integer
language sql
stable
security definer
set search_path = ''
as $$
  select case
    when bz.plan::text = 'custom'
      then coalesce(floor((bz.custom_limits ->> 'staff')::numeric)::integer, 10)
    else private.plan_staff_limit(bz.plan)
  end
  from public.businesses bz
  where bz.id = b;
$$;

revoke all on function private.business_staff_limit(uuid) from public;
grant execute on function private.business_staff_limit(uuid) to authenticated, service_role;

-- Samma spärr som 20260930150300, men gränsen per företag.
create or replace function private.member_invitations_guard_limit()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_limit integer;
begin
  perform 1 from public.businesses where id = new.business_id for update;
  v_limit := private.business_staff_limit(new.business_id);
  if v_limit is not null and private.staff_seat_count(new.business_id) >= v_limit then
    raise exception 'El plan actual no permite más cuentas de personal' using errcode = '42501';
  end if;
  return new;
end;
$$;

-- Oförändrad från 20260930150400 utom gränsuppslaget (per företag).
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
    can_edit_catalog, can_manage_team, can_view_reports, can_edit_settings
  ) values (
    v_inv.business_id, v_user, 'staff', v_inv.staff_id,
    v_inv.can_manage_own_bookings, v_inv.can_manage_all_bookings, v_inv.can_cancel_bookings,
    v_inv.can_edit_catalog, v_inv.can_manage_team, v_inv.can_view_reports, v_inv.can_edit_settings
  );

  update public.member_invitations set accepted_at = now() where id = v_inv.id;

  return v_inv.business_id;
end;
$$;
