<script lang="ts" setup>
import type { NavBarProps } from 'vant';
import type {
  HTMLAttributes,
} from 'vue';
import {
  computed,
  nextTick,
  onMounted,
  onUnmounted,
  ref,
} from 'vue';

const props: NavBarProps & {
  target?: string;
  class?: HTMLAttributes[`class`];
} = defineProps();

const emit = defineEmits(['clickLeft', 'clickRight']);

const show = defineModel('show', { type: Boolean, default: true });

const delegatedProps = computed(() => {
  const { target: _, class: __, ...delegated } = props;

  return delegated;
});
const element = ref<HTMLElement | null>();

// 处理滚动事件
function handleScroll(event: WheelEvent) {
  if (event.deltaY > 0) {
    // 向下滚动
    show.value = false;
  }
  else {
    // 向上滚动
    show.value = true;
  }
}

// 监听滚动事件
onMounted(() => {
  nextTick(() => {
    element.value = props.target
      ? (document.querySelector(props.target) as HTMLElement)
      : document.documentElement;
    element.value?.addEventListener('wheel', handleScroll);
    // element.value?.addEventListener("touchmove", handleScroll);
  });
});
onUnmounted(() => {
  element.value?.removeEventListener('wheel', handleScroll);
  // element.value?.removeEventListener("touchmove", handleScroll);
});
</script>

<template>
  <transition name="slide">
    <van-nav-bar
      v-show="show"
      v-bind="delegatedProps"
      :class="props.class"
      @click-left="emit('clickLeft')"
      @click-right="emit('clickRight')"
    >
      <template v-if="$slots.title" #title>
        <slot name="title" />
      </template>
      <template v-if="$slots.left" #right>
        <slot name="right" />
      </template>
      <template v-if="$slots.right" #left>
        <slot name="left" />
      </template>
    </van-nav-bar>
  </transition>
</template>

<style scoped lang="less">
/* 定义进入和离开的动画 */
.slide-enter-active,
.slide-leave-active {
  transition:
    transform 0.5s,
    opacity 0.5s;
}

.slide-enter-from,
.slide-leave-to {
  transform: translateY(-100%);
  opacity: 0;
}
</style>
