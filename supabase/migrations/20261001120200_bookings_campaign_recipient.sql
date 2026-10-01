-- WP-31 · Erbjudandelänk (db-engineer) · `bookings.campaign_recipient_id`
-- F#: F14. Plan: docs/tasks/plans/WP-31-utskick.md, "Kampanjer" (inlösen).
-- INV: INV-1 (no_overlap opåverkad, ingen ny statuslogik), INV-3, INV-4
-- (sammansatt FK, D-014).
--
-- Vilken kampanj-mottagarrad (om någon) som löstes in av den här bokningen
-- — servern (scheduling-engineer) sätter kolumnen när en bokning skapas via
-- `/{slug}?o=<token>` och samtidigt `campaign_recipients.redeemed_booking_id`/
-- `redeemed_at` (samma transaktion). Kräver `campaign_recipients`
-- (20261001120000).
alter table public.bookings
  add column campaign_recipient_id uuid,
  add constraint bookings_campaign_recipient_id_fkey
    foreign key (business_id, campaign_recipient_id)
    references public.campaign_recipients (business_id, id)
    -- Kolumn-listform (inte ett bart `on delete set null`): annars nollas
    -- hela FK-kolumnuppsättningen, inklusive business_id (samma gotcha som
    -- services.category_id/booking_answers.question_id).
    on delete set null (campaign_recipient_id);

-- Uppslag "vilken bokning löste in den här länken" går via
-- campaign_recipients.redeemed_booking_id (redan unikt per rad via dess
-- egen PK); det här indexet är för den omvända frågan, t.ex. rapportering
-- "hur många av kampanjens bokningar syns i agendan".
create index bookings_campaign_recipient_id_idx on public.bookings (campaign_recipient_id)
  where campaign_recipient_id is not null;

-- Ingen ny kolumngrant krävs: `bookings` har redan en obegränsad
-- `grant select, insert, update, delete on public.bookings to authenticated`
-- (20260927100400), inte kolumnbegränsad som `businesses`/`customers`.
