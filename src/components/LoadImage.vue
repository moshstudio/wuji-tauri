<template>
  <van-image :src="processedSrc" v-bind="restProps" v-on="listeners">
    <slot></slot>

    <!-- 传递具名插槽 -->
    <template v-for="(_, name) in $slots" #[name]>
      <slot :name="name"></slot>
    </template>
  </van-image>
</template>

<script setup lang="ts">
import { ref, watch, onMounted, useAttrs, PropType } from 'vue';
import { Image as VanImage } from 'vant';
import { cachedFetch } from '@/utils';

// 定义 props
const props = defineProps({
  src: {
    type: String,
    default: '',
  },
  headers: {
    type: Object as PropType<Record<string, string> | null | undefined>,
    default: null, // 默认值为空对象
  },
});

// 获取父组件传递的其他属性（除了 src 和 srcHeaders）
const attrs = useAttrs();
const { headers, ...restProps } = attrs;
if (!restProps.fit) {
  restProps.fit = 'cover';
}

// 获取事件监听器
const listeners = {
  click: attrs.onClick, // 手动绑定 click 事件
  load: attrs.onLoad, // 手动绑定 load 事件
  error: attrs.onError, // 其他事件可以根据需要添加
};

// 定义 processedSrc
const processedSrc = ref('');

// 异步处理 src 的函数
const processSrc = async (
  src: string,
  headers?: Record<string, string>
): Promise<string> => {
  if (!headers) return src;
  let response: Response;
  try {
    response = await cachedFetch(props.src, {
      headers: headers,
      verify: false,
      maxRedirections: 0,
    });

    if (!response.ok) {
      throw new Error('maxRedirections == 0 failed');
    }
  } catch (error) {
    response = await cachedFetch(props.src, {
      headers: headers,
      verify: false,
    });
  }

  const blob = await response.blob();
  if (blob.size === 0) {
    return src;
  }
  return URL.createObjectURL(
    new Blob([blob], { type: blob.type || 'image/png' })
  ); // 将二进制数据转换为 URL
};

// 监听 src 的变化
watch(
  () => props.src,
  async (newSrc) => {
    processedSrc.value = await processSrc(
      props.src,
      props.headers || undefined
    );
  },
  { immediate: true } // 立即执行一次
);

// 或者可以在 onMounted 中初始化
// onMounted(async () => {
//   processedSrc.value = await processSrc(props.src, props.headers || undefined);
// });
</script>

<style scoped></style>
