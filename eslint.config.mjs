import typescript from '@typescript-eslint/eslint-plugin';
import parser from '@typescript-eslint/parser';
import prettier from 'eslint-plugin-prettier';
import security from 'eslint-plugin-security';

export default [
  // Configuration for TypeScript files
  {
    files: ['**/*.ts', '**/*.tsx'],
    languageOptions: {
      parser,
      parserOptions: {
        sourceType: 'module',
        ecmaVersion: 'latest',
      },
    },
    plugins: {
      '@typescript-eslint': typescript,
      prettier,
      security,
    },
    rules: {
      ...typescript.configs.recommended.rules,
      'prettier/prettier': 'warn',
      'max-len': ['warn', { code: 120 }],
      'security/detect-object-injection': 'warn',
    },
  },

  // Configuration for JavaScript files
  {
    files: ['**/*.js'],
    languageOptions: {
      parserOptions: {
        sourceType: 'module',
        ecmaVersion: 'latest',
      },
    },
    plugins: {
      security,
    },
    rules: {
      'security/detect-object-injection': 'warn',
    },
    ignores: ['build/', 'frontend/public/dist/', 'node_modules/'],
  },
];
