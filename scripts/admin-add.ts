// WP-80 (D-061): lägger in den FÖRSTA plattformsadminen (bootstrap). Alla
// följande admins läggs till i /admin/administradores. Körs av en människa
// — aldrig mot produktion från en agent (regel hård 8).
//
//   npm run admin:add -- mattiasa14@gmail.com                    # lokal databas
//   DATABASE_URL=… npm run admin:add -- <e-post> --confirm-remote  # staging m.fl.
//   npm run admin:add -- <e-post> --dry-run   # provkör i en transaktion som rullas tillbaka
//
// Läser DATABASE_URL (postgres-roll, som `npm run db:*`) och, om kontot
// måste skapas, NEXT_PUBLIC_SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY från
// miljön eller .env.local. Vägrar allt som inte är 127.0.0.1/localhost utan
// `--confirm-remote`. Finns inget auth-konto för e-postadressen skapas det
// (bekräftad e-post, inget lösenord) — personen loggar sedan in med magisk
// länk på /login och skriver in tvåstegsverifiering på /admin/mfa.
// Fristående (`pg` + supabase-js, inga `@/`-importer), körs med Nodes
// inbyggda TypeScript-stöd.
import { createClient } from "@supabase/supabase-js";
import pg from "pg";

type Args = { email: string; confirmRemote: boolean; dryRun: boolean };

function parseArgs(argv: readonly string[]): Args | null {
  const confirmRemote = argv.includes("--confirm-remote");
  const dryRun = argv.includes("--dry-run");
  const rest = argv.filter(
    (a) => a !== "--confirm-remote" && a !== "--dry-run",
  );
  if (rest.length !== 1) return null;
  const email = (rest[0] ?? "").trim().toLowerCase();
  return /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)
    ? { email, confirmRemote, dryRun }
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

async function createAuthUser(email: string): Promise<string> {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) {
    throw new Error(
      "kontot finns inte och NEXT_PUBLIC_SUPABASE_URL/SUPABASE_SERVICE_ROLE_KEY saknas för att skapa det",
    );
  }
  const supabase = createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const { data, error } = await supabase.auth.admin.createUser({
    email,
    email_confirm: true,
  });
  if (error || !data.user) {
    throw new Error(
      `kunde inte skapa auth-kontot: ${error?.message ?? "okänt"}`,
    );
  }
  return data.user.id;
}

async function main(): Promise<number> {
  const args = parseArgs(process.argv.slice(2));
  if (!args) {
    console.error(
      "Användning: npm run admin:add -- <e-post> [--confirm-remote] [--dry-run]",
    );
    return 2;
  }
  const url = process.env.DATABASE_URL;
  if (!url) {
    console.error("DATABASE_URL saknas (miljön eller .env.local).");
    return 2;
  }
  const local = isLocalDatabase(url);
  if (!local && !args.confirmRemote) {
    console.error(
      "DATABASE_URL pekar inte på en lokal databas. Lägg till --confirm-remote om det är meningen (aldrig produktion från en agent).",
    );
    return 2;
  }
  const host = new URL(url).hostname;
  const authUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  if (authUrl && local !== isLocalDatabase(authUrl) && !args.confirmRemote) {
    console.error(
      "DATABASE_URL och NEXT_PUBLIC_SUPABASE_URL pekar på olika miljöer (lokal/fjärr). Avbryter.",
    );
    return 2;
  }

  const client = new pg.Client({ connectionString: url });
  await client.connect();
  try {
    await client.query("begin");
    const found = await client.query<{ id: string }>(
      `select id from auth.users where lower(email) = $1 limit 1`,
      [args.email],
    );
    let userId = found.rows[0]?.id;
    let created = false;
    if (!userId && args.dryRun) {
      // --dry-run: en tillfällig rad i transaktionen (rullas tillbaka), så
      // att resten av vägen provkörs utan att röra GoTrue.
      const tmp = await client.query<{ id: string }>(
        `insert into auth.users (id, email, role, aud)
         values (gen_random_uuid(), $1, 'authenticated', 'authenticated')
         returning id`,
        [args.email],
      );
      userId = tmp.rows[0]!.id;
      created = true;
    } else if (!userId) {
      // Skapas via GoTrue:s admin-API (samma som /admin gör), inte med SQL
      // direkt mot auth-schemat.
      userId = await createAuthUser(args.email);
      created = true;
    }
    const added = await client.query(
      `insert into private.platform_admins (user_id) values ($1)
       on conflict (user_id) do nothing`,
      [userId],
    );
    if (added.rowCount) {
      await client.query(
        `insert into private.admin_audit_log (admin_user_id, action, target_user_id, details)
         values ($1, 'add_admin', $1, $2)`,
        [userId, JSON.stringify({ via: "script", created_account: created })],
      );
    }
    await client.query(args.dryRun ? "rollback" : "commit");

    if (args.dryRun) console.log("[dry-run] inget sparades (rollback)");
    console.log(`databas: ${host}${local ? " (lokal)" : " (FJÄRR)"}`);
    console.log(
      created
        ? `skapade auth-konto ${userId} för ${args.email}`
        : `hittade auth-konto ${userId} för ${args.email}`,
    );
    console.log(
      added.rowCount
        ? "lade till som plattformsadmin (loggat i admin_audit_log)"
        : "var redan plattformsadmin — inget ändrat",
    );
    console.log(
      "nästa steg: logga in med magisk länk på /login och öppna /admin/mfa för tvåstegsverifiering",
    );
    return 0;
  } catch (e) {
    await client.query("rollback").catch(() => undefined);
    throw e;
  } finally {
    await client.end();
  }
}

main().then(
  (code) => process.exit(code),
  (e: unknown) => {
    console.error(
      "admin:add misslyckades",
      e instanceof Error ? e.message : "unknown",
    );
    process.exit(1);
  },
);
