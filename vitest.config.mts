import { fileURLToPath } from "node:url";

import { defineConfig } from "vitest/config";

// `server-only` kastar utanför villkoret "react-server" (Next); i Vitest
// pekas det på paketets tomma modul (WP-10, src/server/**).
const serverOnly = fileURLToPath(
  new URL("./node_modules/server-only/empty.js", import.meta.url),
);

export default defineConfig({
  resolve: {
    tsconfigPaths: true,
  },
  test: {
    exclude: ["e2e/**"],
    projects: [
      {
        resolve: {
          tsconfigPaths: true,
          alias: { "server-only": serverOnly },
        },
        test: {
          name: "node",
          environment: "node",
          // src/lib/** ägs av WP-04 (format), som lägger sina tester här.
          include: ["src/**/*.test.ts", "src/lib/**/*.test.ts"],
          exclude: ["src/**/*.test.tsx", "e2e/**", "**/*.db.test.ts"],
        },
      },
      {
        resolve: { tsconfigPaths: true },
        test: {
          name: "dom",
          environment: "jsdom",
          include: ["src/**/*.test.tsx"],
          exclude: ["e2e/**"],
          setupFiles: ["./vitest.setup.ts"],
        },
      },
    ],
  },
});
