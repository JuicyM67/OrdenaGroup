# WP-64 · Stripe Connect — kunden betalar behandlingen online (bara SE, D-044)

- **Konto:** Express-konton, Stripe-värd onboarding (Account Links), status via `account.updated`. Ny flik Inställningar → Betalningar (bara SE, bara ägaren). Val per företag: Av / Valfri / Obligatorisk (`businesses.online_payment`).
- **Betalning:** Stripe Checkout (hostad redirect, ingen Stripe.js på `/[slug]`). **Direct charge** på företagets konto + `application_fee_amount`, `capture_method=manual`. Belopp = serverns pris − rabatt, i öre (SEK minor = vår lagringsenhet).
- **Förfrågan (D-036):** bokningen skapas som vanligt (`requested`/`confirmed`), sedan skickas kunden till Checkout. Kortet *reserveras* (authorized). Dras när bokningen är `confirmed` (ägaren bekräftar, eller autobekräftelse), släpps (cancel PI) om förfrågan nekas/går ut/avbokas innan dragning, och återbetalas (refund + återbetald avgift) om den avbokas efter dragning. Förfrågan går ut inom 24 h, alltså långt innan kortreservationens 7 dagar.
- **Obligatorisk:** obetald session som går ut (30 min) ⇒ bokningen avbokas och tiden släpps.
- **Avstämning:** `reconcileBookingPayment(bookingId)` är idempotent och anropas från webhooken, efter bekräfta/neka/avboka och av cron-passet (`/api/cron/outbox`) som säkerhetsnät.
- **Webhook:** `/api/webhooks/stripe`, signatur över rå body (`constructEvent`), `inbound_events` (provider, event_id) för idempotens, svar 200 snabbt. Betalningsdata hämtas alltid från Stripes API (aldrig payloaden).
- **Avgift:** `src/config/platform-fee.ts`, 1 % free/emprende/equipo, 0 % local.
- **Caja:** `payments` får en rad (metod `stripe`) vid dragning ⇒ betald; `refunded` vid återbetalning.
- **Meddelanden:** e-postkortet får raden "Betalning" (reserverad/betald/återbetalas) + återbetalningsnotis i nekad/utgången/avbokad. SMS oförändrade.
- **Env:** `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`, `STRIPE_CONNECT_WEBHOOK_SECRET`. Saknas nyckeln är funktionen dold/avstängd.
- **DB:** `stripe_accounts`, `stripe_checkouts`, `inbound_events`, `businesses.online_payment`, `payment_method='stripe'`; pgTAP `112_stripe_connect`.
