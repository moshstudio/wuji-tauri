<script setup lang="ts">
import type { PlaylistInfo } from '@/extensions/song';
import type { PropType } from 'vue';
import LoadImage from '@/components/LoadImage.vue';
import { router } from '@/router';
import { useDisplayStore, useStore } from '@/store';
import { Icon } from '@iconify/vue';
import tinycolor from 'tinycolor2';
import { ref } from 'vue';

const { playlist } = defineProps({
  playlist: {
    type: Object as PropType<PlaylistInfo>,
    required: true,
  },
});

const store = useStore();
const displayStore = useDisplayStore();
const playButtonVisible = ref(false);
const color = tinycolor.random().toRgbString();
function onMouseEnter() {
  playButtonVisible.value = true;
}
function onMouseLeave() {
  playButtonVisible.value = false;
}

function onClick() {
  router.push({
    name: 'SongPlaylist',
    params: { playlistId: playlist.id, sourceId: playlist.sourceId },
  });
}
</script>

<template>
  <div
    class="w-[160px] flex flex-col rounded-lg transform transition-all duration-100 cursor-pointer select-none active:bg-[--van-background]"
    @click="onClick"
    @mouseenter="onMouseEnter"
    @mouseleave="onMouseLeave"
  >
    <LoadImage
      :width="160"
      :height="200"
      fit="cover"
      lazy-load
      :src="playlist.picUrl"
      :headers="playlist.picHeaders"
      class="rounded-t-lg"
    >
      <template #loading>
        <div class="text-center text-lg p-1" :style="{ color }">
          {{ playlist.name }}
        </div>
      </template>
      <template #error>
        <Icon icon="mdi:playlist-music" width="60" height="60" />
      </template>
    </LoadImage>
    <p
      v-if="playlist.name"
      class="text-xs text-center text-[--van-text-color] truncate py-1"
    >
      {{ playlist.name }}
    </p>
  </div>
</template>

<style scoped lang="less">
:deep(.van-image__img) {
  border-radius: 0.5rem 0.5rem 0 0;
}
</style>
