import type { HlsVideoElement } from 'hls-video-element';
import type { MediaThemeElement } from 'media-chrome/media-theme-element';

export {};
declare global {
  interface Window {
    androidBackCallback?: () => void;
    sendGreeting?: () => void;
  }
  interface HTMLElementTagNameMap {
    'hls-video': HlsVideoElement;
    'media-chrome': MediaThemeElement;
  }
}

// Type definitions for vue-virtual-scroller
// Project: https://github.com/Akryum/vue-virtual-scroller/
declare module 'vue-virtual-scroller' {
  import type { Component, ComponentOptions, PluginObject } from 'vue';
  import type Vue from 'vue';

  interface PluginOptions {
    installComponents?: boolean;
    componentsPrefix?: string;
  }

  const plugin: PluginObject<PluginOptions> & { version: string };

  export const RecycleScroller: Component<any, any, any, any>;
  export const DynamicScroller: Component<any, any, any, any>;
  export const DynamicScrollerItem: Component<any, any, any, any>;

  export function IdState(options?: {
    idProp?: (vm: any) => any;
  }): ComponentOptions<Vue> | typeof Vue;

  export default plugin;
}
