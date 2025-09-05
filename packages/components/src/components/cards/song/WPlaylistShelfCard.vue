<script setup lang="ts">
import type { SongShelf } from '@wuji-tauri/source-extension';
import { ref } from 'vue';
import LoadImage from '../../LoadImage.vue';
import MoreOptionsSheet from '../../MoreOptionsSheet.vue';

withDefaults(
  defineProps<{
    shelf: SongShelf;
    removeable?: boolean;
    click: (shelf: SongShelf) => void;
    removeFromShelf?: (shelf: SongShelf) => void;
  }>(),
  {
    removeable: false,
  },
);
const showMoreOptions = ref(false);
</script>

<template>
  <div
    class="active-bg-scale relative flex items-center rounded-lg p-1"
    @click="() => click(shelf)"
  >
    <LoadImage
      :src="shelf.playlist.picUrl || shelf.playlist.list?.list[0]?.picUrl"
      :headers="shelf.playlist.picHeaders"
      :width="36"
      :height="36"
      :radius="8"
    >
      <template #loading>
        <van-icon name="audio" size="24" />
      </template>
      <template #error>
        <van-icon name="audio" size="24" />
      </template>
    </LoadImage>
    <div
      class="flex min-w-[10px] flex-1 truncate pl-2 text-xs text-[--van-text-color]"
    >
      {{ shelf.playlist.name }}
    </div>
    <van-icon
      v-if="removeable"
      name="ellipsis"
      class="clickable p-2 text-[--van-text-color]"
      @click.stop="showMoreOptions = !showMoreOptions"
    />
    <MoreOptionsSheet
      v-if="removeable"
      v-model="showMoreOptions"
      :actions="[
        {
          name: '删除歌单',
          color: '#E74C3C',
          subname: shelf.playlist.name,
          callback: () => {
            showMoreOptions = false;
            removeFromShelf?.(shelf);
          },
        },
      ]"
    />
  </div>
</template>

<style scoped lang="less"></style>
