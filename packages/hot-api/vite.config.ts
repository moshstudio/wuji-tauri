import path, { resolve } from 'node:path';
import { defineConfig } from 'vite';
import dts from 'vite-plugin-dts';

export default defineConfig({
  build: {
    watch: process.env.NODE_ENV === 'development' ? {} : null,
    lib: {
      entry: resolve(__dirname, 'src/index.ts'),
      name: 'WujiTauriHotApi',
      fileName: (format) => {
        if (format === 'es') return 'hot-api.js';
        if (format === 'umd') return 'hot-api.umd.cjs';
        return `hot-api.${format}.js`;
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
  plugins: [
    dts({
      tsconfigPath: resolve(__dirname, 'tsconfig.json'), // 明确指定 tsconfig 路径
    }),
  ],
  resolve: {
    alias: {
      '@ha': path.resolve(__dirname, './src'),
    },
  },
});
