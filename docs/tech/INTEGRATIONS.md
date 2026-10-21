# Integrationer

Ägare: `integrations-engineer`. Allt utgående går via `message_outbox`, allt inkommande via verifierade, idempotenta webhooks.

## 1. WhatsApp Cloud API (Meta, direkt)

**Uppsättning (manuell, görs av ägaren av projektet):** Meta Business-konto → verifiering med SpA-dokument → WhatsApp Business-konto → telefonnummer → permanent systemanvändartoken → webhook-URL `/api/webhooks/whatsapp` med verify token → godkända mallar.

**Env:** `WHATSAPP_PHONE_NUMBER_ID`, `WHATSAPP_ACCESS_TOKEN`, `WHATSAPP_APP_SECRET` (signatur `X-Hub-Signature-256`), `WHATSAPP_VERIFY_TOKEN`.

**Mallar (es-CL; texterna ägs av `copywriter-es-cl`, namnen är fasta):**

| Namn | Kategori | Innehåll (sammanfattning) | Knappar |
|---|---|---|---|
| `reserva_confirmada` | utility | {{negocio}}, {{servicio}}, {{fecha}}, {{hora}}, {{profesional}} | URL: gestionar |
| `recordatorio_24h` | utility | påminnelse | Quick reply: *Confirmo* / *Necesito cambiar* |
| `reserva_cancelada` | utility | avbokningsbekräftelse | URL: reservar de nuevo |
| `reserva_movida` | utility | ny tid | URL |
| `lista_espera_oferta` | utility | "Se liberó una hora …" | Quick reply: *Sí, la quiero* / *No, gracias* |
| `lista_espera_tomada` | utility | "Ya fue tomada, sigues en la lista" | – |
| `hora_flash` | marketing | erbjudande, kräver samtycke | URL |
| `te_echamos_de_menos` | marketing | återkomst, kräver samtycke | URL |
| `resumen_semanal` | utility | till ägaren: recuperaste X horas | URL |

**Outbox-worker (`/api/cron/outbox`, varje minut):**
- `select … where status='queued' and next_attempt_at <= now() for update skip locked limit 50`
- Skicka, spara `provider_message_id`, sätt status `sent`. Vid fel: `attempts++`, backoff 1, 5, 15, 60 min; efter 5 försök `dead` + larm.
- Faller WhatsApp: e-post som reserv om kunden har e-post.
- **Kvot:** kontrollera `usage_monthly` mot planen före utskick; marknadsföring kräver `consent_marketing_at` och kund som inte svarat "BAJA".
- `dedupe_key` (t.ex. `reminder:{booking_id}`) förhindrar dubbletter.

**Webhook:** verifiera signatur över rå body → spara i `inbound_events` (idempotens) → hantera statusar (delivered/read/failed) och knappsvar (payload innehåller `booking_id`/`waitlist_entry_id` och en signerad nonce).

## 2. Mercado Pago (handpenning, företagets eget konto)

- OAuth "Conectar Mercado Pago" i ajustes → spara krypterad token och refresh token per företag.
- Bokning med handpenning: status `pending_payment`, `pending_expires_at = now() + 15 min` → Checkout Pro-preferens skapad med **företagets** token, `external_reference = booking_id`, `notification_url` = vår webhook.
- Webhook: verifiera `x-signature`, hämta betalningen från API (lita aldrig på payloaden), idempotent på payment-id → `payments` + booking `confirmed` → bekräftelse.
- Cron frigör obetalda bokningar efter utgångstiden.
- Vi tar ingen `marketplace_fee` i MVP (se D-008).

## 3. Flow (vårt abonnemang)

- Kund = företag; plan = produkt i Flow; återkommande debitering. Webhook uppdaterar `subscriptions`.
- Provperiod 30 dagar → `past_due` → varning dag −3 och −1 → 7 dagars grace → `frozen` (bokningssidan offline, appen läsläge).
- Factura electrónica via OpenFactura (fas 2).

## 4. E-post
- Resend. Samma mallar som WhatsApp som reserv, samt inloggningslänkar.

## 5. Cron-jobb

| Jobb | Frekvens | Gör |
|---|---|---|
| `outbox` | 1 min | skickar kön |
| `reminders` | 5 min | köar `recordatorio_24h` för bokningar 24 h ± 5 min fram |
| `pending-expiry` | 1 min | frigör obetalda bokningar |
| `waitlist-offers` | 1 min | går vidare i sekventiell kö vid utgången tid |
| `win-back` | dagligen 10:00 CLT | köar te_echamos_de_menos |
| `weekly-report` | måndag 08:00 CLT | resumen_semanal |
| `retention` | dagligen | anonymiserar enligt policy |

