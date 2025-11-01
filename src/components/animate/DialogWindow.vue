<template>
  <Transition name="window" @after-leave="handleAfterLeave">
    <div
      v-if="isVisible"
      ref="windowRef"
      class="window absolute overflow-hidden rounded-lg border border-gray-300 bg-white shadow-lg transition-all duration-300 ease-in-out dark:border-gray-600 dark:bg-gray-800"
      :class="{
        '!rounded-none !border-0 !shadow-none': isMaximized,
        'scale-0 opacity-0': isMinimized,
        'transition-none': isDragging, // 拖拽时禁用过渡效果
      }"
      :style="windowStyle"
      @mousedown="bringToFront"
    >
      <!-- 窗口标题栏 -->
      <div
        ref="titleBarRef"
        class="title-bar flex h-8 cursor-default select-none items-center justify-between border-b border-gray-300 bg-gray-100 px-3 dark:border-gray-600 dark:bg-gray-700"
        @mousedown="startDrag"
      >
        <div class="window-controls flex gap-2">
          <button
            class="control-btn close bg-red-500"
            @click="handleControl('close')"
          ></button>
          <button
            class="control-btn minimize bg-yellow-500"
            @click="handleControl('minimize')"
          ></button>
          <button
            class="control-btn maximize bg-green-500"
            @click="handleControl('maximize')"
          ></button>
        </div>

        <span
          class="title flex-1 text-center text-xs font-medium text-gray-800 dark:text-gray-200"
        >
          温馨提示
        </span>

        <div class="placeholder w-15"></div>
      </div>

      <!-- 窗口内容 -->
      <div
        class="max-h-100 flex items-center justify-center overflow-y-auto p-5 text-gray-800 transition-all duration-300 dark:bg-gray-800 dark:text-gray-200"
        :class="{ 'h-[calc(100%-40px)] !max-h-none': isMaximized }"
        :style="{ backgroundColor: props.bgColor, color: props.color }"
      >
        <p :class="isMaximized ? 'text-2xl' : ''">{{ message }}</p>
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
const titleBarRef = ref<HTMLElement>();
const isVisible = ref(false);
const isClosing = ref(false);
const isMinimized = ref(false);
const isMaximized = ref(false);
const isDragging = ref(false);

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
  await new Promise((resolve) => setTimeout(resolve, 300));
  emit('minimize', props.id);
};

// 还原窗口
const restoreWindow = async () => {
  isMinimized.value = false;
  await new Promise((resolve) => setTimeout(resolve, 300));
};

// 最大化/还原切换
const toggleMaximize = async () => {
  if (isMaximized.value) {
    // 还原时使用原始位置，添加动画
    isMaximized.value = false;
    await new Promise((resolve) => setTimeout(resolve, 300));
  } else {
    // 最大化时保存当前位置
    originalPosition.value = {
      ...windowPosition.value,
      width: windowRef.value?.offsetWidth || 320,
      height: windowRef.value?.offsetHeight
        ? `${windowRef.value.offsetHeight}px`
        : 'auto',
    };
    isMaximized.value = true;
    await new Promise((resolve) => setTimeout(resolve, 300));
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
  @apply h-3 w-3 cursor-pointer rounded-full border-none transition-all duration-200 hover:scale-110 hover:brightness-90;
}
</style>
