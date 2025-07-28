<script setup lang="ts">
import { SongList } from '@wuji-tauri/source-extension';

const props = defineProps<{
  content: {
    type: string;
    chineseName: string;
    id: string;
    name: string;
    version: string;
    pages: {
      type: string;
      chineseName: string;
      code: string;
      passed: boolean;
      result: SongList | undefined;
    }[];
  };
  updateResult: (
    type: 'song',
    page: 'lyric',
    result: string | undefined,
    padded: boolean,
  ) => void;
  close: () => void;
}>();

async function initLoad() {
  props.updateResult('song', 'lyric', '', true);
}

defineExpose({
  initLoad,
});
</script>

<template>
  <div>
    <div>无需实现, 软件自动匹配歌词</div>
  </div>
</template>

<style scoped lang="less"></style>
