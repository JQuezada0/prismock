import { defineConfig } from "eslint/config";
import tseslint from 'typescript-eslint';
import jestPlugin from "eslint-plugin-jest"
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
  plugins: {
    jest: jestPlugin,
  },
  ignores: [
    "dist/**",
    "node_modules",
    "build",
  ]
})
