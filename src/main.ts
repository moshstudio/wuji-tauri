import { createApp } from "vue";
import App from "./App.vue";
import { Lazyload } from "vant";
// Toast
import { Toast } from "vant";
import "vant/es/toast/style";

// Dialog
import { Dialog } from "vant";
import "vant/es/dialog/style";

// Notify
import { Notify } from "vant";
import "vant/es/notify/style";

// ImagePreview
import { ImagePreview } from "vant";
import "vant/es/image-preview/style";
import { router } from "./router";
import { createPinia } from "pinia";
import "@vant/touch-emulator";
import Vue3Toastify, { type ToastContainerOptions } from "vue3-toastify";
import "vue3-toastify/dist/index.css";
import "@/styles/index.css";
import TooltipDirective from "./utils/directives/tooltip";
import RememberScrollDirective from "./utils/directives/rememberScroll";
import HorizontalScrollDirective from "./utils/directives/horizontalScroll";

createApp(App)
  .use(Lazyload)
  .use(Toast)
  .use(Dialog)
  .use(Notify)
  .use(ImagePreview)
  .use(router)
  .use(createPinia())
  .directive("tooltip", TooltipDirective)
  .directive("remember-scroll", RememberScrollDirective)
  .directive("horizontal-scroll", HorizontalScrollDirective)
  .use(Vue3Toastify, {
    autoClose: 3000,
    position: "bottom-right",
    closeOnClick: true,
    pauseOnHover: false,
    clearOnUrlChange: false,
    draggable: true,
    draggablePercent: 0.6,
    pauseOnFocusLoss: false,
    hideProgressBar: true,
    closeButton: true,
    theme: "auto",
    toastClassName: "toast-container",
  } as ToastContainerOptions)
  .mount("#app");
