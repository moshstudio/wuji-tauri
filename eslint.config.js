import antfu from '@antfu/eslint-config';

export default antfu({
  vue: true,
  typescript: true,
  stylistic: {
    semi: true, // 分号（与 Prettier 的 `semi: true` 一致）
    quotes: ['error', 'single'], // 单引号（与 Prettier 的 `singleQuote: true` 一致）
    indent: 2, // 缩进（与 Prettier 的 `tabWidth: 2` 一致）
  },
  rules: {
    'no-console': 'off',
    'vue/script-indent': 'off',
    // 禁用与 Prettier 冲突的规则（@antfu/eslint-config 已内置 eslint-config-prettier）
    // 如果仍有冲突，可手动禁用：
    // 'operator-linebreak': 'off', // 关闭运算符换行检查（由 Prettier 接管）
  },
  ignores: [
    '**/node_modules/**',
    '**/dist/**',
    '**/build/**',
    '**/src-tauri/**',
    '**/tauri-plugin-commands/**',
    '**/tauri-plugin-mediasession/**',
  ],
});
