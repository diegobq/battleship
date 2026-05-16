import { defineConfig } from "eslint/config";
import eslintConfigPrettier from "eslint-config-prettier";
import tseslint from "typescript-eslint";

export default defineConfig([
  ...tseslint.configs.recommended,
  eslintConfigPrettier,
]);
