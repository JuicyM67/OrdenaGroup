---
description: Granska nuvarande branch med qa-reviewer (och security-reviewer vid behov)
---

Granska den nuvarande branchen mot `main`.

1. Kör agenten `qa-reviewer` på diffen.
2. Om diffen rör `supabase/`, `src/app/api/`, `src/server/payments/`, auth eller persondata: kör även `security-reviewer`.
3. Slå ihop rapporterna till en lista: Blockerande / Bör fixas / Kan vänta. Rätta inget innan jag har sett listan.
