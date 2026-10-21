-- WP-16 (WhatsApp) · D-063 · Steg 2 av 2: utkorgens WhatsApp-kolumner och
-- samtyckestypen. F#: F7, F8, F12. INV-3 (RLS), INV-4/D-014 (sammansatt FK).
--
-- Inga nya tabeller: webhookens idempotens använder den befintliga
-- `inbound_events` (provider = 'whatsapp', RLS på, inga policyer, bara
-- service_role), samma som Stripe-webhooken gjorde.
set search_path = public, extensions;

-- 1. message_outbox ------------------------------------------------------------
-- wa_message_id: Metas meddelande-id ("wamid.…") för en rad som skickats via
--   WhatsApp. Statuswebhooken (sent/delivered/read/failed) och knappsvaren
--   (`context.id`) slår upp raden på den. Egen kolumn (inte bara
--   provider_message_id) eftersom en rad som faller tillbaka till e-post får
--   e-postens id i provider_message_id — wamid ska ändå gå att känna igen
--   (sena statusar ignoreras då i stället för att träffa fel rad).
-- delivered_at/read_at: leveransstatus från webhooken (bara WhatsApp).
-- fallback_reason: satt när en WhatsApp-rad bytt till e-post (felkoden, t.ex.
--   'wa_131026', eller 'wa_ineligible'). Satt = försök aldrig WhatsApp igen
--   för raden. Bara en kod, aldrig persondata.
-- waitlist_entry_id: väntelistans post för `listaEsperaCupo`/`listaEsperaTomada`
--   (booking_id är null för dem). Knappsvaret "Sí, la quiero" kommer efter att
--   payload tömts, så posten måste gå att hitta utan payloaden.
alter table public.message_outbox
  add column wa_message_id text,
  add column delivered_at timestamptz,
  add column read_at timestamptz,
  add column fallback_reason text,
  add column waitlist_entry_id uuid,
  -- D-014: sammansatt FK — en rad kan aldrig peka på ett annat företags post.
  -- Kolumn-listform på `set null` (annars nollas även business_id).
  add constraint message_outbox_waitlist_entry_fk
    foreign key (business_id, waitlist_entry_id)
    references public.waitlist_entries (business_id, id)
    on delete set null (waitlist_entry_id),
  add constraint message_outbox_wa_message_id_whatsapp
    check (wa_message_id is null or channel = 'whatsapp' or fallback_reason is not null),
  add constraint message_outbox_fallback_reason_not_blank
    check (fallback_reason is null or char_length(fallback_reason) between 1 and 64);

-- Metas id är globalt unikt; ett unikt index ger också uppslaget i webhooken.
create unique index message_outbox_wa_message_id_key
  on public.message_outbox (wa_message_id)
  where wa_message_id is not null;
-- Workerns städning (varje pass): WhatsApp-rader som fortfarande bär
-- kundens token efter `sent` (D-029/D-063, töms vid leveransstatus eller
-- efter 24 h). Partiellt så att indexet bara innehåller just de raderna.
create index message_outbox_whatsapp_payload_idx
  on public.message_outbox (sent_at)
  where channel = 'whatsapp' and status = 'sent' and payload <> '{}'::jsonb;
-- Uppslag av en väntelisteposts meddelanden.
create index message_outbox_waitlist_entry_id_idx
  on public.message_outbox (business_id, waitlist_entry_id)
  where waitlist_entry_id is not null;

-- 2. consent_events: 'whatsapp' är ett kund-samtycke --------------------------
alter table public.consent_events
  drop constraint consent_events_subject_kind_check,
  add constraint consent_events_subject_kind_check check (
    (subject = 'customer' and kind in ('terms', 'marketing', 'waitlist', 'whatsapp'))
    or (subject = 'owner' and kind in ('owner_terms', 'dpa'))
  );

-- Senaste WhatsApp-händelsen per kund läses vid varje utskick (kanalvalet).
create index consent_events_whatsapp_latest_idx
  on public.consent_events (business_id, customer_id, created_at desc)
  where kind = 'whatsapp' and customer_id is not null;
