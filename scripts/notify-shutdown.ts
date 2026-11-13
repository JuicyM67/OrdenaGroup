// WP-91 (D-077): avisa a TODOS los dueños que la plataforma dejará de
// funcionar, para que descarguen sus datos y sus fichas. Términos y Encargo
// prometen al menos 90 días de aviso; el script rechaza una fecha más cercana.
// Körs av en människa, aldrig av en agent mot produktion (regel hård 8).
//
//   npm run notify:shutdown -- 2027-03-01 --dry-run                 # provkör (rollback)
//   DATABASE_URL=… npm run notify:shutdown -- 2027-03-01 --confirm-remote
//
// Köar en rad per företag i `message_outbox` (mallen `avisoCierre`, till
// ägaren, e-post). Workern skickar dem (cron, 50 per pass) och slår upp
// ägarnas adresser vid sändningen (D-029: ingen adress i kön). Idempotent:
// `dedupe_key` innehåller datumet, så en ny körning med samma datum köar
// inget nytt. Fristående (`pg`, inga `@/`-importer).
import pg from "pg";

const MIN_NOTICE_DAYS = 90;
const DAY_MS = 24 * 60 * 60 * 1000;

type Args = { date: string; confirmRemote: boolean; dryRun: boolean };

function parseArgs(argv: readonly string[]): Args | null {
  const confirmRemote = argv.includes("--confirm-remote");
  const dryRun = argv.includes("--dry-run");
  const rest = argv.filter(
    (a) => a !== "--confirm-remote" && a !== "--dry-run",
  );
  if (rest.length !== 1) return null;
  const date = (rest[0] ?? "").trim();
  return /^\d{4}-\d{2}-\d{2}$/.test(date)
    ? { date, confirmRemote, dryRun }
    : null;
}

function isLocalDatabase(url: string): boolean {
  try {
    const host = new URL(url).hostname;
    return host === "127.0.0.1" || host === "localhost" || host === "::1";
  } catch {
    return false;
  }
}

/** "2027-03-01" → "1 de marzo de 2027" (fecha civil, sin zona horaria). */
function fechaLarga(date: string): string {
  const [y, m, d] = date.split("-").map(Number);
  return new Intl.DateTimeFormat("es-CL", {
    day: "numeric",
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  }).format(new Date(Date.UTC(y!, m! - 1, d!)));
}

async function main(): Promise<number> {
  const args = parseArgs(process.argv.slice(2));
  if (!args) {
    console.error(
      "Uso: npm run notify:shutdown -- <AAAA-MM-DD> [--confirm-remote] [--dry-run]",
    );
    return 2;
  }
  const closing = Date.parse(`${args.date}T00:00:00Z`);
  if (Number.isNaN(closing)) {
    console.error("Fecha inválida.");
    return 2;
  }
  const daysAhead = Math.floor((closing - Date.now()) / DAY_MS);
  if (daysAhead < MIN_NOTICE_DAYS) {
    console.error(
      `La fecha de cierre debe estar al menos ${MIN_NOTICE_DAYS} días en el futuro (Términos). Faltan ${daysAhead}.`,
    );
    return 2;
  }
  const url = process.env.DATABASE_URL;
  if (!url) {
    console.error("Falta DATABASE_URL (entorno o .env.local).");
    return 2;
  }
  const local = isLocalDatabase(url);
  if (!local && !args.confirmRemote) {
    console.error(
      "DATABASE_URL no apunta a una base local. Agrega --confirm-remote si de verdad quieres avisar a todos los negocios.",
    );
    return 2;
  }

  const fecha = fechaLarga(args.date);
  const client = new pg.Client({ connectionString: url });
  await client.connect();
  try {
    await client.query("begin");
    const r = await client.query(
      `insert into public.message_outbox
         (business_id, booking_id, channel, recipient_kind, template, payload,
          category, dedupe_key)
       select b.id, null, 'email', 'owner', 'avisoCierre',
              jsonb_build_object('fecha', $1::text), 'utility',
              'avisoCierre:' || $2 || ':' || b.id
         from public.businesses b
        where exists (select 1 from public.memberships m
                       where m.business_id = b.id and m.role = 'owner'
                         and m.support_until is null)
       on conflict (dedupe_key) do nothing`,
      [fecha, args.date],
    );
    await client.query(args.dryRun ? "rollback" : "commit");
    const host = new URL(url).hostname;
    if (args.dryRun) console.log("[dry-run] no se guardó nada (rollback)");
    console.log(`base de datos: ${host}${local ? " (local)" : " (REMOTA)"}`);
    console.log(
      `${r.rowCount ?? 0} avisos encolados para el cierre del ${fecha} (${daysAhead} días de aviso).`,
    );
    return 0;
  } catch (e) {
    await client.query("rollback").catch(() => undefined);
    console.error(e instanceof Error ? e.message : e);
    return 1;
  } finally {
    await client.end();
  }
}

main().then((code) => process.exit(code));
