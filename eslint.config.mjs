import coreWebVitals from "eslint-config-next/core-web-vitals";
import nextTypescript from "eslint-config-next/typescript";
import betterTailwindcssPlugin from "eslint-plugin-better-tailwindcss";
import prettier from "eslint-config-prettier";

// Hård regel 1 / D-015: bara tokens från src/styles/tokens.css. Den här regeln fångar
// hex-koder, färgfunktioner och godtyckliga Tailwind-värden ([…]) i komponenter och
// appens sidor, i stället för att förlita sig på granskaren (WP-02 steg 1, FRÅGA 10).
const rawValueMessage =
  "Inga hex-värden, färgfunktioner eller godtyckliga Tailwind-värden här. Lägg till en token i src/styles/tokens.css och använd den (se docs/design/DESIGN.md).";

const rawValuePatterns = [
  "#[0-9a-fA-F]{3,8}\\b",
  "\\b(rgba?|hsla?|oklch|oklab)\\(",
  "(^|[\\s:])(-?[a-z0-9-]+-)?\\[[^\\]]+\\]",
  "-\\(--",
];

const noRestrictedRawValues = rawValuePatterns.flatMap((pattern) => [
  {
    selector: `Literal[value=/${pattern}/]`,
    message: rawValueMessage,
  },
  {
    selector: `TemplateElement[value.raw=/${pattern}/]`,
    message: rawValueMessage,
  },
]);

// `style`-attributet kringgår tokens helt. Förbjudet bara i de generella komponenterna —
// design-lab (crops m.fl.) får fortfarande använda style för enstaka px-positioner som inte
// går att uttrycka i spacing-skalan (WP-02 steg 7, R7). Måste läggas i SAMMA
// no-restricted-syntax-array som noRestrictedRawValues för src/components/**, eftersom ESLint
// flat config låter en senare matchande config helt ERSÄTTA (inte slå ihop) en tidigare
// regels värde för samma regelnamn och samma fil.
const noStyleAttribute = {
  selector: "JSXAttribute[name.name='style']",
  message:
    "Inget style-attribut i src/components/. Använd tokens/Tailwind-klasser (se docs/design/DESIGN.md).",
};

const eslintConfig = [
  {
    ignores: [
      ".next/**",
      "coverage/**",
      "playwright-report/**",
      "test-results/**",
      ".visual-diff/**",
      "docs/**",
    ],
  },
  ...coreWebVitals,
  ...nextTypescript,
  {
    // src/app/** (inkl. design-lab) får rå-värde-kontrollen men inte style-förbudet.
    files: ["src/app/**/*.{ts,tsx}"],
    ignores: ["**/*.test.ts", "**/*.test.tsx"],
    rules: {
      "no-restricted-syntax": ["error", ...noRestrictedRawValues],
    },
  },
  {
    // src/components/** får båda i samma regel (se kommentaren vid noStyleAttribute ovan).
    files: ["src/components/**/*.{ts,tsx}"],
    ignores: ["**/*.test.ts", "**/*.test.tsx"],
    rules: {
      "no-restricted-syntax": [
        "error",
        ...noRestrictedRawValues,
        noStyleAttribute,
      ],
    },
  },
  {
    files: ["src/components/**/*.{ts,tsx}", "src/app/**/*.{ts,tsx}"],
    ignores: ["**/*.test.ts", "**/*.test.tsx"],
    plugins: {
      "better-tailwindcss": betterTailwindcssPlugin,
    },
    settings: {
      "better-tailwindcss": {
        entryPoint: "src/app/globals.css",
      },
    },
    rules: {
      "better-tailwindcss/no-unknown-classes": "error",
    },
  },
  {
    // R9: fixtures i design lab är testdata, inte produkttext, och får bara användas där.
    files: ["src/**/*.{ts,tsx}"],
    ignores: ["src/app/design-lab/**/*.{ts,tsx}"],
    rules: {
      "no-restricted-imports": [
        "error",
        {
          patterns: [
            {
              group: [
                "*/design-lab/_fixtures/*",
                "@/app/design-lab/_fixtures/*",
              ],
              message:
                "Fixtures i design lab (R9) är testdata och får bara importeras inuti src/app/design-lab/.",
            },
          ],
        },
      ],
    },
  },
  prettier,
];

export default eslintConfig;
