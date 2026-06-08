import js from "@eslint/js";
import tseslint from "typescript-eslint";

export default [
  js.configs.recommended,
  ...tseslint.configs.recommended,
  {
    files: ["bin/**/*.ts", "src/**/*.ts", "test/**/*.ts"],
    languageOptions: {
      ecmaVersion: "latest",
      sourceType: "module",
      globals: {
        AbortController: "readonly",
        console: "readonly",
        fetch: "readonly",
        process: "readonly",
        setTimeout: "readonly",
        clearTimeout: "readonly",
        BufferEncoding: "readonly"
      }
    },
    rules: {
      "no-console": "error",
      "@typescript-eslint/no-explicit-any": "error"
    }
  },
  {
    ignores: ["coverage/**", "node_modules/**"]
  }
];
