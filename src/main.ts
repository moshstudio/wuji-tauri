/* eslint-disable perfectionist/sort-imports */
import 'reflect-metadata';
import { loader } from '@guolao/vue-monaco-editor';
import { GesturePlugin } from '@vueuse/gesture';
import { createPinia } from 'pinia';
import { Dialog, ImagePreview, Lazyload, Notify, Sticky, Toast } from 'vant';

import { createApp } from 'vue';
import { createVuetify } from 'vuetify';
import * as components from 'vuetify/components';

import * as directives from 'vuetify/directives';
import { aliases, mdi } from 'vuetify/iconsets/mdi';

import App from './App.vue';
import { router } from './router';

import HorizontalScrollDirective from './utils/directives/horizontalScroll';
import HoverDelay from './utils/directives/hoverDelay';
import RememberScrollDirective from './utils/directives/rememberScroll';

import 'vuetify/styles';
import 'vant/es/toast/style';
import 'vant/es/dialog/style';
import 'vant/es/notify/style';
import 'vant/es/sticky/style';
import 'vant/es/image-preview/style';
import '@vant/touch-emulator';
import '@/styles/index.css';
import 'vue-virtual-scroller/dist/vue-virtual-scroller.css';
import 'animate.css';
import '@tinymomentum/liquid-glass-vue/dist/liquid-glass-vue.css';

loader.config({
  paths: {
    // vs: 'https://cdn.jsdelivr.net/npm/monaco-editor@0.52.2/min/vs',
    // vs: 'https://cdn.bootcdn.net/ajax/libs/monaco-editor/0.52.2/min/vs',
    vs: '/vs',
  },
});

createApp(App)
  .use(createPinia())
  .use(
    createVuetify({
      components,
      directives,
      icons: {
        defaultSet: 'mdi',
        aliases,
        sets: {
          mdi,
        },
      },
    }),
  )
  .use(Lazyload)
  .use(Toast)
  .use(Dialog)
  .use(Notify)
  .use(Sticky)
  .use(ImagePreview)
  .use(GesturePlugin)
  .use(router)
  .directive('remember-scroll', RememberScrollDirective)
  .directive('horizontal-scroll', HorizontalScrollDirective)
  .directive('hover-delay', HoverDelay)
  .mount('#app');
