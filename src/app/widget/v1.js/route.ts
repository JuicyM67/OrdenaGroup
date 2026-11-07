// WP-82 (D-067): loadern som företag lägger på sin egen sida. Se `loader-source.ts`.
import { widgets } from "@/i18n";
import { buildLoaderSource } from "@/lib/widgets/loader-source";

// Adressen tas från anropet (produktionsdomänen i drift, preview/lokalt sin egen värd)
// och bakas in i skriptet; CDN:et cachar per värd. Läses aldrig ur `script.src` på
// kundens sida (cacheplugin kan kopiera skriptet till kundens domän, BookingBuddy WP-104).
export function GET(request: Request): Response {
  const source = buildLoaderSource({
    origin: new URL(request.url).origin,
    dialogTitle: widgets.visitante.dialogo.titulo,
    frameTitles: {
      resenas: widgets.panel.tipo.resenas.nombre,
      boton: widgets.panel.tipo.boton.nombre,
      reserva: widgets.visitante.incrustada.titulo,
    },
  });
  return new Response(source, {
    headers: {
      "Content-Type": "text/javascript; charset=utf-8",
      // En timme i webbläsaren, en dag på CDN:et; ändringar i v1 får därför en viss fördröjning.
      "Cache-Control":
        "public, max-age=3600, s-maxage=86400, stale-while-revalidate=86400",
      "X-Content-Type-Options": "nosniff",
    },
  });
}
