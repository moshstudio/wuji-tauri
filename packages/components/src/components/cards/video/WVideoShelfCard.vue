<script setup lang="ts">
import type {
  VideoEpisode,
  VideoItemInShelf,
  VideoSource,
} from '@wuji-tauri/source-extension';

import { Icon } from '@iconify/vue';
import { computed, ref } from 'vue';
import LoadImage from '../../LoadImage.vue';

const props = withDefaults(
  defineProps<{
    video: VideoItemInShelf;
    selectMode?: boolean;
    click: (video: VideoItemInShelf) => void;
  }>(),
  {
    selectMode: false,
  },
);

const selected = defineModel('selected');
const source = ref<VideoSource>();

function onClick() {
  if (props.selectMode) {
    selected.value = !selected.value;
    return;
  }
  props.click(props.video);
}

const lastWatchEpisode = computed((): VideoEpisode | undefined => {
  return props.video.video.resources
    ?.find((resource) => {
      return resource.id === props.video.video.lastWatchResourceId;
    })
    ?.episodes?.find((episode) => {
      return episode.id === props.video.video.lastWatchEpisodeId;
    });
});
</script>

<template>
  <div
    v-tooltip="video.video.title"
    class="active-bg-scale relative flex flex-col rounded-lg"
    :class="selectMode ? (selected ? '' : 'opacity-50') : ''"
    @click="onClick"
  >
    <LoadImage
      fit="cover"
      :src="video.video.cover"
      :headers="video.video.coverHeaders"
      class="h-full min-h-[120px] w-full"
    >
      <template #loading>
        <Icon icon="codicon:comic" width="48" height="48" />
      </template>
      <template #error>
        <Icon icon="codicon:comic" width="48" height="48" />
      </template>
    </LoadImage>

    <p
      v-if="video.video.title"
      class="max-w-full truncate py-1 text-center text-xs text-[var(--van-text-color)]"
    >
      {{ video.video.title }}
    </p>
    <p
      class="absolute bottom-[22px] max-w-full truncate bg-slate-600/80 p-1 text-xs text-gray-200"
    >
      {{ lastWatchEpisode?.title || '未观看' }}
    </p>
    <p
      v-if="source && selectMode"
      class="absolute left-0 top-0 max-w-full rounded bg-black p-1 text-xs text-white"
    >
      {{ source.item.name }}
    </p>
    <van-checkbox
      v-if="selectMode"
      v-model="selected"
      shape="square"
      class="absolute right-0 top-0"
      @click.stop="onClick"
    />
  </div>
</template>

<style scoped lang="less"></style>
