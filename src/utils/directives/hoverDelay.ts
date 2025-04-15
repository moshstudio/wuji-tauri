import { Directive, DirectiveBinding } from 'vue';

const handlerMap = new WeakMap<
  HTMLElement,
  {
    mouseEnterHandler: () => void;
    mouseLeaveHandler: () => void;
  }
>();

export const hoverDelay: Directive = {
  mounted(el: HTMLElement, binding: DirectiveBinding) {
    let timer: NodeJS.Timeout | null = null;

    const mouseEnterHandler = () => {
      if (timer) {
        clearTimeout(timer);
        timer = null;
      }
      binding.value(true);
    };

    const mouseLeaveHandler = () => {
      timer = setTimeout(() => {
        binding.value(false);
      }, 2000);
    };

    el.addEventListener('mouseenter', mouseEnterHandler);
    el.addEventListener('mouseleave', mouseLeaveHandler);

    handlerMap.set(el, { mouseEnterHandler, mouseLeaveHandler });
  },
  unmounted(el: HTMLElement) {
    const handlers = handlerMap.get(el);
    if (handlers) {
      el.removeEventListener('mouseenter', handlers.mouseEnterHandler);
      el.removeEventListener('mouseleave', handlers.mouseLeaveHandler);
      handlerMap.delete(el);
    }
  },
};

export default hoverDelay;
