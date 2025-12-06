import { defineConfig } from "eslint/config";
import tseslint from 'typescript-eslint';
import eslint from '@eslint/js'
import unusedImports from 'eslint-plugin-unused-imports';

export default defineConfig({
  extends: [
    eslint.configs.recommended,
    tseslint.configs.recommended,
  ],
  plugins: {
    "unused-imports": unusedImports,
  },
  rules: {
    "@typescript-eslint/no-explicit-any": "warn",
    "@typescript-eslint/no-unused-vars": "off",
    "unused-imports/no-unused-imports": "warn",
  },
  ignores: [
    "dist/**",
    "node_modules",
    "build",
  ]
})
