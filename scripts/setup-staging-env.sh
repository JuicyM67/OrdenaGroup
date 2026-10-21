#!/usr/bin/env bash
# Kopplar staging (Supabase) till Vercel. Körs av ägaren i egen terminal:
#   bash scripts/setup-staging-env.sh        # Ordena Calendar, projekt ordenagroup
# Frågar efter Supabase access token och databaslösenord (visas inte).
# Skriver aldrig ut hemligheter, bara förkortade värden.
set -euo pipefail
cd "$(dirname "$0")/.."

SCOPE="matias-lopezs-projects-c1b12c12"
REF="bligjpmisejtdnbfwhqx"
APP_URL="https://ordenagroup-matias-lopezs-projects-c1b12c12.vercel.app"
VERCEL_PROJECT="ordenagroup"
TEMPLATE_DIR="es-CL"
SMTP_ADMIN_EMAIL="administracion@ordenagroup.cl"
SMTP_SENDER_NAME="Ordena Calendar"
API="https://api.supabase.com/v1/projects/$REF"
# Vercel-kommandona körs i en tillfällig mapp länkad till rätt projekt.
LINK=$(mktemp -d)
vercel link --yes --project "$VERCEL_PROJECT" --scope "$SCOPE" --cwd "$LINK" >/dev/null

read -rsp "Supabase access token (sbp_…): " TOKEN; echo
read -rsp "Databaslösenord (tom = hoppa över databas, t.ex. bara mejl/SMTP): " DBPASS; echo
# Token i en temporär headerfil (0600), inte som curl-argument (syns annars i `ps`).
HDR=$(mktemp); chmod 600 "$HDR"; trap 'rm -rf "$HDR" "$LINK"' EXIT
printf 'Authorization: Bearer %s\n' "$TOKEN" > "$HDR"

unset TOKEN
auth=(-H "@$HDR")

