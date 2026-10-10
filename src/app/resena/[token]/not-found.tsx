// 404 för /resena/[token] (WP-65): okänd, utgången eller ogiltig länk —
// samma enkla läge som `/baja/[token]/not-found.tsx`.
import { resenas } from "@/i18n";

export default function NotFound() {
  return (
    <main className="flex min-h-dvh flex-col items-center justify-center gap-2 bg-canvas p-8 text-center text-ink">
      <h1 className="max-w-sm font-display text-24 font-semibold tracking-title">
        {resenas.formulario.noEncontrada}
      </h1>
    </main>
  );
}
