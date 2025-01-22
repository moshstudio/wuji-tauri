import { useScroll } from '@vueuse/core';
import { Directive, onActivated, onDeactivated } from 'vue';

export default <Directive<HTMLElement, never, never, ScrollBehavior>>{
  mounted(el, binding) {
    let left = 0;
    let top = 0;
    const { x, y } = useScroll(el);
    const instance = binding.instance?.$;

    onActivated(() => {
      el.scrollTo({
        top: top,
        left: left,
        behavior: 'instant',
      });
    }, instance);

    onDeactivated(() => {
      left = x.value;
      top = y.value;
    }, instance);
  },
};
