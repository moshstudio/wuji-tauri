<template>
  <div
    ref="target"
    class="custom-image flex justify-center items-center"
    :style="imageStyle"
  >
    <!-- 图片容器 -->
    <img
      v-if="imageSrc"
      :src="imageSrc"
      class="w-full h-full"
      :style="imageStyle"
      @load="handleLoad"
      @error="handleError"
    />

    <!-- 加载中占位图 -->
    <div v-if="isLoading" class="loading-placeholder">
      <slot name="loading">
        <van-loading type="spinner" size="30" />
      </slot>
    </div>

    <!-- 加载失败占位图 -->
    <div v-if="isError" class="error-placeholder">
      <slot name="error">
        <van-icon name="photo-failed" size="30" />
      </slot>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, CSSProperties, PropType } from "vue";
import { useIntersectionObserver } from "@vueuse/core"; // 用于懒加载
import { fetch } from "@/utils/fetch";
import { cachedFetch } from "@/utils";

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
    default: "100%",
    required: false,
  },
  height: {
    type: [String, Number],
    default: "100%",
    required: false,
  },
  fit: {
    type: String as PropType<CSSProperties["objectFit"]>,
    default: "cover",
    required: false,
  },
  radius: {
    type: [String, Number],
    default: 0,
    required: false,
  },
  lazyLoad: {
    type: Boolean,
    default: false,
    required: false,
  },
});

const emit = defineEmits(["load", "error", "beforeLoad"]);

const imageSrc = ref(""); // 图片地址
const isLoading = ref(false); // 是否正在加载
const isError = ref(false); // 是否加载失败

// 图片样式
const imageStyle = computed(() => {
  return {
    width:
      typeof props.width === "number"
        ? `${props.width}px`
        : props.width || "100%",
    height:
      typeof props.height === "number"
        ? `${props.height}px`
        : props.height || "100%",
    "border-radius":
      typeof props.radius === "number" ? `${props.radius}px` : props.radius,
    "object-fit": props.fit,
  };
});

// 加载图片
const loadImage = async () => {
  if (!props.src) return;

  // 触发 beforeLoad 事件
  emit("beforeLoad");

  try {
    isLoading.value = true;
    isError.value = false;

    // 如果有 headers，则通过 fetch 获取图片
    if (props.headers) {
      const response = await cachedFetch(props.src, {
        headers: props.headers,
      });
      const blob = await response.blob();
      imageSrc.value = URL.createObjectURL(
        new Blob([blob], { type: blob.type || "image/png" })
      ); // 将二进制数据转换为 URL
    } else {
      imageSrc.value = props.src; // 直接使用 src
    }
  } catch (error) {
    console.error("图片加载失败:", error);
    isError.value = true;
    emit("error", error);
  } finally {
    isLoading.value = false;
  }
};

// 图片加载成功
const handleLoad = () => {
  emit("load");
};

// 图片加载失败
const handleError = () => {
  isError.value = true;
  emit("error");
};

// 懒加载逻辑
const target = ref(null);
if (props.lazyLoad) {
  const { stop } = useIntersectionObserver(target, ([{ isIntersecting }]) => {
    if (isIntersecting) {
      loadImage();
      stop(); // 停止监听
    }
  });
} else {
  // 非懒加载模式，在 onMounted 时加载图片
  onMounted(() => {
    loadImage();
  });
}
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
