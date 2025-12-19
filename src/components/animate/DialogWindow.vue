<template>
  <Transition name="window" @after-leave="handleAfterLeave">
    <div
      v-if="isVisible"
      ref="windowRef"
      class="window absolute overflow-hidden rounded-lg border border-slate-200 bg-white shadow-2xl transition-all duration-300 ease-in-out dark:border-slate-700 dark:bg-slate-900"
      :class="{
        '!rounded-none !border-0 !shadow-none': isMaximized,
        'scale-95 opacity-0': isMinimized,
        'transition-none': isDragging,
      }"
      :style="windowStyle"
      @mousedown="bringToFront"
    >
      <!-- 窗口标题栏 -->
      <div
        class="title-bar flex h-9 cursor-default select-none items-center justify-between border-b border-slate-200 bg-gradient-to-r from-slate-50 to-slate-100 px-3 text-xs dark:border-slate-700 dark:from-slate-800 dark:to-slate-700"
        @mousedown="startDrag"
      >
        <div class="window-controls flex w-[64px] items-center gap-1.5">
          <button
            class="control-btn close"
            @click="handleControl('close')"
          ></button>
          <button
            class="control-btn minimize"
            @click="handleControl('minimize')"
          ></button>
          <button
            class="control-btn maximize"
            @click="handleControl('maximize')"
          ></button>
        </div>

        <span
          class="title flex-1 text-center text-xs font-medium tracking-wide text-slate-800 dark:text-slate-100"
        >
          温馨提示
        </span>

        <div class="placeholder w-[64px]"></div>
      </div>

      <!-- 窗口内容 -->
      <div
        class="max-h-100 flex items-center justify-center overflow-y-auto bg-slate-50 p-6 text-sm leading-relaxed text-slate-700 transition-all duration-300 dark:bg-slate-900/40 dark:text-slate-100"
        :class="{ 'h-[calc(100%-40px)] !max-h-none': isMaximized }"
        :style="contentStyle"
      >
        <p
          class="inline-block max-w-[80%] text-center font-medium transition-transform duration-300 ease-in-out"
          :class="isMaximized ? 'scale-[1.08] text-base' : 'scale-100 text-sm'"
        >
          {{ message }}
        </p>
      </div>
    </div>
  </Transition>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, nextTick, onUnmounted } from 'vue';

interface Props {
  id: number;
  message: string;
  index: number;
  color?: string;
  bgColor?: string;
  position: { top: number; left: number };
}

const props = defineProps<Props>();
const emit = defineEmits<{
  close: [id: number];
  minimize: [id: number];
  focus: [id: number];
}>();

const windowRef = ref<HTMLElement>();
const isVisible = ref(false);
const isClosing = ref(false);
const isMinimized = ref(false);
const isMaximized = ref(false);
const isDragging = ref(false);

const ANIMATION_DURATION = 300;
const sleep = (ms: number) =>
  new Promise<void>((resolve) => setTimeout(resolve, ms));

// 窗口位置
const windowPosition = ref({
  top: props.position.top,
  left: props.position.left,
});

// 保存原始位置和尺寸，用于最大化后还原
const originalPosition = ref({
  ...windowPosition.value,
  width: 320,
  height: 'auto',
});

// 拖拽相关变量
const dragStartPos = ref({ x: 0, y: 0 });
const windowStartPos = ref({ left: 0, top: 0 });

// 计算窗口样式
const windowStyle = computed(() => ({
  top: isMaximized.value ? '0' : `${windowPosition.value.top}px`,
  left: isMaximized.value ? '0' : `${windowPosition.value.left}px`,
  width: isMaximized.value ? '100%' : `${originalPosition.value.width}px`,
  height: isMaximized.value ? '100%' : originalPosition.value.height,
  zIndex: props.index,
  cursor: isDragging.value ? 'grabbing' : 'default',
}));

// 内容区域样式（仅在传入颜色时生效，默认使用柔和背景）
const contentStyle = computed(() => {
  const style: Record<string, string> = {};
  if (props.bgColor) style.backgroundColor = props.bgColor;
  if (props.color) style.color = props.color;
  return style;
});

// 开始拖拽
const startDrag = (e: MouseEvent) => {
  if (isMaximized.value || isMinimized.value || isClosing.value) return;

  isDragging.value = true;
  bringToFront();

  // 记录初始位置
  dragStartPos.value = {
    x: e.clientX,
    y: e.clientY,
  };

  windowStartPos.value = {
    left: windowPosition.value.left,
    top: windowPosition.value.top,
  };

  // 添加事件监听
  document.addEventListener('mousemove', onDrag);
  document.addEventListener('mouseup', stopDrag);

  // 防止文本选择
  e.preventDefault();
};

