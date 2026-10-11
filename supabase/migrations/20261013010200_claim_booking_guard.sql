-- WP-67 · Säkerhetsgranskning PR #109 (D-054): extra skydd i claim_booking.
--
-- `p_booking_id` får ALDRIG komma från klienten: servern skickar bara id:t på
-- bokningen som just skapades i samma server action (`src/app/[slug]/actions.ts`).
-- Som försvar i djupet kräver funktionen nu dessutom att bokningen angavs med
-- kontots bekräftade e-post (eller helt utan e-post), så att ett läckt eller
-- gissat id på någon annans färska bokning inte kan tas över.
create or replace function private.claim_booking(p_business_id uuid, p_booking_id uuid)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_uid uuid := (select auth.uid());
  v_customer uuid;
begin
  if v_uid is null then
    raise exception 'not authenticated' using errcode = '42501';
  end if;
  if not exists (select 1 from public.customer_accounts a where a.user_id = v_uid) then
    return false;
  end if;
  update public.bookings
     set account_user_id = v_uid
   where business_id = p_business_id
     and id = p_booking_id
     and account_user_id is null
     and created_at > now() - interval '10 minutes'
     -- Extra skydd: bokningen måste ha angetts med kontots bekräftade e-post
     -- (eller utan e-post, t.ex. SE där e-post är valfri).
     and (contact_email is null or lower(contact_email) = (select private.my_confirmed_email()))
  returning customer_id into v_customer;
  if v_customer is null then
    return false;
  end if;
  insert into public.customer_account_links (user_id, business_id, customer_id, linked_via)
  values (v_uid, p_business_id, v_customer, 'booking')
  on conflict do nothing;
  return true;
end;
$$;
