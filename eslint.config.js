import js from "@eslint/js";
import reactHooks from "eslint-plugin-react-hooks";
import globals from "globals";

/* ESLint — safety net for a repo with no tests or types.
   Philosophy: errors are reserved for things that are real bugs
   (undefined variables, broken hook usage); style is not enforced.
   Run with: npm run lint */

export default [
  { ignores: ["dist/**", "node_modules/**", "briefing-generator/**", ".claude/**"] },

  js.configs.recommended,

  // Browser/React code
  {
    files: ["src/**/*.{js,jsx}"],
    plugins: { "react-hooks": reactHooks },
    languageOptions: {
      ecmaVersion: 2024,
      sourceType: "module",
      parserOptions: { ecmaFeatures: { jsx: true } },
      globals: { ...globals.browser },
    },
    rules: {
      ...reactHooks.configs.recommended.rules,
      // React Compiler advisory rules — real improvements but not bugs;
      // surfaced as warnings so lint stays a hard gate for actual breakage.
      "react-hooks/exhaustive-deps": "warn",
      "react-hooks/set-state-in-effect": "warn",
      "react-hooks/immutability": "warn",
      "react-hooks/use-memo": "warn",
      "react-hooks/refs": "warn",
      "react-hooks/preserve-manual-memoization": "warn",
      // Intentional empty catch blocks ("best effort") are a house pattern.
      "no-empty": ["error", { allowEmptyCatch: true }],
      // JSX component usage looks "unused" to core ESLint without the react
      // plugin (not yet compatible with our ESLint version) — varsIgnorePattern
      // keeps imported-component false positives quiet while still catching
      // genuinely unused lowercase variables.
      "no-unused-vars": ["error", {
        varsIgnorePattern: "^[A-Z_]",
        argsIgnorePattern: "^_",
        caughtErrors: "none",
      }],
    },
  },

  // Cloudflare Pages Functions (workers runtime)
  {
    files: ["functions/**/*.js"],
    languageOptions: {
      ecmaVersion: 2024,
      sourceType: "module",
      globals: {
        ...globals.worker,
        atob: "readonly",
        btoa: "readonly",
        console: "readonly",
        fetch: "readonly",
        Response: "readonly",
        Request: "readonly",
        URL: "readonly",
        AbortController: "readonly",
        setTimeout: "readonly",
        clearTimeout: "readonly",
        crypto: "readonly",
        TextEncoder: "readonly",
        TextDecoder: "readonly",
        HTMLRewriter: "readonly",
      },
    },
    rules: {
      "no-empty": ["error", { allowEmptyCatch: true }],
      "no-unused-vars": ["error", { varsIgnorePattern: "^_", argsIgnorePattern: "^_", caughtErrors: "none" }],
    },
  },

  // Node-based unit tests
  {
    files: ["tests/**/*.js", "vite.config.js"],
    languageOptions: {
      ecmaVersion: 2024,
      sourceType: "module",
      globals: { ...globals.node },
    },
  },
];
