# Integrationer

Ägare: `integrations-engineer`. Allt utgående går via `message_outbox`, allt inkommande via verifierade, idempotenta webhooks.

## 1. WhatsApp Cloud API (Meta, direkt)

**Uppsättning (manuell, görs av ägaren av projektet):** Meta Business-konto → verifiering med SpA-dokument → WhatsApp Business-konto → telefonnummer → permanent systemanvändartoken → webhook-URL `/api/webhooks/whatsapp` med verify token → godkända mallar. Stegen i detalj: "Driftsättning (D-063)" nedan.

**Env:** `WHATSAPP_PHONE_NUMBER_ID`, `WHATSAPP_ACCESS_TOKEN`, `WHATSAPP_APP_SECRET` (signatur `X-Hub-Signature-256`), `WHATSAPP_VERIFY_TOKEN`, `WHATSAPP_GRAPH_VERSION` (valfri, standard `v23.0`), **`WHATSAPP_TEMPLATES_APPROVED`** (vilka mallar som får gå på WhatsApp), `WHATSAPP_FAKE` (`1` = fejkläge lokalt/CI, ignoreras i Vercel production). Se `.env.example`.

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

**Webhook:** verifiera signatur över rå body → spara i `inbound_events` (idempotens) → hantera statusar (delivered/read/failed) och knappsvar. *D-063 ersätter "payload innehåller `booking_id`/`waitlist_entry_id` och en signerad nonce":* knappsvaret binds till vårt eget meddelande via `context.id` (= `message_outbox.wa_message_id`) och avsändaren måste vara kundens nummer på raden; payloaden bär bara åtgärden.

### WhatsApp i utkorgen (D-063, `src/server/messaging/whatsapp/`)

- **Mallar och parametrar:** `templates.ts` bygger de sex mallarna med parametrarna i kontraktets ordning (`docs/content/whatsapp-templates.md`, `plantillasWhatsapp`), språk `es`. URL-knapparna får suffixet (`/r/{token}` resp. `/{slug}`), quick reply-knapparna en payload: `confirmo`, `cambiar` (påminnelsen), `si:<start s>:<offered_at s>`, `no:<offered_at s>` (väntelistan). Utkorgens interna mallnamn → Meta: `reservaConfirmada` → `reserva_confirmada`, `recordatorio` → `recordatorio_24h`, `reservaCancelada` → `reserva_cancelada`, `reservaMovida` → `reserva_movida`, `listaEsperaCupo` → `lista_espera_oferta`, `listaEsperaTomada` → `lista_espera_tomada`.
- **Kanalval (`channel.ts`):** WhatsApp när kunden har ett aktivt WhatsApp-samtycke (senaste `consent_events` med `kind = 'whatsapp'`), ett chilenskt mobilnummer (`+569` + 8 siffror), WhatsApp är konfigurerat (`live`/`fake`) och mallen står i `WHATSAPP_TEMPLATES_APPROVED`; annars e-post om kunden har en. Köningen gissar, **workern avgör vid sändningen** (samtycket sparas efter bokningens commit; påminnelsen köas 24 h+ i förväg) och byter radens kanal åt båda hållen. Ägaren, förfrågningar, inbjudningar, kampanjer och recensioner är oförändrat e-post.
- **Fel (`errors.ts`):** permanent (t.ex. 131026 inte på WhatsApp, 131009/100 ogiltigt nummer, 132000–132016 mallfel, 190/10/200 token/behörighet) → raden byter till e-post i samma pass (`fallback_reason = wa_<kod>`); utan e-post `dead`. Tillfälligt (rate limit 4/80007/130429/131048/131056, 131000/131016/133004, 5xx, nätverk) → utkorgens backoff; sista försöket blir e-post i stället för `dead`.
- **Token (D-029/D-063):** en rad som skickats via WhatsApp behåller `payload` (token till e-postreserven) tills webhooken rapporterar `delivered`/`read`/`failed`, högst 24 h efter `sent_at` (workern städar).
- **Fake (`client.ts`):** `WHATSAPP_FAKE=1` utan nycklar → inget skickas, meddelandet sparas i minnet med maskerat nummer (`fakeWhatsAppOutbox`). Aldrig i Vercel production.

