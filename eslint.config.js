import antfu from '@antfu/eslint-config';
const eslintPluginPrettierRecommended = require('eslint-plugin-prettier/recommended');

export default antfu({
  vue: true,
  typescript: true,
  // stylistic: false,
  // rules: {
  //   'no-console': 'off',
  //   'vue/script-indent': 'off',
  //   // 确保所有与 Prettier 冲突的规则都被禁用
  //   'arrow-body-style': 'off',
  //   'prefer-arrow-callback': 'off',
  //   'no-unused-vars': 'off',
  //   '@typescript-eslint/no-unused-vars': 'off',
  //   'unused-imports/no-unused-vars': 'off',
  //   'no-new-func': 'off',
  //   'no-empty-object-type': 'off',
  // },
  ignores: [
    '**/node_modules/**',
    '**/dist/**',
    '**/build/**',
    '**/src-tauri/**',
    '**/tauri-plugin-commands/**',
    '**/tauri-plugin-mediasession/**',
    '**/*.md',
  ],
  eslintPluginPrettierRecommended,
});
