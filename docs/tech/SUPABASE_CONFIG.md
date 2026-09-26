# Supabase-konfiguration: lokalt och prod

`supabase/config.toml` gäller **bara lokalt**. Tabellen nedan är målet för prod-projektet (`sa-east-1`). Värdena sätts manuellt av ägaren i dashboarden när projektet skapas (WP-05/före pilot). Ingen agent ändrar prod.

| Inställning | Lokalt (config.toml) | Prod (mål) | Varför |
|---|---|---|---|
| Postgres major | 17 | 17 | Samma beteende |
| `api.schemas` | `["public"]` | `public` | GraphQL används inte |
| `auth.site_url` | `http://127.0.0.1:3000` | `https://<domän>` (D-001, ej bestämd) | Redirect-bas |
| `auth.additional_redirect_urls` | `https://127.0.0.1:3000` | Bara exakta prod-URL:er (`https://<domän>/auth/callback`). Inga wildcards. Previews går mot egna Supabase-branches. | Förhindrar open redirect |
| `auth.enable_signup` | true | true | Ägaren skapar kontot själv (F1) |
| `auth.enable_anonymous_sign_ins` | false | false | – |
| `auth.enable_manual_linking` | false | false | – |
| `auth.email.enable_confirmations` | false | **true** | Verifierad e-post |
| `auth.email.double_confirm_changes` | true | true | – |
| `auth.email.secure_password_change` | false | **true** | – |
| `auth.email.otp_expiry` | 3600 | **900** (15 min) | Kortare giltighet för magiska länkar |
| `auth.email.max_frequency` | 1s | **60s** | Mot spam |
| `auth.minimum_password_length` / `password_requirements` | 6 / "" | **12 / `lower_upper_letters_digits`** + läckta lösenord-skydd | Lösenord används inte i UI:t, men ska vara starka om de används |
| `auth.jwt_expiry` | 3600 | 3600 | – |
| `auth.enable_refresh_token_rotation` / reuse | true / 10 | true / 10 | – |
| E-post (SMTP) | Lokal mail (`local_smtp`) | **Egen SMTP via Resend**, avsändare på egen domän. `rate_limit.email_sent` höjs (t.ex. 100/h). | Inbyggd SMTP klarar 2 mejl/h |
| `auth.captcha` | av | **Turnstile på** för signup och inloggning före pilot (WP-27) | Mot bottar |
| `auth.sms` | av | av (WhatsApp-kod kommer senare) | – |
| `auth.mfa.totp` | av | av för ägare i v1, **på** för intern admin (F19) | – |
| `db.ssl_enforcement` | av | **på** | – |
| Seed | `db reset` lokalt | **aldrig** | Fiktiv testdata |
| analytics / edge_runtime / storage s3, vector | av | irrelevant (hanteras av plattformen) | – |

## Ändringar i `config.toml` gjorda i WP-01

- `[analytics] enabled = false` — analytics/vector-containern monterar Docker-socketen; avstängt minskar beroendet av det förkravet och startar stacken snabbare.
- `[edge_runtime] enabled = false` — Next-routes används, inte edge functions (D-003).
- `[storage.s3_protocol] enabled = false` och `[storage.vector] enabled = false` — oanvänt i v1. `storage` i sig är kvar (logotyper senare).
- `[api] schemas = ["public"]` — GraphQL (`graphql_public`) används inte och pg_graphql exponerar annars schemaintrospektion. Samma värde är målet i prod.
- Realtime, Studio och `local_smtp` (magiska länkar lokalt) är oförändrade.
- `project_id` och portar är oförändrade (delas av alla worktrees under Våg A, se README "Lokal databas").

Se `docs/tech/DATA_MODEL.md` för schema och invarianter, `CLAUDE.md` för de hårda reglerna.
