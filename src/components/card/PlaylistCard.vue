<script setup lang="ts">
import { PlaylistInfo } from '@/extensions/song';
import { router } from '@/router';
import { ref } from 'vue';
import { Icon } from '@iconify/vue';
import tinycolor from 'tinycolor2';
import { useDisplayStore, useStore } from '@/store';

const { playlist } = defineProps({
  playlist: {
    type: Object as () => PlaylistInfo,
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

const onClick = () => {
  router.push({
    name: 'SongPlaylist',
    params: { playlistId: playlist.id, sourceId: playlist.sourceId },
  });
};
</script>

<template>
  <div
    class="m-2 bg-[--van-background] rounded-lg shadow transform transition-all duration-100 hover:-translate-y-1 hover:shadow-md cursor-pointer select-none active:bg-[--van-background-2]"
    :class="displayStore.isMobile ? 'w-[100px]' : 'w-[160px]'"
    @click="onClick"
    @mouseenter="onMouseEnter"
    @mouseleave="onMouseLeave"
  >
    <van-image
      :width="displayStore.isMobile ? 100 : 160"
      :height="displayStore.isMobile ? 120 : 200"
      fit="cover"
      lazy-load
      :src="playlist.picUrl"
      class="rounded-t-lg"
    >
      <template v-slot:loading>
        <div class="text-center text-lg p-1" :style="{ color: color }">
          {{ playlist.name }}
        </div>
      </template>
      <template v-slot:error>
        <Icon icon="mdi:playlist-music" width="60" height="60" />
      </template>
    </van-image>
    <div
      :rows="1"
      class="text-xs p-2 text-[--van-text-color] h-[32px] truncate"
      v-if="playlist.name"
    >
      {{ playlist.name }}
    </div>
  </div>
</template>

<style scoped lang="less">
:deep(.van-image__img) {
  border-radius: 0.5rem 0.5rem 0 0;
}
</style>
