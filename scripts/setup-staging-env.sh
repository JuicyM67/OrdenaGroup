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
auth=(-H "Authorization: Bearer $TOKEN")

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
p=[x for x in pools if x.get("pool_mode")=="transaction"] or pools
print(p[0]["connection_string"])')
DBURL="${DBURL/\[YOUR-PASSWORD\]/$DBPASS}"
echo "   ${DBURL%%:*}://…@${DBURL##*@}"

echo "3/4 Sätter inloggningslänkar i Supabase Auth…"
curl -fsS -X PATCH "${auth[@]}" -H "Content-Type: application/json" \
  "$API/config/auth" \
  -d "{\"site_url\":\"$APP_URL\",\"uri_allow_list\":\"$APP_URL/auth/confirm\"}" >/dev/null
echo "   Site URL och redirect satta"

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
