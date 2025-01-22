import js from '@eslint/js';
import prettier from 'eslint-plugin-prettier';
import globals from 'globals';

export default [
  js.configs.recommended,
  {
    ignores: ['node_modules/', 'dist/', 'src-tauri/'],
    plugins: {
      prettier,
    },
    rules: {
      'prettier/prettier': 'error',
      'no-console': 'warn',
      'no-unused-vars': 'warn',
      'import/no-unresolved': 'error',
      'import/extensions': ['error', 'ignorePackages'],
      'import/no-absolute-path': 'error',
      'import/no-dynamic-require': 'error',
    },
    languageOptions: {
      ecmaVersion: 'latest',
      sourceType: 'module',
      globals: {
        ...globals.browser,
        ...globals.node,
      },
    },
  },
];
