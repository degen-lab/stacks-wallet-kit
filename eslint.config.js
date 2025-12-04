import { defineConfig } from 'eslint/config'
import js from '@eslint/js'
import tseslint from 'typescript-eslint'
import prettier from 'eslint-config-prettier'
import importPlugin from 'eslint-plugin-import'

export default defineConfig([
  {
    files: ['**/*.ts', '**/*.tsx', '**/*.md'],
    ignores: ['node_modules/**', 'dist/**'],
    extends: [
      js.configs.recommended,
      ...tseslint.configs.recommended,
      prettier,
    ],
    languageOptions: {
      parser: tseslint.parser,
      parserOptions: {
        ecmaVersion: 'latest',
        sourceType: 'module',
      },
    },
    plugins: {
      '@typescript-eslint': tseslint.plugin,
      import: importPlugin,
    },
    rules: {
      'lines-between-class-members': [
        'error',
        'always',
        { exceptAfterSingleLine: false },
      ],
    },
  },
  // Restrict mobile and web packages to only import from core package index
  {
    files: ['packages/mobile/**/*.ts', 'packages/extension/**/*.ts'],
    rules: {
      'no-restricted-imports': [
        'error',
        {
          patterns: [
            {
              group: [
                '@stacks-wallet-kit/core/*',
                '@stacks-wallet-kit/core/src/**',
              ],
              message:
                'Import only from "@stacks-wallet-kit/core", not from internal paths. Use only what is exported from the core package index.',
            },
            {
              group: ['../../core/src/**', '../../../core/src/**'],
              message:
                'Do not use relative imports to core internal paths. Import from "@stacks-wallet-kit/core" instead.',
            },
          ],
        },
      ],
    },
  },
])
