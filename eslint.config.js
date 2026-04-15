import antfu from '@antfu/eslint-config';

export default antfu({
  vue: true,
  typescript: true,
  stylistic: {
    indent: 2,
    quotes: 'single',
    semi: true,
  },
  rules: {
    'no-console': 'off',
    'no-unused-vars': 'off',
    '@typescript-eslint/no-unused-vars': 'off',
    'unused-imports/no-unused-vars': 'off',
    'no-new-func': 'off',
    'no-empty-object-type': 'off',
  },
  ignores: [
    '**/node_modules/**',
    '**/dist/**',
    '**/build/**',
    '**/target/**',
    '**/.history/**',
    '**/.tauri/**',
    '**/src-tauri/**',
    '**/public/vs/**',
    '**/packages/fetch/src/assets/browser-image-compression.js',
    '**/src/components/codeEditor/templates.ts',
    '**/src/utils/reader/reader-layout.js',
    '**/tauri-plugin-commands/**',
    '**/tauri-plugin-mediasession/**',
    '**/tauri-plugin-mywebview/**',
    '**/*.md',
  ],
});
