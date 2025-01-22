<script setup lang="ts">
import { getScrollTop } from '@/utils';
import { throttle } from 'lodash';
import {
  ref,
  PropType,
  TeleportProps,
  nextTick,
  onMounted,
  onUnmounted,
  watch,
} from 'vue';
const { target, immediate, offset, placeholder } = defineProps({
  target: [String, Object] as PropType<TeleportProps['to']>,
  immediate: Boolean,
  offset: {
    type: Number,
    default: 600,
  },
  placeholder: {
    type: Boolean,
    default: false,
  },
});
const emit = defineEmits<{
  (e: 'click', event: MouseEvent): void;
}>();

const show = ref(false);
const scrollParent = ref<Window | Element>();
const onClick = (event: MouseEvent) => {
  emit('click', event);
  scrollParent.value?.scrollTo({
    top: 0,
    behavior: immediate ? 'auto' : 'smooth',
  });
};
const scroll = () => {
  show.value = scrollParent.value
    ? getScrollTop(scrollParent.value) >= +offset
    : false;
};
const getTarget = () => {
  if (!target) {
    return window;
  }
  if (typeof target === 'string') {
    const el = document.querySelector(target);
    if (el) {
      return el;
    }
    if (process.env.NODE_ENV !== 'production') {
      console.error(
        `[Vant] BackTop: target element "${target}" was not found, the BackTop component will not be rendered.`
      );
    }
  } else {
    return target as Element;
  }
};
const updateTarget = () => {
  nextTick(() => {
    scrollParent.value = getTarget();
    scroll();
  });
};

const throttleScroll = throttle(scroll, 100);
onMounted(() => {
  updateTarget();
  nextTick(() => {
    scrollParent.value?.addEventListener('scroll', throttleScroll);
  });
});
onUnmounted(() => {
  scrollParent.value?.removeEventListener('scroll', throttleScroll);
});

watch(() => target, updateTarget);
</script>

<template>
  <div
    @click="onClick"
    v-show="placeholder ? true : show"
    :style="{ opacity: placeholder ? (show ? 1 : 0) : 1 }"
  >
    <slot></slot>
  </div>
</template>

<style scoped lang="less"></style>
