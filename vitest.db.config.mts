import { fileURLToPath } from "node:url";

import { defineConfig } from "vitest/config";

/**
 * Integrationstester mot lokal Supabase (`npm run test:integration`, kräver
 * `npm run db:start`). Bara `*.db.test.ts` i src/server. Filerna körs en i
 * taget (delad databas); `assertLocalDatabase()` i varje fil avbryter om
 * DATABASE_URL inte är lokal (hård regel 8).
 */
const serverOnly = fileURLToPath(
  new URL("./node_modules/server-only/empty.js", import.meta.url),
);

export default defineConfig({
  resolve: {
    tsconfigPaths: true,
    alias: { "server-only": serverOnly },
  },
  test: {
    name: "integration",
    environment: "node",
    include: ["src/server/**/*.db.test.ts"],
    fileParallelism: false,
    testTimeout: 30_000,
    hookTimeout: 60_000,
    env: {
      DATABASE_URL:
        process.env.DATABASE_URL ??
        "postgresql://postgres:postgres@127.0.0.1:54322/postgres",
      // Samtidighetstesterna behöver fler parallella anslutningar än prod (R5).
      DATABASE_POOL_MAX: "8",
      // WP-26 (säkerhetsgranskning, punkt B2): purgeBusiness.db.test.ts anropar
      // den riktiga Storage-API:n via getStorageAdminClient()
      // (src/server/db/pool.ts). De fasta värdena nedan är `supabase start`s
      // egna, publika lokala demo-nycklar (samma för alla lokala installationer,
      // signerade med den likaledes publika demo-JWT_SECRET:en i
      // supabase/config.toml) — inga riktiga hemligheter.
      NEXT_PUBLIC_SUPABASE_URL:
        process.env.NEXT_PUBLIC_SUPABASE_URL ?? "http://127.0.0.1:54321",
      SUPABASE_SERVICE_ROLE_KEY:
        process.env.SUPABASE_SERVICE_ROLE_KEY ??
        "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImV4cCI6MTk4MzgxMjk5Nn0.EGIM96RAZx35lJzdJsyH-qQwv8Hdp7fsn3W0YpN81IU",
    },
  },
});
