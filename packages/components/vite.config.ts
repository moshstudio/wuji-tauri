import vue from '@vitejs/plugin-vue';
import { defineConfig } from 'vite';
import path, { resolve } from 'path';
import dts from 'vite-plugin-dts';

export default defineConfig({
  build: {
    watch: process.env.NODE_ENV === 'development' ? {} : null,
    lib: {
      entry: resolve(__dirname, 'src/index.ts'),
      name: 'WujiTauriComponents',
      fileName: (format) => {
        if (format === 'es') return 'components.js';
        if (format === 'umd') return 'components.umd.cjs';
        return `components.${format}.js`;
      },
      formats: ['es', 'umd'],
    },
    rollupOptions: {
      // 确保外部化处理那些你不想打包进库的依赖
      external: ['vue'],
      output: {
        // 在 UMD 构建模式下为这些外部化的依赖提供一个全局变量
        globals: { vue: 'Vue' },
      },
    },
    sourcemap: true,
    minify: false,
  },
  plugins: [vue(), dts()],
  resolve: {
    alias: {
      '@c': path.resolve(__dirname, './src'),
    },
  },
});
