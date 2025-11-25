import { defineConfig } from "eslint/config";
import tseslint from 'typescript-eslint';
import eslint from '@eslint/js'

export default defineConfig({
  extends: [
    eslint.configs.recommended,
    tseslint.configs.recommended,
  ],
  rules: {
    "@typescript-eslint/no-explicit-any": "warn",
    "@typescript-eslint/no-unused-vars": "off",
  },
  ignores: [
    "dist/**",
    "node_modules",
    "build",
  ]
})
