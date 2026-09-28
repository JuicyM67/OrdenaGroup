#!/usr/bin/env bash
# Kopplar staging (Supabase) till Vercel. Körs av ägaren i egen terminal:
#   bash scripts/setup-staging-env.sh
# Frågar efter Supabase access token och databaslösenord (visas inte).
# Skriver aldrig ut hemligheter, bara förkortade värden.
set -euo pipefail
cd "$(dirname "$0")/.."

REF="bligjpmisejtdnbfwhqx"
APP_URL="https://ordenagroup-matias-lopezs-projects-c1b12c12.vercel.app"
API="https://api.supabase.com/v1/projects/$REF"

read -rsp "Supabase access token (sbp_…): " TOKEN; echo
read -rsp "Databaslösenord för staging: " DBPASS; echo
# Token i en temporär headerfil (0600), inte som curl-argument (syns annars i `ps`).
HDR=$(mktemp); chmod 600 "$HDR"; trap 'rm -f "$HDR"' EXIT
printf 'Authorization: Bearer %s\n' "$TOKEN" > "$HDR"; unset TOKEN
auth=(-H "@$HDR")

echo "1/4 Hämtar publik nyckel…"
PUBLISHABLE=$(curl -fsS "${auth[@]}" "$API/api-keys?reveal=true" | python3 -c '
import json,sys
keys=json.load(sys.stdin)
pick=[k for k in keys if k.get("type")=="publishable"] or [k for k in keys if k.get("name")=="anon"]
print(pick[0]["api_key"])')
echo "   ${PUBLISHABLE:0:16}…"

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

echo "3/4 Sätter inloggningslänkar i Supabase Auth…"
patch_auth() {
  local out
  if ! out=$(curl -sS -w '\n%{http_code}' -X PATCH "${auth[@]}" \
      -H "Content-Type: application/json" "$API/config/auth" -d "$1"); then
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

# Egna e-postmallar kräver egen SMTP i Supabase. Utan det används standardmejlet,
# som appen också hanterar (`?code=` i /auth/confirm).
TPL_JSON=$(python3 -c '
import json,pathlib
d=pathlib.Path("supabase/templates")
print(json.dumps({
  "mailer_subjects_magic_link": "Tu link para entrar",
  "mailer_templates_magic_link_content": (d/"magic_link.html").read_text(),
  "mailer_subjects_confirmation": "Confirma tu cuenta",
  "mailer_templates_confirmation_content": (d/"confirmation.html").read_text(),
}))')
if patch_auth "$TPL_JSON" >/dev/null 2>&1; then
  echo "   E-postmallar satta"
else
  echo "   E-postmallar hoppades över (kräver egen SMTP). Standardmejlet fungerar ändå."
fi

echo "4/4 Lägger in miljövariabler i Vercel (Production)…"
setenv() {
  vercel env rm "$1" production --yes >/dev/null 2>&1 || true
  printf '%s' "$2" | vercel env add "$1" production >/dev/null
  echo "   $1"
}
setenv NEXT_PUBLIC_SUPABASE_ANON_KEY "$PUBLISHABLE"
setenv DATABASE_URL "$DBURL"

CERT=$(ls -t "$HOME"/Downloads/*.crt 2>/dev/null | head -1 || true)
if [ -n "$CERT" ]; then
  setenv DATABASE_CA_CERT "$(cat "$CERT")"
  echo "   (certifikat från $(basename "$CERT"))"
else
  echo "   OBS: inget .crt i Hämtade filer. Ladda ner certifikatet (Project Settings →"
  echo "   Database → SSL Configuration → Download certificate) och kör skriptet igen."
fi

echo "Klart. Värdena gäller från nästa deploy."
