<script setup lang="ts">
import _ from 'lodash';
import { Icon } from '@iconify/vue';
import { ref } from 'vue';
import MoreOptionsSheet from '@/components/actionSheets/MoreOptions.vue';
import { useStore } from '@/store';
import {
  VideoEpisode,
  VideoItemInShelf,
  VideoResource,
} from '@/extensions/video';

const { shelfVideo } = defineProps<{
  shelfVideo: VideoItemInShelf;
}>();
const emit = defineEmits<{
  (
    e: 'click',
    item: VideoItemInShelf,
    episode?: VideoEpisode,
    resource?: VideoResource
  ): void;
  (e: 'remove', item: VideoItemInShelf): void;
}>();

const store = useStore();
const showMoreOptions = ref(false);
</script>

<template>
  <div
    class="flex gap-2 m-2 p-2 bg-[--van-background] rounded-lg shadow transform transition-all duration-100 hover:-translate-y-1 hover:shadow-md cursor-pointer select-none active:bg-[--van-background-2]"
    @click="
      () =>
        emit(
          'click',
          shelfVideo,
          shelfVideo.lastWatchEpisode,
          shelfVideo.lastWatchResource
        )
    "
  >
    <div class="w-[80px] h-[100px]">
      <van-image
        width="80px"
        height="100px"
        radius="4"
        :src="shelfVideo.video.cover"
      >
        <template #loading>
          <Icon icon="codicon:comic" width="48" height="48" />
        </template>
        <template #error>
          <Icon icon="codicon:comic" width="48" height="48" />
        </template>
      </van-image>
    </div>

    <div
      class="grow flex flex-col gap-1 justify-around text-sm text-[--van-text-color]"
    >
      <div class="flex gap-2 items-center">
        <p class="text-base font-bold h-6 line-clamp-1">
          {{ shelfVideo.video.title }}
        </p>
        <p class="text-xs text-gray-400">
          {{ store.getVideoSource(shelfVideo.video.sourceId)?.item.name }}
        </p>
      </div>

      <p class="text-xs line-clamp-1">
        {{ shelfVideo.lastWatchEpisode?.title }}
      </p>
    </div>
    <div class="flex flex-col justify-start mt-2 van-haptics-feedback">
      <van-icon
        name="ellipsis"
        class="clickable text-[--van-text-color]"
        size="16"
        @click.stop="() => (showMoreOptions = true)"
      />
    </div>
  </div>
  <MoreOptionsSheet
    v-model="showMoreOptions"
    :actions="[
      {
        name: '从当前收藏夹移除',
        color: '#1989fa',
        callback: () => {
          showMoreOptions = false;
          emit('remove', shelfVideo);
        },
      },
    ]"
  ></MoreOptionsSheet>
</template>

<style scoped lang="less"></style>
