<template>
  <div
    ref="target"
    class="custom-image flex justify-center items-center"
    :style="imageStyle"
  >
    <!-- 图片容器 -->
    <img
      v-if="imageSrc && !isError && !isLoading"
      :src="imageSrc"
      class="w-full h-full"
      :class="props.class"
      :style="imageStyle"
      @load="handleLoad"
      @error="handleError"
    />

    <!-- 加载中占位图 -->
    <div v-if="isLoading" class="loading-placeholder text-gray-400">
      <slot name="loading">
        <van-loading type="spinner" size="30" />
      </slot>
    </div>

    <!-- 加载失败占位图 -->
    <div v-if="isError" class="error-placeholder text-gray-400">
      <slot name="error">
        <van-icon name="photo-failed" size="30" />
      </slot>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, CSSProperties, PropType, watch } from 'vue';
import { useIntersectionObserver } from '@vueuse/core'; // 用于懒加载
import { cachedFetch } from '@/utils';

const props = defineProps({
  src: {
    type: String,
    required: true,
  },
  headers: {
    type: Object as PropType<Record<string, string> | null | undefined>,
    default: null,
    required: false,
  },
  width: {
    type: [String, Number],
    default: '100%',
    required: false,
  },
  height: {
    type: [String, Number],
    default: '100%',
    required: false,
  },
  radius: {
    type: [String, Number],
    default: '0',
    required: false,
  },
  fit: {
    type: String as PropType<CSSProperties['objectFit']>,
    default: 'cover',
    required: false,
  },
  lazyLoad: {
    type: Boolean,
    default: false,
    required: false,
  },
  class: {
    type: String,
    default: '',
    required: false,
  },
});

const emit = defineEmits(['load', 'error', 'beforeLoad']);

const imageSrc = ref(''); // 图片地址
const isLoading = ref(false); // 是否正在加载
const isError = ref(false); // 是否加载失败

// 图片样式
const imageStyle = computed(() => {
  return {
    width:
      typeof props.width === 'number'
        ? `${props.width}px`
        : props.width || '100%',
    height:
      typeof props.height === 'number'
        ? `${props.height}px`
        : props.height || '100%',
    'object-fit': props.fit,
    borderRadius:
      typeof props.radius === 'number'
        ? `${props.radius}px`
        : props.radius || '0',
  };
});

// 加载图片
const loadImage = async () => {
  if (!props.src) {
    isError.value = true;
    isLoading.value = false;
    return;
  }

  // 触发 beforeLoad 事件
  emit('beforeLoad');

  try {
    isLoading.value = true;
    isError.value = false;

    // 如果有 headers，则通过 fetch 获取图片
    if (props.headers != null && props.headers != undefined) {
      const response = await cachedFetch(props.src, {
        headers: props.headers,
        verify: false,
      });
      const blob = await response.blob();
      if (blob.size === 0) {
        throw new Error('图片加载失败');
      }
      imageSrc.value = URL.createObjectURL(
        new Blob([blob], { type: blob.type || 'image/png' })
      ); // 将二进制数据转换为 URL
    } else {
      imageSrc.value = props.src; // 直接使用 src
    }
  } catch (error) {
    console.error('图片加载失败:', error);
    isError.value = true;
    emit('error', error);
  } finally {
    isLoading.value = false;
  }
};

// 图片加载成功
const handleLoad = () => {
  emit('load');
};

// 图片加载失败
const handleError = () => {
  isError.value = true;
  emit('error');
};

// 懒加载逻辑
const target = ref(null);
const stopFunc = ref<() => void>();

watch(
  () => props.src,
  async () => {
    stopFunc.value?.();
    imageSrc.value = '';
    isLoading.value = false;
    isError.value = false;
    if (props.lazyLoad) {
      const { stop } = useIntersectionObserver(
        target,
        ([{ isIntersecting }]) => {
          if (isIntersecting) {
            loadImage();
            stop(); // 停止监听
          }
        }
      );
      stopFunc.value = stop;
    } else {
      loadImage();
    }
  },
  { immediate: true }
);
</script>

<style scoped>
.loading-placeholder,
.error-placeholder {
  display: flex;
  align-items: center;
  justify-content: center;
}

/**
.error-placeholder {
  color: #ee0a24;
}
*/
</style>
