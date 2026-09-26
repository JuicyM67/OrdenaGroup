import coreWebVitals from "eslint-config-next/core-web-vitals";
import nextTypescript from "eslint-config-next/typescript";
import prettier from "eslint-config-prettier";

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
  prettier,
];

export default eslintConfig;
