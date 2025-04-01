<script setup lang="ts">
import _ from 'lodash';
import { Icon } from '@iconify/vue';
import { VideoItem } from '@/extensions/video';
import { useDisplayStore } from '@/store';
const { videoItem } = defineProps<{
  videoItem: VideoItem;
}>();
const emit = defineEmits<{
  (e: 'click', item: VideoItem): void;
}>();
const displayStore = useDisplayStore();
</script>

<template>
  <div
    class="relative flex flex-col max-w-[160px] bg-[--van-background] rounded-lg shadow transform transition-all duration-100 hover:-translate-y-1 hover:shadow-md cursor-pointer select-none active:bg-[--van-background-2]"
    @click="() => emit('click', videoItem)"
  >
    <LoadImage
      :width="!displayStore.isMobileView ? 160 : undefined"
      :height="!displayStore.isMobileView ? 200 : undefined"
      fit="cover"
      lazy-load
      :src="videoItem.cover!"
      :headers="videoItem.coverHeaders || undefined"
      class="h-full"
      :class="videoItem.title ? 'rounded-t-lg' : 'rounded-lg'"
    />

    <van-text-ellipsis
      rows="2"
      :content="videoItem.title"
      class="text-xs p-2 text-[--van-text-color]"
      v-if="videoItem.title"
    >
    </van-text-ellipsis>
  </div>
</template>

<style scoped lang="less"></style>
