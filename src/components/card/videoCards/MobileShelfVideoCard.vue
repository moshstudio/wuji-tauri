<script setup lang="ts">
import type {
  VideoEpisode,
  VideoItemInShelf,
  VideoResource,
} from '@/extensions/video';
import type { VideoSource } from '@/types';
import type { PropType } from 'vue';
import LoadImage from '@/components/LoadImage.vue';
import { router } from '@/router';
import { useStore } from '@/store';
import { Icon } from '@iconify/vue';
import { computed, onMounted, ref } from 'vue';

const { shelfVideo, selecteMode } = defineProps({
  shelfVideo: {
    type: Object as PropType<VideoItemInShelf>,
    required: true,
  },
  selecteMode: {
    type: Boolean,
    default: false,
  },
});

const emit = defineEmits<{
  (
    e: 'click',
    item: VideoItemInShelf,
    episode?: VideoEpisode,
    resource?: VideoResource,
  ): void;
  (e: 'remove', item: VideoItemInShelf): void;
}>();

const selected = defineModel('selected');
const source = ref<VideoSource>();

function onClick() {
  if (selecteMode) {
    selected.value = !selected.value;
    return;
  }
  router.push({
    name: 'VideoDetail',
    params: {
      videoId: shelfVideo.video.id,
      sourceId: shelfVideo.video.sourceId,
    },
  });
}

const lastWatchEpisode = computed((): VideoEpisode | undefined => {
  return shelfVideo.video.resources
    ?.find((resource) => {
      return resource.id === shelfVideo.video.lastWatchResourceId;
    })
    ?.episodes
    ?.find((episode) => {
      return episode.id === shelfVideo.video.lastWatchEpisodeId;
    });
});

onMounted(() => {
  const store = useStore();
  source.value = store.getVideoSource(shelfVideo.video.sourceId);
});
</script>

<template>
  <div
    class="relative flex flex-col rounded-lg transform transition-all duration-100 cursor-pointer select-none active:bg-[--van-background]"
    :class="selecteMode ? (selected ? '' : 'opacity-50') : ''"
    @click="onClick"
  >
    <LoadImage
      fit="cover"
      lazy-load
      :src="shelfVideo.video.cover"
      :headers="shelfVideo.video.coverHeaders"
      class="h-full"
    >
      <template #loading>
        <Icon icon="codicon:comic" width="48" height="48" />
      </template>
      <template #error>
        <Icon icon="codicon:comic" width="48" height="48" />
      </template>
    </LoadImage>

    <p
      v-if="shelfVideo.video.title"
      class="text-xs text-center text-[var(--van-text-color)] truncate py-1"
    >
      {{ shelfVideo.video.title }}
    </p>
    <p
      class="absolute text-xs text-gray-200 bg-slate-600/80 p-1 bottom-6 left-1 truncate"
    >
      {{ lastWatchEpisode?.title || '未观看' }}
    </p>
    <p
      v-if="source && selecteMode"
      class="absolute top-2 left-2 p-1 text-white bg-black rounded text-xs"
    >
      {{ source.item.name }}
    </p>
    <van-checkbox
      v-if="selecteMode"
      v-model="selected"
      shape="square"
      class="absolute top-2 right-2"
      @click.stop="onClick"
    />
  </div>
</template>

<style scoped lang="less"></style>
