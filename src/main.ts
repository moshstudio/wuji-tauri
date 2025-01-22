import { createApp } from 'vue';
import App from './App.vue';
import { createVuetify } from 'vuetify';
import 'vuetify/styles'; // 引入 Vuetify 样式
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
import '@vant/touch-emulator';
import '@/styles/index.css';
import RememberScrollDirective from './utils/directives/rememberScroll';
import HorizontalScrollDirective from './utils/directives/horizontalScroll';

createApp(App)
  .use(createPinia())
  .use(createVuetify())
  .use(Lazyload)
  .use(Toast)
  .use(Dialog)
  .use(Notify)
  .use(ImagePreview)
  .use(router)
  .directive('remember-scroll', RememberScrollDirective)
  .directive('horizontal-scroll', HorizontalScrollDirective)
  .mount('#app');
