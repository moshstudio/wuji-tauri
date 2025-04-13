import { GesturePlugin } from '@vueuse/gesture';
import { createPinia } from 'pinia';
import { Lazyload } from 'vant';
// Toast
import { Toast } from 'vant';
// Dialog
import { Dialog } from 'vant';
// Notify
import { Notify } from 'vant';
// ImagePreview
import { ImagePreview } from 'vant';

import { createApp } from 'vue';
import { createVuetify } from 'vuetify';
import * as components from 'vuetify/components';

import * as directives from 'vuetify/directives';
import { aliases, mdi } from 'vuetify/iconsets/mdi';

import App from './App.vue';
import { router } from './router';

import HorizontalScrollDirective from './utils/directives/horizontalScroll';
import RememberScrollDirective from './utils/directives/rememberScroll';
// Vuetify
import 'vuetify/styles';
import 'vant/es/toast/style';
import 'vant/es/dialog/style';
import 'vant/es/notify/style';
import 'vant/es/image-preview/style';
import '@vant/touch-emulator';
import '@/styles/index.css';
import 'vue-virtual-scroller/dist/vue-virtual-scroller.css';

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
  .use(ImagePreview)
  .use(GesturePlugin)
  .use(router)
  .directive('remember-scroll', RememberScrollDirective)
  .directive('horizontal-scroll', HorizontalScrollDirective)
  .mount('#app');
