import globals from "globals";
import pluginJs from "@eslint/js";
import pluginTs from "@typescript-eslint/eslint-plugin";
import parserTs from "@typescript-eslint/parser";

export default [
  { files: ["**/*.{js,mjs,cjs,ts,tsx}"] },
  { ignores: ["node_modules/", ".next/", "dist/", "next-env.d.ts"] },
  {
    languageOptions: {
      globals: { ...globals.browser, ...globals.node },
      parser: parserTs,
    },
  },
  pluginJs.configs.recommended,
  {
    plugins: {
      "@typescript-eslint": pluginTs,
    },
    rules: {
      ...pluginTs.configs.recommended.rules,
      "@typescript-eslint/no-explicit-any": "warn",
      "@typescript-eslint/no-unused-vars": "warn",
      "no-undef": "off",
    },
  },
];
