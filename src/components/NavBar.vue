<template>
  <transition name="slide">
    <van-nav-bar
      v-show="show"
      v-bind="delegatedProps"
      @click-left="emit('clickLeft')"
      @click-right="emit('clickRight')"
      :class="props.class"
    >
      <template #title v-if="$slots.title">
        <slot name="title"></slot>
      </template>
      <template #right v-if="$slots.left">
        <slot name="right"></slot>
      </template>
      <template #left v-if="$slots.right">
        <slot name="left"></slot>
      </template>
    </van-nav-bar>
  </transition>
</template>

<script lang="ts" setup>
import {
  defineComponent,
  ref,
  onMounted,
  onUnmounted,
  PropType,
  computed,
  nextTick,
  HTMLAttributes,
} from 'vue';
import { type NavBarProps } from 'vant';

const show = defineModel('show', { type: Boolean, default: true });

const props: NavBarProps & {
  target?: string;
  class?: HTMLAttributes[`class`];
} = defineProps();
const delegatedProps = computed(() => {
  const { target: _, class: __, ...delegated } = props;

  return delegated;
});
const emit = defineEmits(['clickLeft', 'clickRight']);

const element = ref<HTMLElement | null>();

// 处理滚动事件
const handleScroll = (event: WheelEvent) => {
  if (event.deltaY > 0) {
    // 向下滚动
    show.value = false;
  } else {
    // 向上滚动
    show.value = true;
  }
};

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
