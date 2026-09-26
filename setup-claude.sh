#!/usr/bin/env bash
# Kör en gång från projektmappen:  bash setup-claude.sh
# Flyttar agenter, slash-kommandon och inställningar till .claude/ där Claude Code hittar dem.
set -euo pipefail
cd "$(dirname "$0")"
mkdir -p .claude
cp -R claude-config/agents claude-config/commands .claude/
cp claude-config/settings.json .claude/settings.json
echo "Klart: $(ls .claude/agents | wc -l | tr -d ' ') agenter och $(ls .claude/commands | wc -l | tr -d ' ') kommandon installerade i .claude/"
echo "Du kan nu ta bort mappen claude-config/ om du vill."
