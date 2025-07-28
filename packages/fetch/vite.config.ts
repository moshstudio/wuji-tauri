import { defineConfig } from 'vite';
import path, { resolve } from 'path';
import dts from 'vite-plugin-dts';

export default defineConfig({
  build: {
    watch: process.env.NODE_ENV === 'development' ? {} : null,
    lib: {
      entry: resolve(__dirname, 'src/index.ts'),
      name: 'WujiTauriFetch',
      fileName: (format) => {
        if (format === 'es') return 'fetch.js';
        if (format === 'umd') return 'fetch.umd.cjs';
        return `fetch.${format}.js`;
      },
      formats: ['es', 'umd'],
    },
    rollupOptions: {
      // 确保外部化处理那些你不想打包进库的依赖
      external: [],
      output: {
        // 在 UMD 构建模式下为这些外部化的依赖提供一个全局变量
        globals: {},
      },
    },
    sourcemap: true,
    minify: false,
  },
  plugins: [dts()],
  resolve: {
    alias: {
      '@f': path.resolve(__dirname, './src'),
    },
  },
});
