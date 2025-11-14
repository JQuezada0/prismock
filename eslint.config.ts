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

// export default defineConfig({
//   parser: '@typescript-eslint/parser',
//   parserOptions: {
//     tsconfigRootDir: __dirname,
//     project: './tsconfig.lint.json',
//   },
//   extends: [
//     'eslint:recommended',
//     'plugin:@typescript-eslint/recommended',
//     'plugin:@typescript-eslint/recommended-requiring-type-checking',
//     'plugin:jest/recommended',
//     'standard',
//     'prettier',
//   ],
//   plugins: ['@typescript-eslint', 'prettier'],
//   rules: {
//     'prettier/prettier': 'error',
//     'no-console': 'warn',
//     'no-unused-vars': 'off',
//     '@typescript-eslint/no-unused-vars': 'off',
//     '@typescript-eslint/no-unsafe-assignment': 'off',
//     'no-use-before-define': 'off',
//     '@typescript-eslint/explicit-module-boundary-types': 'off',
//     '@typescript-eslint/no-empty-function': 'off',
//     '@typescript-eslint/no-floating-promises': 'off',
//     '@typescript-eslint/no-explicit-any': 'off',
//     'import/order': ['error', { 'newlines-between': 'always' }],
//     '@typescript-eslint/unbound-method': 'off',
//     '@typescript-eslint/no-unnecessary-type-assertion': 'off',
//     '@typescript-eslint/no-redundant-type-constituents': 'off',
//     'comma-dangle': [
//       'error',
//       {
//         arrays: 'always-multiline',
//         objects: 'always-multiline',
//         imports: 'always-multiline',
//         exports: 'always-multiline',
//         functions: 'only-multiline',
//       },
//     ],
//     '@typescript-eslint/no-unsafe-call': 'off',
//     '@typescript-eslint/no-unsafe-argument': 'off',
//     '@typescript-eslint/no-non-null-assertion': 'off',
//     '@typescript-eslint/no-unsafe-member-access': 'off',
//     '@typescript-eslint/no-unsafe-return': 'off',
//     'jest/no-standalone-expect': 'off',
//   },
//   overrides: [
//     {
//       files: '**/*.test.ts',
//       rules: {
//         'import/order': ['off'],
//       },
//     },
//   ],
// })
