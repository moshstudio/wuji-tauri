import type { Directive } from 'vue';
import { useScroll } from '@vueuse/core';
import { onActivated, onDeactivated, onMounted, onUnmounted } from 'vue';

export const vRememberScroll: Directive<HTMLElement, string | undefined> = {
  mounted(el, binding) {
    // 1. 确定目标元素
    const targetEl = binding.value
      ? (el.querySelector(binding.value) as HTMLElement)
      : el;

    if (!targetEl) {
      console.warn(`v-remember-scroll: 未找到目标元素 "${binding.value}"`);
      return;
    }

    // 2. 存储滚动位置
    let scrollPosition = { top: 0, left: 0 };
    const { x, y } = useScroll(targetEl);
    // 3. 激活时恢复位置
    onActivated(() => {
      targetEl.scrollTo({
        ...scrollPosition,
        behavior: 'instant' as ScrollBehavior,
      });
    }, binding.instance?.$);

    // 4. 停用时保存位置
    onDeactivated(() => {
      scrollPosition = { left: x.value, top: y.value };
    }, binding.instance?.$);
  },
};

export default vRememberScroll;
