<script setup lang="ts">
import type { SongInfo, SongShelf } from '@wuji-tauri/source-extension';
import { ActionSheet as VanActionSheet } from 'vant';
import { computed } from 'vue';

const show = defineModel<boolean>();

const props = defineProps<{
  song: SongInfo;
  shelfs: SongShelf[];
  addToShelf: (song: SongInfo, shelf: SongShelf) => void;
}>();

const actions = computed(() => {
  return props.shelfs.map((item) => {
    const existed = item.playlist.list?.list.some(
      (s) => s.id === props.song.id,
    );
    return {
      name: item.playlist.name,
      subname: existed
        ? '已添加'
        : `共 ${item.playlist.list?.list.length || 0} 首`,
      color: '#1989fa',
      disabled: existed,
      callback: () => {
        show.value = false;
        props.addToShelf(props.song, item);
      },
    };
  });
});
</script>

<template>
  <VanActionSheet
    v-model:show="show"
    :actions="actions"
    title="选择收藏夹"
    cancel-text="取消"
    teleport="body"
    close-on-click-action
  />
</template>

<style scoped lang="less"></style>
