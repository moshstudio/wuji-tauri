import { GesturePlugin } from '@vueuse/gesture';
import { createPinia } from 'pinia';
import { Lazyload } from 'vant';
import { Toast, Dialog, Notify, ImagePreview, Sticky } from 'vant';

import { createApp } from 'vue';
import { createVuetify } from 'vuetify';
import * as components from 'vuetify/components';

import * as directives from 'vuetify/directives';
import { aliases, mdi } from 'vuetify/iconsets/mdi';

import App from './App.vue';
import { router } from './router';

import HorizontalScrollDirective from './utils/directives/horizontalScroll';
import RememberScrollDirective from './utils/directives/rememberScroll';
import HoverDelay from './utils/directives/hoverDelay';

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
