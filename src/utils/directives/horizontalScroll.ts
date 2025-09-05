import type { Directive, DirectiveBinding } from 'vue';
import { onUnmounted } from 'vue';
import { useDisplayStore } from '@/store';

export default <Directive<HTMLElement, string>>{
  mounted(el: HTMLElement, binding: DirectiveBinding) {
    let timer: NodeJS.Timeout;
    el.style.scrollBehavior = 'smooth';
    const handleWheel = (event: WheelEvent) => {
      event.preventDefault();
      clearTimeout(timer);
      timer = setTimeout(() => {
        const delta = event.deltaY;
        const currentScrollLeft = el.scrollLeft;
        const newScrollLeft = currentScrollLeft + delta * 5; // 调整滚动速度
        el.scroll({
          left: newScrollLeft,
        });
      }, 0);
    };
    const displaystore = useDisplayStore();
    if (displaystore.isAndroid) return;
    el.addEventListener('wheel', handleWheel);
    // 移除事件监听器
    onUnmounted(() => {
      el.removeEventListener('wheel', handleWheel);
    }, binding.instance?.$);
  },
};
