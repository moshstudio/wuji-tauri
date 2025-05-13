<script setup lang="ts">
import { onMounted } from 'vue';
import Home from '../windowsView/home/index.vue';
import { useDisplayStore } from '@/store';

const displayStore = useDisplayStore();

onMounted(() => {
  displayStore.addBackCallback('Home', async () => {
    await displayStore.checkExitApp();
  });
});
</script>

<template>
  <Home />
</template>

<style scoped lang="less"></style>
