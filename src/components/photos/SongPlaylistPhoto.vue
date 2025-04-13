<script setup lang="ts">
import { Icon } from '@iconify/vue';

const { url, width, height } = defineProps<{
  url?: string;
  width?: number;
  height?: number;
  radius?: number;
}>();
function round(value: number) {
  return Math.round(value);
}
</script>

<template>
  <div
    :style="{ width: `${width || 20}`, height: `${height || 20}` }"
    class="flex justify-center items-center"
  >
    <van-image
      :width="width || 20"
      :height="height || 20"
      :radius="radius || 4"
      fit="cover"
      lazy-load
      :src="url"
    >
      <template #loading>
        <Icon
          icon="mingcute:playlist-2-line"
          :width="round((width || 20) / 2)"
          :height="round((height || 20) / 2)"
        />
      </template>
      <template #error>
        <Icon
          icon="mingcute:playlist-2-line"
          :width="round((width || 20) / 2)"
          :height="round((height || 20) / 2)"
        />
      </template>
    </van-image>
  </div>
</template>

<style scoped lang="less"></style>
