<script setup lang="ts">
import { SongInfo } from '@/extensions/song';
import { useSongShelfStore } from '@/store';
import { ref, reactive, computed } from 'vue';
const show = defineModel<boolean>();
const { song } = defineProps<{
  song: SongInfo;
}>();

const shelfStore = useSongShelfStore();
const actions = computed(() => {
  return shelfStore.songCreateShelf.map((item) => {
    const existed = item.playlist.list?.list.some((s) => s.id === song.id);
    return {
      name: item.playlist.name,
      subname: existed
        ? '已添加'
        : `共 ${item.playlist.list?.list.length || 0} 首`,
      color: '#1989fa',
      disabled: existed,
      callback: () => {
        show.value = false;
        shelfStore.addSongToShelf(song, item.playlist.id);
      },
    };
  });
});
</script>

<template>
  <van-action-sheet
    v-model:show="show"
    :actions="actions"
    title="选择收藏夹"
    cancel-text="取消"
    teleport="body"
  />
</template>

<style scoped lang="less"></style>
