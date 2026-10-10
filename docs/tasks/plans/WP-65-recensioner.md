# WP-65 · Verifierade recensioner (CL + SE) — plan

Beslut: D-045. Bara kunder med en genomförd bokning, en recension per bokning.

1. **DB** (`20261011020000_reviews.sql`): `businesses.review_requests_enabled` (default true), `review_invites` (token-hash per bokning, bara service_role), `reviews` (1–5, text ≤ 1000, visningsnamn, svar, anmälan, `hidden_at`). RLS: medlemmar läser, `can_edit_settings` svarar/anmäler (kolumn-grants). Trigger: anonymiserad kund → recensionens namn/text/svar nollas. Medlemsvakt (trigger): anmälan bara null → satt, `replied_at` sätts av servern. `run_retention` rensar inbjudningar > 60 dagar. pgTAP `113_reviews.test.sql`.
2. **Förfrågan:** svep `queueReviewRequests` i `/api/cron/outbox` — bokningar `confirmed`/`completed` som slutade för 2 h–3 dygn sedan, ej anonymiserad kund, företaget har på, ingen tidigare inbjudan för bokningen (och ingen till kunden senaste 14 dagarna). Token som `bookings/token.ts`, outbox-mall `solicitudResena` (e-post; SE även sms), dedupe per bokning.
3. **Kundsidan** `/resena/[token]` (SE `/recension/[token]`): stjärnor (radiogrupp), text, sparas med server action bunden till token, IP-rate-limit. Redigerbar 7 dagar.
4. **/[slug]:** snitt + antal i profilhuvudet, sektion "Reseñas" (5 senaste, `?resenas=N` visar fler) + mobilflik. Serverrenderat.
5. **Dashboard** `/app/clientes/resenas` (SE `/app/kunder/recensioner`): filter alla/obesvarade/låga, svara (redigerbart), anmäl med anledning. Länk från Clientes + Mer-arket.
6. **Admin** `/admin/resenas`: anmälda, dölj/återställ, audit-logg.
7. **Dataskydd:** export får `reviews`; anonymisering via trigger. Inställning i Ajustes → Reglas.
8. Copy es-CL + sv-SE, BACKLOG + D-045. Klart när: typecheck + lint gröna, pgTAP grön, berörda tester gröna.
