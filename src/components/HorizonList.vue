<script setup lang="ts">
import { useScroll } from "@vueuse/core";
import { nanoid } from "nanoid";
import { ref, onMounted, onUnmounted, onDeactivated, onActivated } from "vue";
const className = "horizon-list-" + nanoid(6);
let savedScrollPosition = 0;

onMounted(() => {
  const el: HTMLElement | null = document.querySelector(`.${className}`);
  if (el) {
    const { x } = useScroll(el);
    // 组件停用时保存滚动位置
    onDeactivated(() => {
      savedScrollPosition = x.value;
    });

    // 组件激活时恢复滚动位置
    onActivated(() => {
      el.scrollTo({
        left: savedScrollPosition,
        behavior: "instant",
      });
    });

    let timer: NodeJS.Timeout;
    const handleWheel = (event: WheelEvent) => {
      event.preventDefault();
      clearTimeout(timer);
      timer = setTimeout(() => {
        const delta = event.deltaY;
        const currentScrollLeft = el.scrollLeft;
        const newScrollLeft = currentScrollLeft + delta * 5; // 调整滚动速度
        el.scroll({
          left: newScrollLeft,
          behavior: "smooth", // 平滑滚动
        });
      }, 0);
    };
    el.addEventListener("wheel", handleWheel);
    // 移除事件监听器
    onUnmounted(() => {
      el.removeEventListener("wheel", handleWheel);
    });
  }
});
</script>

<template>
  <div
    :class="className"
    class="flex overflow-x-auto w-full scroll-smooth will-change-transform"
  >
    <slot></slot>
  </div>
</template>

<style scoped lang="less"></style>
