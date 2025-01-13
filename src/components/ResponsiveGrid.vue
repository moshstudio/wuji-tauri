<template>
  <div class="p-4 overflow-x-hidden">
    <ul class="gap-4" :class="gridClass">
      <slot></slot>
    </ul>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, onUnmounted } from "vue";

const gridClass = ref("grid grid-cols-1");

const updateGridClass = () => {
  const width = window.innerWidth;
  if (width >= 768) {
    gridClass.value = "grid grid-cols-3";
  } else if (width >= 512) {
    gridClass.value = "grid grid-cols-2";
  } else {
    gridClass.value = "grid grid-cols-1";
  }
};

onMounted(() => {
  updateGridClass();
  window.addEventListener("resize", updateGridClass);
});

onUnmounted(() => {
  window.removeEventListener("resize", updateGridClass);
});
</script>

<style scoped lang="less"></style>
