import js from '@eslint/js'
import tsPlugin from '@typescript-eslint/eslint-plugin'
import tsParser from '@typescript-eslint/parser'
import vuePlugin from 'eslint-plugin-vue'
import eslintConfigPrettier from 'eslint-config-prettier'

// typescript-eslint exposes its preset as a flat-config array; flatten the
// rule objects so we can reuse them (the eslintrc-style `.rules` only carries
// a few rules because it relies on `extends`).
const flattenRules = configArray =>
  configArray.reduce((acc, config) => ({ ...acc, ...(config.rules || {}) }), {})

const tsRules = flattenRules(tsPlugin.configs['flat/recommended'])

export default [
  // Global ignores
  {
    ignores: [
      'node_modules/**',
      'build/**',
      'dist/**',
      '.output/**',
      '.wxt/**',
      '.test-files/**',
      '*.js',
      'auto-imports.d.ts',
      'components.d.ts',
    ],
  },

  // Base JS recommended rules
  js.configs.recommended,

  // Vue flat recommended preset (sets vue-eslint-parser + comment-directive
  // processor + all Vue 3 rules, scoped to *.vue).
  ...vuePlugin.configs['flat/recommended'],

  // TypeScript configuration for plain .ts files
  {
    files: ['**/*.ts'],
    languageOptions: {
      parser: tsParser,
      parserOptions: {
        ecmaVersion: 'latest',
        sourceType: 'module',
      },
    },
    plugins: {
      '@typescript-eslint': tsPlugin,
    },
    rules: {
      ...tsRules,
      '@typescript-eslint/no-unused-vars': ['warn', { argsIgnorePattern: '^_' }],
      '@typescript-eslint/no-explicit-any': 'warn',
    },
  },

  // Add TypeScript parsing + rules to <script> blocks in .vue files. The Vue
  // preset above already set vue-eslint-parser; here we only wire the inner
  // TS parser and TS rules.
  {
    files: ['**/*.vue'],
    languageOptions: {
      parserOptions: {
        parser: tsParser,
        ecmaVersion: 'latest',
        sourceType: 'module',
        extraFileExtensions: ['.vue'],
      },
    },
    plugins: {
      '@typescript-eslint': tsPlugin,
    },
    rules: {
      ...tsRules,
      '@typescript-eslint/no-unused-vars': ['warn', { argsIgnorePattern: '^_' }],
      '@typescript-eslint/no-explicit-any': 'warn',
    },
  },

  // Node globals for dev scripts (eslint-env comments don't work in flat config)
  {
    files: ['scripts/**/*.cjs'],
    languageOptions: {
      globals: {
        require: 'readonly',
        module: 'readonly',
        exports: 'readonly',
        process: 'readonly',
        Buffer: 'readonly',
        __dirname: 'readonly',
        console: 'readonly',
      },
    },
  },
  {
    // e2e scripts run in Node but embed browser code in page.evaluate callbacks
    files: ['scripts/**/*.mjs'],
    languageOptions: {
      globals: {
        process: 'readonly',
        console: 'readonly',
        setTimeout: 'readonly',
        clearTimeout: 'readonly',
        URL: 'readonly',
        document: 'readonly',
        getComputedStyle: 'readonly',
        HTMLElement: 'readonly',
      },
    },
  },

  // Prettier config (must be last to override)
  eslintConfigPrettier,
]
