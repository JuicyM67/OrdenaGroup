-- WP-76 · SMS-krediter (D-053) · säkerhetsgranskning PR #105.
--  1. Kreditloggen är append-only även för service_role (inga update/delete/truncate).
--  2. consume fyller på: en retry med fler segment förbrukar mellanskillnaden
--     (`p_count` = radens TOTALA behov). Flera consume-rader per (rad, köp) är
--     därför tillåtna; unika indexet ersätts av ett vanligt.
--  3. release summerar per köp (en release-rad per (rad, köp), som förut).
set search_path = public, extensions;

revoke update, delete, truncate on public.sms_credit_ledger from service_role;
revoke all on public.sms_credit_ledger from anon;
revoke insert, update, delete, truncate on public.sms_credit_ledger from authenticated;

drop index public.sms_credit_ledger_consume_uq;

create or replace function private.sms_credit_consume(
  p_business uuid,
  p_outbox uuid,
  p_count integer
) returns integer
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_existing integer;
  v_need integer;
  v_avail integer;
  v_left integer;
  v_take integer;
  r record;
begin
  if p_count is null or p_count <= 0 then
    return 0;
  end if;
  select coalesce(-sum(delta), 0)::int into v_existing
    from public.sms_credit_ledger
   where business_id = p_business and outbox_id = p_outbox and kind = 'consume';
  if v_existing >= p_count then
    return v_existing;
  end if;
  v_need := p_count - v_existing;
  perform 1 from public.sms_credit_purchases
   where business_id = p_business
     and status in ('paid', 'partially_refunded')
     and credits_remaining > 0
     and expires_at > now()
   for update;
  select coalesce(sum(credits_remaining), 0)::int into v_avail
    from public.sms_credit_purchases
   where business_id = p_business
     and status in ('paid', 'partially_refunded')
     and credits_remaining > 0
     and expires_at > now();
  if v_avail < v_need then
    return 0;
  end if;
  v_left := v_need;
  for r in
    select id, credits_remaining
      from public.sms_credit_purchases
     where business_id = p_business
       and status in ('paid', 'partially_refunded')
       and credits_remaining > 0
       and expires_at > now()
     order by expires_at, paid_at, id
  loop
    exit when v_left = 0;
    v_take := least(v_left, r.credits_remaining);
    update public.sms_credit_purchases
       set credits_remaining = credits_remaining - v_take
     where id = r.id;
    insert into public.sms_credit_ledger (business_id, purchase_id, outbox_id, kind, delta)
    values (p_business, r.id, p_outbox, 'consume', -v_take);
    v_left := v_left - v_take;
  end loop;
  return p_count;
end;
$$;

create or replace function private.sms_credit_release(p_outbox uuid)
returns integer
language plpgsql
security definer
set search_path = ''
as $$
declare
  r record;
  v_back integer;
  v_total integer := 0;
begin
  for r in
    select l.business_id, l.purchase_id, (-sum(l.delta))::int as n
      from public.sms_credit_ledger l
     where l.outbox_id = p_outbox
       and l.kind = 'consume'
       and not exists (
         select 1 from public.sms_credit_ledger x
          where x.outbox_id = p_outbox
            and x.purchase_id = l.purchase_id
            and x.kind = 'release'
       )
     group by l.business_id, l.purchase_id
  loop
    select case
             when p.status in ('paid', 'partially_refunded') and p.expires_at > now()
               then greatest(0, least(r.n, p.credits_total - p.credits_refunded - p.credits_remaining))
             else 0
           end
      into v_back
      from public.sms_credit_purchases p
     where p.id = r.purchase_id
     for update;
    v_back := coalesce(v_back, 0);
    if v_back > 0 then
      update public.sms_credit_purchases
         set credits_remaining = credits_remaining + v_back
       where id = r.purchase_id;
    end if;
    insert into public.sms_credit_ledger (business_id, purchase_id, outbox_id, kind, delta)
    values (r.business_id, r.purchase_id, p_outbox, 'release', v_back);
    v_total := v_total + v_back;
  end loop;
  return v_total;
end;
$$;

revoke all on function private.sms_credit_consume(uuid, uuid, integer) from public;
revoke all on function private.sms_credit_release(uuid) from public;
grant execute on function private.sms_credit_consume(uuid, uuid, integer) to service_role;
grant execute on function private.sms_credit_release(uuid) to service_role;
