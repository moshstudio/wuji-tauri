<script setup lang="ts">
import { type as osType } from '@tauri-apps/plugin-os';
import { cachedFetch } from '@wuji-tauri/fetch';
import { getProxyUrl } from '../utils/proxy';
import { Image as VanImage } from 'vant';
import { ref, useAttrs, watch } from 'vue';

// 定义 props
const props = withDefaults(
  defineProps<{
    src?: string;
    headers?: Record<string, string> | null;
    compress?: boolean;
    lazyLoad?: boolean;
  }>(),
  {
    src: '',
    headers: undefined,
    compress: true,
    lazyLoad: false,
  },
);

// 获取父组件传递的其他属性（除了 src 和 srcHeaders）
const attrs = useAttrs();
const { headers, ...restProps } = attrs;
if (!restProps.fit) {
  restProps.fit = 'cover';
}
// 获取事件监听器
const listeners = {
  click: attrs.onClick, // 手动绑定 click 事件
  // load: attrs.onLoad, // 手动绑定 load 事件
  error: attrs.onError, // 其他事件可以根据需要添加
};

const loadFinished = ref(false);
// 定义 processedSrc
const processedSrc = ref<string>();

function onLoadFinished() {
  loadFinished.value = true;
  (attrs.load as Function)?.();
}
// 异步处理 src 的函数
async function processSrc(
  src: string,
  headers?: Record<string, string>,
): Promise<string> {
  if (src.startsWith('blob:')) {
    return src;
  }
  if (src.startsWith('data:image') && src.includes('base64')) {
    // 转为blob
    const dataURLToBlobURL = async (dataURL: string) => {
      try {
        const response = await fetch(dataURL);
        const blob = await response.blob();
        return URL.createObjectURL(blob);
      } catch (error) {
        console.error('image 转换失败:', error);
        throw error;
      }
    };
    return await dataURLToBlobURL(src);
  }
  if (!headers && !props.compress) {
    return src;
  } else if (osType() === 'android') {
    const proxyUrl = await getProxyUrl(src, headers);
    return proxyUrl || src;
  } else {
    const maxRedirections = props.src.includes('imgdb.cn') ? 0 : undefined;
    const response = await cachedFetch(
      props.src,
      {
        headers,
        verify: false,
        maxRedirections,
      },
      props.compress,
    );
    if (!response.ok) {
      console.warn(
        ` image fetch failed: ${props.src} ${response.status} ${response.statusText}`,
      );
      return src;
    }
    const blob = await response.blob();
    if (blob.size === 0) {
      console.warn(' image fetch size=0');
      return src;
    }
    loadFinished.value = true;
    return URL.createObjectURL(
      new Blob([blob], { type: blob.type || 'image/png' }),
    );
  }
}

// 监听 src 的变化
watch(
  () => props.src,
  async (_) => {
    processedSrc.value = await processSrc(
      props.src,
      props.headers || undefined,
    );
  },
  { immediate: true }, // 立即执行一次
);
</script>

<template>
  <VanImage
    :key="processedSrc"
    :src="processedSrc"
    :style="
      loadFinished
        ? ''
        : `min-height: ${attrs.height || '36'}px; min-width: ${attrs.width || '36'}px;`
    "
    v-bind="restProps"
    :lazy-load="lazyLoad"
    :class="attrs.class"
    v-on="listeners"
    @load="onLoadFinished"
  >
    <slot />

    <template v-if="Object.keys($slots).includes('loading')" #loading>
      <slot name="loading" />
    </template>
    <template v-if="Object.keys($slots).includes('error')" #error>
      <slot name="error" />
    </template>
    <!-- <template v-for="[name, slot] of Object.entries($slots)" :key="name">
      <slot :name="name" v-if="typeof slot === 'function'"></slot>
    </template> -->
  </VanImage>
</template>

<style scoped></style>
