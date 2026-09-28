// 404 för /{slug} (planens steg 6): `vacios.paginaNoExiste`, samma typografi som
// resten av skärmen, ingen extra design (ingen referens för det här läget).
import { reserva } from "@/i18n";

export default function NotFound() {
  return (
    <main className="flex min-h-dvh flex-col items-center justify-center gap-2 bg-canvas p-8 text-center text-ink">
      <h1 className="font-display text-24 font-semibold tracking-title">
        {reserva.vacios.paginaNoExiste}
      </h1>
    </main>
  );
}
