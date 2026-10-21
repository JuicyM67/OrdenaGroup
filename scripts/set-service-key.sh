#!/usr/bin/env bash
# WP-26/27: lägger in SUPABASE_SERVICE_ROLE_KEY (Supabase "secret"-nyckel) i Vercel,
# behövs för att purgeBusiness ska kunna tömma bildmappen via Storage API.
# Körs av ägaren i egen terminal:
#   bash scripts/set-service-key.sh        # ordenagroup
# Frågar efter Supabase access token (visas inte). Skriver aldrig ut nyckeln.
set -euo pipefail
cd "$(dirname "$0")/.."

SCOPE="matias-lopezs-projects-c1b12c12"
REF="bligjpmisejtdnbfwhqx"
VERCEL_PROJECT="ordenagroup"
read -rsp "Supabase access token (sbp_…): " TOKEN; echo

KEY=$(curl -fsS -H "Authorization: Bearer $TOKEN" \
  "https://api.supabase.com/v1/projects/$REF/api-keys?reveal=true" | python3 -c '
import json,sys
keys=json.load(sys.stdin)
pick=[k for k in keys if k.get("type")=="secret"] or [k for k in keys if k.get("name")=="service_role"]
print(pick[0]["api_key"])')
unset TOKEN
echo "Hittade nyckel (${KEY:0:10}…)"

LINK=$(mktemp -d)
vercel link --yes --project "$VERCEL_PROJECT" --scope "$SCOPE" --cwd "$LINK" >/dev/null
vercel env rm SUPABASE_SERVICE_ROLE_KEY production --yes --cwd "$LINK" >/dev/null 2>&1 || true
printf '%s' "$KEY" | vercel env add SUPABASE_SERVICE_ROLE_KEY production --cwd "$LINK" >/dev/null
unset KEY
rm -rf "$LINK"
echo "Klart: SUPABASE_SERVICE_ROLE_KEY satt i $VERCEL_PROJECT (gäller från nästa deploy)."