**D-030 (2026-09-29, ersätter raden ovan för `outbox`):** ingen `pg_cron`/`pg_net`/Vault. `outbox`
anropas i stället av `.github/workflows/outbox-cron.yml` (GitHub Actions, var 5:e minut) mot
`/api/cron/outbox` med `CRON_SECRET` (timing-safe jämförelse) — se WP-16 steg 2. Bekräftelser går
ändå ut inom 1 min via `kickOutbox` (körs direkt efter commit i samma request, oberoende av cron).
Bara 24 h-påminnelsen finns i v1 (ingen 2 h), och den kan komma upp till ~15 min sent. De övriga
jobben i tabellen ovan är oförändrade tills sina respektive WP:er (schemaläggare beslutas då).

Övrigt oförändrat: `pg_cron`/`pg_net` mot `/api/cron/[job]` med `CRON_SECRET` (timing-safe
jämförelse), tills vidare bara relevant för jobb som inte är `outbox`.

**WP-16 steg 1 (db-engineer), schemaändring av `message_outbox`:** kolumnen `to_phone` finns inte —
tabellen lagrar ingen adress alls (varken telefon eller e-post), bara `recipient_kind`
(`customer`/`owner`); adressen slås upp av workern vid utskickstillfället (kundens/personalens
kontaktuppgift via `booking_id`, ägarens e-post via `private.owner_emails()`, service_role-bara).
`channel` har bara `'email'`/`'sms'` i den här fasen (`'sms'` används inte sedan D-062; `'whatsapp'` läggs till som eget enum-värde i
en senare WP, se DATA_MODEL.md). `status` saknar `delivered`/`read` tills leveransstatus-webhooks
byggs; har i stället `cancelled` (väntande påminnelser för en flyttad/avbokad bokning avbryts).

**WP-16 steg 2 (integrations-engineer), `src/server/messaging/outbox/`:**
- `enqueueBookingEvent(e)` (`enqueue.ts`): anropas av bokningsmotorn (`src/server/bookings/`) EFTER
  att bokningstransaktionen committats, öppnar en egen transaktion (`withServiceTx`) och kastar
  aldrig vidare. `created` → kund `reservaConfirmada` + ägare `nuevaReservaDueno` (bara `by ===
  "customer"`) + en köad `recordatorio` vid start − 24 h (hoppas över om det redan är för sent).
  `moved` → avbryter väntande `recordatorio`-rader och köar `reservaMovida` + en ny `recordatorio`
  (roterad token, D-029). `cancelled` → avbryter väntande `recordatorio`-rader och köar
  `reservaCancelada` + ägare `cancelacionDueno` (bara `by === "customer"`). Kanalplan: e-post
  om kunden har en (sms användes bara i Sverige och är borttaget, D-062). Ägaren får
  alltid e-post. `dedupe_key = <mall>:<kanal>:<mottagare>:<booking_id>:<start-epoch>`
  (sekunder), `on conflict do nothing`.
- `processOutbox({ limit, bookingId? })` (`worker.ts`): claim i en kort transaktion (`for update
  skip locked`, `status = 'sending'`, `attempts++`), rader som fastnat i `sending` över 10 min
  återköas. Läser bokning/kund/personal/tjänst/företag (kunddata, inte i kön, D-029) och renderar
  datum/tid i `APP_TZ`/`APP_LOCALE` (`src/lib/format/dates.ts`). Skickar via `sendEmail`
  med `idempotencyKey = dedupe_key` (en ägare med flera konton får `dedupe_key:o<i>` per adress).
  En `recordatorio` för en bokning som inte längre är `confirmed` → `cancelled` utan att skickas.
  Fel: `error` får bara en kort kod (SQLSTATE, `OutboxSendError`-kod eller `http_<status>`), aldrig
  meddelandetext/persondata. Backoff 1/5/15/60 min, `dead` efter 5 försök.
- `kickOutbox()` (`kick.ts`): `after(() => processOutbox({ limit: 10 }))` — bekräftelsen går ut
  inom 1 min oberoende av GitHub Actions-cronen. Utanför en request gör den ingenting.
- `/api/cron/outbox` (POST/GET): `Authorization: Bearer $CRON_SECRET` (timing-safe), 401 annars,
  annars `processOutbox({ limit: 50 })` och räknarna i svaret (aldrig persondata).
- **Env:** `CRON_SECRET` (appen, jämförs i routen), `OUTBOX_CRON_URL_CL` +
  `CRON_SECRET` som GitHub-repohemligheter (`outbox-cron.yml`, satta manuellt av ägaren, aldrig av
  en agent). E-postleverantörens env står i `src/server/messaging/email/send.ts`
  (`RESEND_API_KEY`, `EMAIL_FROM_BOOKING`, `EMAIL_FROM_ACCOUNT`) — saknas de körs fejk-läget (loggar i minnet, skickar inget
  skarpt). Länkarna i meddelandena: `${NEXT_PUBLIC_APP_URL}/r/{token}` (gestión), `/{slug}`
  (`reservaCancelada`, ingen token) och `/app/agenda` (ägarens mejl).
