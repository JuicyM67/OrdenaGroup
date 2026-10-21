-- WP-16 (WhatsApp) · D-063 · Steg 1 av 2: nya enum-värden.
-- F#: F7 (WhatsApp-bekräftelser och påminnelser), F8 (väntelistan), F12 (samtycke).
--
-- Egen migration: ett värde som läggs till med `alter type … add value` kan
-- inte användas i samma transaktion (55P04 "unsafe use of new value"), och
-- nästa migration (20261021010100_whatsapp_channel.sql) använder båda i en
-- check-constraint och i pgTAP.
--
--  1. message_channel += 'whatsapp' — utkorgens kanal (DATA_MODEL.md sa redan
--     att värdet läggs till "i en egen WP"). 'sms' ligger kvar oanvänt (D-062).
--  2. consent_kind += 'whatsapp' — kundens separata, valfria samtycke till att
--     få bokningens meddelanden på WhatsApp (Ley 21.719, regel 7). Loggas i
--     den append-only `consent_events` (granted true = samtycke, false =
--     återkallat); senaste händelsen per kund avgör.
alter type public.message_channel add value if not exists 'whatsapp';
alter type public.consent_kind add value if not exists 'whatsapp';
