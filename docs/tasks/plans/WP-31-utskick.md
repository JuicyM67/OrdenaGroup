# WP-31 · Erbjudanden (kampanjer) + "Te echamos de menos" — F14 (ägaren 2026-10-01)

## Kampanjer
- Tabeller: `campaigns` (business_id, name, channel email|sms, audience jsonb {kind: all|members|regulars|inactive|selected, days?, customerIds?}, message text ≤ 320 för sms / ≤ 1000 för e-post, offer_pct smallint null 1–100, offer_text text null, offer_valid_until date null, status draft|sent, sent_at, created_by), `campaign_recipients` (campaign_id, business_id, customer_id, token_hash unik, sent_at, redeemed_booking_id null, redeemed_at). RLS: ägare eller `can_manage_all_bookings` (skicka kräver ägare/can_manage_all_bookings; läs historik samma). pgTAP tenant-isolering för båda nya tabeller.
- Bara kunder med marknadsföringssamtycke (`customers.consent_marketing_at is not null`, ej anonymiserade, kanalkrav: e-post finns resp. mobil). SE: sms via ClickSend, e-post via Resend. CL: bara e-post (WhatsApp senare).
- Utskick via `message_outbox` (category `marketing`), adress slås upp vid sändning, payload töms efter (D-029). Rate limit per företag. Varje meddelande: avregistreringslänk `/baja/[token]` (sms: kort länk + "Svara STOP" behövs inte — länk räcker) → återkallar marknadsföringssamtycke + consent_events.
- Erbjudandelänk: `/{slug}?o=<token>` → servern validerar token (rätt företag, inom giltighet, ej inlöst, rätt kund vid bokning via telefon/kund-id) och drar `offer_pct` (största rabatten vinner mot medlemsrabatt, ej kombinerat). Inlöses vid bokning (redeemed_booking_id). Klientkod minimal (JS-budget 190 kB).
- UI: /app/clientes → "Nytt utskick" (målgrupp, kanal, text, erbjudande, förhandsvisning med antal mottagare + antal sms-delar), kundkortet "Skicka erbjudande" (förifylld selected), historik /app/clientes/utskick (skickade, bokningar via länk).

## Te echamos de menos (automatiskt)
- Inställning (Inställningar → Medlemmar/utskick): `businesses.winback_days smallint null` (null = av), `winback_message`, `winback_offer_pct`, `winback_offer_days` (giltighet). Dagligt jobb (befintlig retention-cron eller ny GitHub Actions-körning) skapar en kampanj per företag för kunder vars senaste besök passerat gränsen och som inte fått winback de senaste 90 dagarna.
- Inicio: "Te echamos de menos"-kortet återinförs (antal inaktiva kunder + knapp "Skicka nu" → kampanjformulär med målgrupp inaktiva).

## Fix
- Utkorgens dedupe-nyckel för avbokningsförfrågan/nej ska inkludera ett löpnummer/tidpunkt så att en ny förfrågan efter nej ger nytt sms.

## Test
Inga nya tester utöver pgTAP för nya tabeller. CI en gång. En säkerhetsgranskning (samtycke, token, rabatt).
