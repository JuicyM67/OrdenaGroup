// 404 för /v/[token] (WP-23): token okänd/fel form — samma mönster som
// `/r/[token]/not-found.tsx`. `taken`/`expired`/`booked` (token KÄND, men
// erbjudandet inte längre giltigt) visas i stället av `OfferScreen`, inte
// här — se `page.tsx`.
import { vOferta } from "@/i18n";

export default function NotFound() {
  return (
    <main className="flex min-h-dvh flex-col items-center justify-center gap-2 bg-canvas p-8 text-center text-ink">
      <h1 className="font-display text-24 font-semibold tracking-title">
        {vOferta.linkInvalido}
      </h1>
    </main>
  );
}
