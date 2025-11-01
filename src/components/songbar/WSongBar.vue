<script setup lang="ts">
import { computed } from 'vue';
import MSongBar from './MSongBar.vue';
import WSongBarReal from './WSongBarReal.vue';
import { useWindowSize } from '@vueuse/core';

const { width } = useWindowSize();
const currentComponent = computed(() => {
  if (width.value > 690) {
    return WSongBarReal;
  } else {
    return MSongBar;
  }
});
</script>

<template>
  <component :is="currentComponent" />
</template>

<style scoped>
.responsive-container {
  width: 100%;
  height: 100%;
}
</style>