// 拖拽中
const onDrag = (e: MouseEvent) => {
  if (!isDragging.value) return;

  // 计算移动距离
  const deltaX = e.clientX - dragStartPos.value.x;
  const deltaY = e.clientY - dragStartPos.value.y;

  // 更新窗口位置
  windowPosition.value = {
    left: windowStartPos.value.left + deltaX,
    top: windowStartPos.value.top + deltaY,
  };

  // 边界检查，防止窗口被拖出可视区域
  const windowRect = windowRef.value?.getBoundingClientRect();
  if (windowRect) {
    const maxLeft = window.innerWidth - windowRect.width;
    const maxTop = window.innerHeight - windowRect.height;

    windowPosition.value.left = Math.max(
      0,
      Math.min(windowPosition.value.left, maxLeft),
    );
    windowPosition.value.top = Math.max(
      0,
      Math.min(windowPosition.value.top, maxTop),
    );
  }
};

// 停止拖拽
const stopDrag = () => {
  isDragging.value = false;

  // 移除事件监听
  document.removeEventListener('mousemove', onDrag);
  document.removeEventListener('mouseup', stopDrag);
};

// 统一的控制按钮处理函数
const handleControl = async (action: 'close' | 'minimize' | 'maximize') => {
  if (isClosing.value) return;

  switch (action) {
    case 'close':
      startClose();
      break;
    case 'minimize':
      await startMinimize();
      break;
    case 'maximize':
      await toggleMaximize();
      break;
  }
};

// 开始关闭流程（触发动画）
const startClose = () => {
  isClosing.value = true;
  isVisible.value = false;
};

// 开始最小化流程
const startMinimize = async () => {
  isMinimized.value = true;
  await sleep(ANIMATION_DURATION);
  emit('minimize', props.id);
};

// 还原窗口
const restoreWindow = async () => {
  isMinimized.value = false;
  await sleep(ANIMATION_DURATION);
};

// 最大化/还原切换
const toggleMaximize = async () => {
  if (isMaximized.value) {
    isMaximized.value = false;
    await sleep(ANIMATION_DURATION);
  } else {
    originalPosition.value = {
      ...windowPosition.value,
      width: windowRef.value?.offsetWidth || 320,
      height: windowRef.value?.offsetHeight
        ? `${windowRef.value.offsetHeight}px`
        : 'auto',
    };
    isMaximized.value = true;
    await sleep(ANIMATION_DURATION);
  }
};

// 动画结束后处理关闭
const handleAfterLeave = () => {
  if (isClosing.value) {
    emit('close', props.id);
  }
};

// 窗口层级管理
const bringToFront = () => {
  if (isClosing.value || isMinimized.value) return;
  emit('focus', props.id);
};

// 组件卸载时移除事件监听
onUnmounted(() => {
  document.removeEventListener('mousemove', onDrag);
  document.removeEventListener('mouseup', stopDrag);
});

// 暴露方法给父组件
defineExpose({
  restoreWindow,
  minimizeWindow: startMinimize,
  bringToFront,
});

onMounted(() => {
  // 组件挂载后显示，触发进入动画
  nextTick(() => {
    isVisible.value = true;
    bringToFront();
  });
});
</script>

<style scoped>
.window-enter-active,
.window-leave-active {
  transition: all 0.3s ease-in-out;
}

.window-enter-from {
  opacity: 0;
  transform: scale(0.8) translateY(-20px);
}

.window-leave-to {
  opacity: 0;
  transform: scale(0.8) translateY(20px);
}

/* 拖拽时禁用过渡效果 */
.window {
  transition: all 0.3s ease-in-out;
}

.window.transition-none {
  transition: none;
}
.control-btn {
  @apply h-3.5 w-3.5 cursor-pointer rounded-full border border-transparent transition-all duration-150;
}

.control-btn.close {
  @apply bg-red-400 hover:bg-red-500 dark:bg-red-500 dark:hover:bg-red-400;
}

.control-btn.minimize {
  @apply bg-amber-300 hover:bg-amber-400 dark:bg-amber-400 dark:hover:bg-amber-300;
}

.control-btn.maximize {
  @apply bg-emerald-400 hover:bg-emerald-500 dark:bg-emerald-500 dark:hover:bg-emerald-400;
}
</style>
