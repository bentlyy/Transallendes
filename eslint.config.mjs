import tseslint from '@typescript-eslint/eslint-plugin';
import tsparser from '@typescript-eslint/parser';
import prettier from 'eslint-plugin-prettier';
import eslintPrettierConfig from 'eslint-config-prettier';

export default [
  eslintPrettierConfig,
  {
    ignores: ['dist', 'node_modules', 'coverage', 'frontend/dist'],
  },
  {
    files: ['src/**/*.ts'],
    languageOptions: {
      parser: tsparser,
      parserOptions: {
        ecmaVersion: 2022,
        sourceType: 'module',
        project: true,
        tsconfigRootDir: import.meta.dirname,
      },
    },
    plugins: {
      '@typescript-eslint': tseslint,
      prettier,
    },
    rules: {
      ...tseslint.configs['strict-type-checked'].rules,
      ...tseslint.configs.stylistic.rules,

      'prettier/prettier': 'error',

      '@typescript-eslint/no-unused-vars': ['error', { argsIgnorePattern: '^_', varsIgnorePattern: '^_' }],
      '@typescript-eslint/explicit-function-return-type': 'off',
      '@typescript-eslint/consistent-type-definitions': ['error', 'interface'],
      'no-console': 'warn',

      '@typescript-eslint/no-explicit-any': 'warn',
      '@typescript-eslint/no-non-null-assertion': 'warn',

      '@typescript-eslint/no-unsafe-argument': 'warn',
      '@typescript-eslint/no-unsafe-assignment': 'warn',
      '@typescript-eslint/no-unsafe-member-access': 'warn',
      '@typescript-eslint/no-unsafe-return': 'warn',
      '@typescript-eslint/no-unsafe-call': 'warn',

      '@typescript-eslint/restrict-template-expressions': ['warn', { allowNumber: true }],
      '@typescript-eslint/no-unnecessary-condition': 'warn',
      '@typescript-eslint/no-empty-function': 'warn',
      '@typescript-eslint/no-deprecated': 'warn',
      '@typescript-eslint/no-inferrable-types': 'warn',
      '@typescript-eslint/no-misused-promises': ['warn', { checksVoidReturn: false }],
      '@typescript-eslint/no-unnecessary-type-assertion': 'warn',
      '@typescript-eslint/use-unknown-in-catch-callback-variable': 'warn',
      '@typescript-eslint/no-base-to-string': 'warn',
      '@typescript-eslint/no-dynamic-delete': 'warn',
      '@typescript-eslint/require-await': 'warn',
      '@typescript-eslint/consistent-generic-constructors': 'warn',
      '@typescript-eslint/no-unnecessary-type-parameters': 'warn',
      '@typescript-eslint/no-confusing-void-expression': 'warn',
      '@typescript-eslint/ban-ts-comment': 'warn',
    },
  },
];
