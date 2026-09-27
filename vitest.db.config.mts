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
    },
  },
});