echo "1/4 Hämtar publik nyckel…"
PUBLISHABLE=$(curl -fsS "${auth[@]}" "$API/api-keys?reveal=true" | python3 -c '
import json,sys
keys=json.load(sys.stdin)
pick=[k for k in keys if k.get("type")=="publishable"] or [k for k in keys if k.get("name")=="anon"]
print(pick[0]["api_key"])')
echo "   ${PUBLISHABLE:0:16}…"

DBURL=""
if [ -n "$DBPASS" ]; then
echo "2/4 Hämtar anslutning via Supavisor (transaction mode)…"
DBURL=$(curl -fsS "${auth[@]}" "$API/config/database/pooler" | python3 -c '
import json,sys
pools=json.load(sys.stdin)
p=[x for x in pools if x.get("pool_mode")=="transaction"]
if not p: sys.exit("Ingen pool i transaction mode hittades")
print(p[0]["connection_string"])')
ENCPASS=$(DBPASS="$DBPASS" python3 -c 'import os,urllib.parse;print(urllib.parse.quote(os.environ["DBPASS"],safe=""))')
DBURL="${DBURL/\[YOUR-PASSWORD\]/$ENCPASS}"; unset DBPASS ENCPASS
echo "   ${DBURL%%:*}://…@${DBURL##*@}"
else
  echo "2/4 Databas hoppas över (inget lösenord angivet)"
fi

echo "3/4 Sätter inloggningslänkar i Supabase Auth…"
patch_auth() {
  local out
  if ! out=$(curl -sS -w '\n%{http_code}' -X PATCH "${auth[@]}" \
      -H "Content-Type: application/json" "$API/config/auth" --data-binary @- <<<"$1"); then
    return 1
  fi
  [ "${out##*$'\n'}" = "200" ] || { echo "   Supabase svarade: ${out%$'\n'*}" | head -c 300; echo; return 1; }
}
BASE_JSON=$(APP_URL="$APP_URL" python3 -c '
import json,os
print(json.dumps({"site_url": os.environ["APP_URL"],
  "uri_allow_list": os.environ["APP_URL"] + "/auth/confirm",
  "mailer_otp_exp": 900}))')
patch_auth "$BASE_JSON" || { echo "   Kunde inte sätta Site URL/redirect."; exit 1; }
echo "   Site URL och redirect satta"

# Egna e-postmallar kräver egen SMTP i Supabase (annars ignorerar Supabase
# `mailer_templates_*_content` och skickar sitt eget standardmejl, som appen
# också hanterar via `?code=` i /auth/confirm). Fråga efter en Resend-nyckel
# (tyst inmatning, aldrig loggad/som argument): om ägaren ger en sätts SMTP
# mot smtp.resend.com och mallarna tas i bruk på riktigt; annars hoppas SMTP
# över och mallarna sätts ändå (best effort, ignoreras tills SMTP finns).
read -rsp "Resend API-nyckel för $SMTP_ADMIN_EMAIL (tom = hoppa över SMTP): " RESEND_KEY; echo
if [ -n "$RESEND_KEY" ]; then
  SMTP_JSON=$(RESEND_KEY="$RESEND_KEY" SMTP_ADMIN_EMAIL="$SMTP_ADMIN_EMAIL" SMTP_SENDER_NAME="$SMTP_SENDER_NAME" python3 -c '
import json,os
print(json.dumps({
  "smtp_host": "smtp.resend.com",
  "smtp_port": "465",
  "smtp_user": "resend",
  "smtp_pass": os.environ["RESEND_KEY"],
  "smtp_admin_email": os.environ["SMTP_ADMIN_EMAIL"],
  "smtp_sender_name": os.environ["SMTP_SENDER_NAME"],
}))')
  unset RESEND_KEY
  # Felmeddelandet från Supabase visas (innehåller aldrig nyckeln).
  if patch_auth "$SMTP_JSON"; then
    echo "   SMTP satt (smtp.resend.com, avsändare $SMTP_ADMIN_EMAIL)"
    patch_auth '{"rate_limit_email_sent": 100}' >/dev/null 2>&1 \
      && echo "   Gräns för e-post höjd till 100/h" \
      || echo "   Kunde inte höja e-postgränsen (sätt den i Supabase → Authentication → Rate Limits)."
  else
    echo "   Kunde inte sätta SMTP. Mallarna sätts ändå (ignoreras av Supabase tills SMTP finns)."
  fi
else
  unset RESEND_KEY
  echo "   SMTP hoppat över. Mallarna sätts ändå (ignoreras av Supabase tills SMTP finns)."
fi

# Mallarna: samma HTML/ämnen som `supabase/templates/$TEMPLATE_DIR/`
# (genererade av `scripts/render-auth-templates.ts` från `email.acceso.*`,
# se den filen för hur man regenererar dem efter en textändring).
TPL_JSON=$(TEMPLATE_DIR="$TEMPLATE_DIR" python3 -c '
import json,os,pathlib
d=pathlib.Path("supabase/templates")/os.environ["TEMPLATE_DIR"]
subjects=json.loads((d/"subjects.json").read_text())
print(json.dumps({
  "mailer_subjects_magic_link": subjects["magic_link"],
  "mailer_templates_magic_link_content": (d/"magic_link.html").read_text(),
  "mailer_subjects_confirmation": subjects["confirmation"],
  "mailer_templates_confirmation_content": (d/"confirmation.html").read_text(),
}))')
if patch_auth "$TPL_JSON"; then
  echo "   E-postmallar satta ($TEMPLATE_DIR)"
else
  echo "   E-postmallar hoppades över. Standardmejlet fungerar ändå."
fi

echo "4/4 Lägger in miljövariabler i Vercel (Production)…"
setenv() {
  vercel env rm "$1" production --yes --cwd "$LINK" >/dev/null 2>&1 || true
  printf '%s' "$2" | vercel env add "$1" production --cwd "$LINK" >/dev/null
  echo "   $1"
}
setenv NEXT_PUBLIC_SUPABASE_URL "https://$REF.supabase.co"
setenv NEXT_PUBLIC_SUPABASE_ANON_KEY "$PUBLISHABLE"
setenv NEXT_PUBLIC_APP_URL "$APP_URL"
if [ -n "$DBURL" ]; then
setenv DATABASE_URL "$DBURL"

CERT=$(ls -t "$HOME"/Downloads/*.crt 2>/dev/null | head -1 || true)
if [ -n "$CERT" ]; then
  setenv DATABASE_CA_CERT "$(cat "$CERT")"
  echo "   (certifikat från $(basename "$CERT"))"
else
  echo "   OBS: inget .crt i Hämtade filer. Ladda ner certifikatet (Project Settings →"
  echo "   Database → SSL Configuration → Download certificate) och kör skriptet igen."
fi
fi

echo "Klart ($VERCEL_PROJECT). Vercel-värdena gäller från nästa deploy."
