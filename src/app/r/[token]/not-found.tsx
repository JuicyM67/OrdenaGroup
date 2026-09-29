// 404 för /r/[token] (planens steg 5): `gestion.linkInvalido`, samma
// typografi som `/[slug]/not-found.tsx` — ingen egen design för det här
// läget (härlett, som resten av `/r/[token]`).
import { gestion } from "@/i18n";

export default function NotFound() {
  return (
    <main className="flex min-h-dvh flex-col items-center justify-center gap-2 bg-canvas p-8 text-center text-ink">
      <h1 className="font-display text-24 font-semibold tracking-title">
        {gestion.linkInvalido}
      </h1>
    </main>
  );
}
