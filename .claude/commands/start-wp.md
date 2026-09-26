---
description: Starta ett arbetspaket från BACKLOG (plan → godkännande → bygg → granska)
argument-hint: <WP-id, t.ex. WP-10>
---

Starta arbetspaket **$ARGUMENTS**.

1. Läs `docs/tasks/BACKLOG.md`. Kontrollera att alla beroenden för $ARGUMENTS är ☑. Om inte: stoppa och säg vad som saknas.
2. Använd agenten `planner` för att skriva planen i `docs/tasks/plans/$ARGUMENTS.md`. Visa mig planen och **vänta på mitt godkännande**. Svara på eventuella `FRÅGA:` innan du går vidare.
3. Skapa branchen `wp/$ARGUMENTS-<kort-namn>` (i den aktuella worktreen).
4. Delegera stegen till agenten eller agenterna som står som ägare i planen. Håll dem inom sina mappar.
5. Efter implementationen: kör `npm run typecheck && npm run lint && npm run test` (+ `test:db`, `visual` om relevant).
6. Låt `qa-reviewer` granska. Rör ändringen `supabase/`, `src/app/api/`, auth eller betalningar: låt även `security-reviewer` granska.
7. Åtgärda blockerande fynd, uppdatera status i BACKLOG.md och sammanfatta för mig: vad som byggts, testresultat, visuell avvikelse och öppna frågor.