### Webhooken `/api/webhooks/whatsapp` (D-063)

- `GET`: `hub.mode=subscribe` + `hub.verify_token` (konstant tid mot `WHATSAPP_VERIFY_TOKEN`) → `hub.challenge` som `text/plain`; annars 403.
- `POST`: 503 utan `WHATSAPP_APP_SECRET`; 401 vid saknad/fel `X-Hub-Signature-256` (HMAC-SHA256 över rå body, konstant tid) — före JSON-parsning. Bara `field = messages` och vårt `phone_number_id`. Varje status/meddelande är en händelse i `inbound_events` (`provider = 'whatsapp'`, `status:<wamid>:<status>` / `msg:<wamid>`, payload = bara typen); hanterad händelse hoppas över, fel → 500 så att Meta skickar om.
- **Statusar:** `delivered`/`read` → `delivered_at`/`read_at`, payload töms; `failed` (bara medan raden är `sent` och inte levererad) → e-post (permanent) eller nytt WhatsApp-försök (tillfälligt).
- **Knappsvar:** *Confirmo* → `bookings.confirmed_by_customer_at` (bara om bokningen fortfarande är `confirmed`, inte passerat och har samma starttid som påminnelsen); *Necesito cambiar* → ägarmejl `clienteQuiereCambiar` via utkorgen, inget automatiskt svar till kunden; *Sí, la quiero* → `claimWaitlistOfferForEntry` (samma motor som `/v/[token]`, först till kvarn, servern räknar om tiden, erbjudandet måste vara det som meddelandet gällde) — redan tagen → `lista_espera_tomada`; *No, gracias* → posten `expired`, sekventiellt läge erbjuder nästa i kön.
- **Fritext/media:** sparas inte (bara typen i `inbound_events`), inget svar.
- Loggar bara räknare/SQLSTATE — aldrig telefon, namn, text eller hemligheter.

### Driftsättning (D-063) — när Meta-uppgifterna finns

1. **Vercel** (Project → Settings → Environment Variables, Production; samma i staging-miljön med testnumret): `WHATSAPP_ACCESS_TOKEN` (permanent systemanvändartoken med `whatsapp_business_messaging` + `whatsapp_business_management`), `WHATSAPP_PHONE_NUMBER_ID`, `WHATSAPP_APP_SECRET` (App Dashboard → Settings → Basic → App secret), `WHATSAPP_VERIFY_TOKEN` (egen slumpsträng, t.ex. `openssl rand -hex 32`), `WHATSAPP_TEMPLATES_APPROVED` (tomt tills mallarna är godkända). Sätt **inte** `WHATSAPP_FAKE` i production. Deploya om.
2. **Meta App Dashboard → WhatsApp → Configuration → Webhook:** Callback URL `https://<domän>/api/webhooks/whatsapp`, Verify token = samma värde som `WHATSAPP_VERIFY_TOKEN` → *Verify and save* (Meta gör GET-verifieringen). Under *Webhook fields*: prenumerera på **`messages`** (inkommande meddelanden, knappsvar och leveransstatusar kommer alla i det fältet). `message_template_status_update` behövs inte (hanteras inte).
3. **Mallar:** skicka in de tre utan URL (`recordatorio_24h`, `lista_espera_oferta`, `lista_espera_tomada`) direkt; de tre med URL-knapp när domänen är bestämd (bas-URL `https://<domän>/r/` resp. `https://<domän>/`, samma bas som `NEXT_PUBLIC_APP_URL`). När Meta godkänt en mall: lägg till namnet i `WHATSAPP_TEMPLATES_APPROVED` och deploya om — det är hela påslaget.
4. Kontroll: `curl "https://<domän>/api/webhooks/whatsapp?hub.mode=subscribe&hub.verify_token=<token>&hub.challenge=123"` ska svara `123`.

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
`channel` hade bara `'email'`/`'sms'` i den här fasen (`'sms'` används inte sedan D-062; `'whatsapp'` lades till i
`20261021010000_whatsapp_enum_values.sql`, D-063). `status` saknar `delivered`/`read` tills leveransstatus-webhooks
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
