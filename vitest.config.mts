import { defineConfig } from "vitest/config";

export default defineConfig({
  resolve: {
    tsconfigPaths: true,
  },
  test: {
    exclude: ["e2e/**"],
    projects: [
      {
        resolve: { tsconfigPaths: true },
        test: {
          name: "node",
          environment: "node",
          // src/lib/** ägs av WP-04 (format), som lägger sina tester här.
          include: ["src/**/*.test.ts", "src/lib/**/*.test.ts"],
          exclude: ["src/**/*.test.tsx", "e2e/**"],
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
