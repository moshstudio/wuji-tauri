import { createApp } from 'vue';
import App from './App.vue';
// Vuetify
import 'vuetify/styles';
import { createVuetify } from 'vuetify';
import * as components from 'vuetify/components';
import * as directives from 'vuetify/directives';
import { aliases, mdi } from 'vuetify/iconsets/mdi';

import { Lazyload } from 'vant';
// Toast
import { Toast } from 'vant';
import 'vant/es/toast/style';

// Dialog
import { Dialog } from 'vant';
import 'vant/es/dialog/style';

// Notify
import { Notify } from 'vant';
import 'vant/es/notify/style';

// ImagePreview
import { ImagePreview } from 'vant';
import 'vant/es/image-preview/style';
import { router } from './router';
import { createPinia } from 'pinia';
import { GesturePlugin } from '@vueuse/gesture'
import '@vant/touch-emulator';
import '@/styles/index.css';
import 'vue-virtual-scroller/dist/vue-virtual-scroller.css';
import RememberScrollDirective from './utils/directives/rememberScroll';
import HorizontalScrollDirective from './utils/directives/horizontalScroll';

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
    })
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
