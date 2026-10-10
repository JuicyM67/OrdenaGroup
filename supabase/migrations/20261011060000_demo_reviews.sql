-- WP-72 · Verifierade omdömen på demoföretagen (så att visningens omdömessteg syns).
--
-- `private.seed_demo(market)` rullar om demokundernas bokningar vid varje körning
-- (de raderas och läggs om), och recensionerna följer med bokningarna via
-- `on delete cascade`. Därför läggs recensionerna om i samma anrop: den befintliga
-- funktionen byter namn till `seed_demo_base` (oförändrad kropp, behåller sina
-- grants) och `seed_demo` blir ett omslag som kör basen och därefter
-- `private.seed_demo_reviews`. Idempotent: recensioner till demokundernas
-- bokningar raderas och skapas om, alla andra recensioner rörs inte.
--
-- Recensionerna kopplas till demokundernas genomförda (completed) bokningar
-- (= verifierade, D-045), betyg 4–5, några med kort text, tre med företagets svar.
set search_path = public, extensions;

alter function private.seed_demo(text) rename to seed_demo_base;

create function private.seed_demo_reviews(market text)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_n text;
  v_biz uuid;
  v_comments text[];
  v_replies text[];
  v_ratings int[] := array[5, 5, 4, 5, 5, 4, 5, 5, 4, 5];
begin
  if market = 'CL' then
    v_n := '1';
    v_comments := array[
      'Justo el corte que quería, y la conversación estuvo excelente.',
      null,
      'Muy buena atención. Lo único: tuve que esperar cinco minutos.',
      'El mejor degradado que me han hecho en Providencia.',
      null,
      'Camila entiende lo que uno pide sin explicar tres veces. Vuelvo seguro.',
      'Todo prolijo y a la hora. Súper recomendable.',
      null,
      'Rico el café y el balayage quedó precioso, aunque demoró un poco más de lo dicho.',
      'Reservé en un minuto y me llegó el recordatorio. Así da gusto.'
    ];
    v_replies := array[
      '¡Gracias, Martina! Te esperamos pronto.',
      'Gracias por avisar, ya ajustamos los tiempos para que no esperes.',
      '¡Qué lindo leer esto! Un abrazo desde Brisa.'
    ];
  elsif market = 'SE' then
    v_n := '2';
    v_comments := array[
      'Precis den klippning jag ville ha! Fick bra tips också.',
      null,
      'Trevligt bemötande. Jag fick vänta några minuter, annars toppen.',
      'Bästa färgningen jag haft – och så skonsamt för håret.',
      null,
      'Lyssnar verkligen på vad man vill. Kommer tillbaka.',
      'Snyggt, prydligt och i tid. Rekommenderas.',
      null,
      'Underbart resultat på slingorna, tog lite längre tid än beräknat.',
      'Smidigt att boka online och påminnelsen kom i tid.'
    ];
    v_replies := array[
      'Tack Emma! Vi ses snart igen.',
      'Tack för att du sa till – vi har justerat tiderna så att ingen får vänta.',
      'Vad roligt att höra! Hälsningar från hela salongen.'
    ];
  else
    raise exception 'seed_demo_reviews: okänd marknad %', market using errcode = '22023';
  end if;

  v_biz := ('de00000' || v_n || '-0000-0000-0000-000000000001')::uuid;
  if not exists (select 1 from public.businesses where id = v_biz) then
    return;
  end if;

  delete from public.reviews r
   using public.customers c
   where r.business_id = v_biz
     and c.business_id = r.business_id and c.id = r.customer_id
     and c.id::text like 'de00000' || v_n || '-0000-0000-0004-%';

  insert into public.reviews (
    business_id, booking_id, customer_id, rating, comment, display_name,
    reply, replied_at, created_at
  )
  select v_biz, x.booking_id, x.customer_id,
         v_ratings[x.rn],
         v_comments[x.rn],
         split_part(x.name, ' ', 1) || ' ' || left(split_part(x.name, ' ', 2), 1) || '.',
         case when x.rn in (2, 3, 6)
              then v_replies[case x.rn when 2 then 1 when 3 then 2 else 3 end] end,
         case when x.rn in (2, 3, 6) then least(x.posted + interval '1 day', now()) end,
         x.posted
    from (
      select bk.id as booking_id, bk.customer_id, c.name,
             least(upper(bk.period) + interval '1 day', now()) as posted,
             row_number() over (order by upper(bk.period) desc, bk.id)::int as rn
        from public.bookings bk
        join public.customers c on c.business_id = bk.business_id and c.id = bk.customer_id
       where bk.business_id = v_biz
         and bk.status = 'completed'
         and c.id::text like 'de00000' || v_n || '-0000-0000-0004-%'
         and upper(bk.period) < now()
    ) x
   where x.rn <= 10
  on conflict do nothing;
end;
$$;

revoke all on function private.seed_demo_reviews(text) from public;

create function private.seed_demo(market text)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  perform private.seed_demo_base(market);
  perform private.seed_demo_reviews(market);
end;
$$;

revoke all on function private.seed_demo(text) from public;
grant execute on function private.seed_demo(text) to service_role;
