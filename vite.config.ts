import { defineConfig } from 'vite';
import Vue from '@vitejs/plugin-vue';
import AutoImport from 'unplugin-auto-import/vite';
import Components from 'unplugin-vue-components/vite';
import { VantResolver } from '@vant/auto-import-resolver';
import Vuetify, { transformAssetUrls } from 'vite-plugin-vuetify';
import path from 'node:path';
import { nodePolyfills } from 'vite-plugin-node-polyfills';

const host = process.env.TAURI_DEV_HOST;

// https://vitejs.dev/config/
export default defineConfig(async () => ({
  plugins: [
    Vue({
      template: { transformAssetUrls },
    }),
    ,
    AutoImport({
      resolvers: [VantResolver()],
    }),
    Components({
      resolvers: [VantResolver()],
    }),
    Vuetify({
      autoImport: true,
    }),
    nodePolyfills(),
  ],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, `./src`),
    },
    dedupe: ['vue', 'vue-router'],
  },

  // Vite options tailored for Tauri development and only applied in `tauri dev` or `tauri build`
  //
  // 1. prevent vite from obscuring rust errors
  clearScreen: false,
  // 2. tauri expects a fixed port, fail if that port is not available
  server: {
    port: 1420,
    strictPort: true,
    host: host || false,
    hmr: host
      ? {
          protocol: 'ws',
          host,
          port: 1421,
        }
      : undefined,
    watch: {
      // 3. tell vite to ignore watching `src-tauri`
      ignored: ['**/src-tauri/**'],
    },
  },
  optimizeDeps: {
    exclude: [
      'tauri-plugin-commands-api',
      'tauri-plugin-fs-api',
      'tauri-plugin-mediasession-api',
    ],
  },
}));
