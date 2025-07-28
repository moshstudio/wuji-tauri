<script setup lang="ts">
import type {
  ComicItemInShelf,
  ComicShelf,
  ComicSource,
} from '@wuji-tauri/source-extension';
import MoreOptionsSheet from '../../MoreOptionsSheet.vue';
import { Icon } from '@iconify/vue';
import _ from 'lodash';
import { ref } from 'vue';

defineProps<{
  comic: ComicItemInShelf;
  shelf: ComicShelf;
  source?: ComicSource;
  unread?: number;
  click: (comic: ComicItemInShelf, chapterId?: string) => void;
  removeFromShelf: (comic: ComicItemInShelf, shelf: ComicShelf) => void;
}>();

const showMoreOptions = ref(false);
</script>

<template>
  <div
    class="active-bg-scale flex gap-2 rounded-lg p-2"
    @click="() => click(comic, comic.lastReadChapter?.id)"
  >
    <div class="h-[100px] w-[80px]">
      <van-image
        width="80px"
        height="100px"
        radius="4"
        :src="comic.comic.cover"
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
      class="flex grow flex-col justify-around text-sm text-[--van-text-color]"
    >
      <div class="flex items-center gap-2">
        <p class="line-clamp-2 h-6 text-base font-bold">
          {{ comic.comic.title }}
        </p>
        <p class="truncate text-xs text-gray-400">
          {{ source?.item.name }}
        </p>
      </div>

      <p class="flex gap-2 truncate text-xs">
        <span v-if="comic.comic.author">
          {{ comic.comic.author }}
        </span>
        <span v-if="unread">{{ unread }}章未读</span>
      </p>
      <p class="line-clamp-1 text-xs">
        {{ comic.lastReadChapter?.title }}
      </p>
      <p>
        <span class="line-clamp-1 text-xs">
          {{ _.last(comic.comic.chapters)?.title }}
        </span>
      </p>
    </div>
    <div class="van-haptics-feedback mt-2 flex flex-col justify-start">
      <van-icon
        name="ellipsis"
        class="clickable p-2 text-[--van-text-color]"
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
        color: '#E74C3C',
        callback: () => {
          showMoreOptions = false;
          removeFromShelf(comic, shelf);
        },
      },
    ]"
  />
</template>

<style scoped lang="less"></style>
