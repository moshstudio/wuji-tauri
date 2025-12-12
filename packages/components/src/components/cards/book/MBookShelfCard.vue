<script setup lang="ts">
import type {
  BookItemInShelf,
  BookShelf,
  BookSource,
} from '@wuji-tauri/source-extension';
import { Icon } from '@iconify/vue';
import { last } from 'lodash';
import { computed, ref } from 'vue';
import LoadImage from '../../LoadImage.vue';
import MoreOptionsSheet from '../../MoreOptionsSheet.vue';

const props = defineProps<{
  book: BookItemInShelf;
  shelf: BookShelf;
  source?: BookSource;
  unread?: number;
  click: (book: BookItemInShelf, chapterId?: string) => void;
  removeFromShelf: (book: BookItemInShelf, shelf: BookShelf) => void;
}>();

const showMoreOptions = ref(false);

const latestChapterTitle = computed(() => {
  return last(props.book.book.chapters)?.title;
});
</script>

<template>
  <div
    class="active-bg-scale m-2 flex gap-2 rounded-lg p-2"
    @click="() => click(book, book.lastReadChapter?.id)"
  >
    <div class="h-[100px] w-[80px]">
      <LoadImage
        width="80px"
        height="100px"
        radius="4"
        :src="book.book.cover"
        :headers="book.book.coverHeaders"
        lazy-load
      >
        <template #loading>
          <Icon icon="codicon:book" width="48" height="48" />
        </template>
        <template #error>
          <Icon icon="codicon:book" width="48" height="48" />
        </template>
      </LoadImage>
    </div>

    <div
      class="flex min-w-0 grow flex-col justify-around text-sm text-[--van-text-color]"
    >
      <div class="flex items-center gap-2">
        <p class="line-clamp-2 h-6 text-base font-bold">
          {{ book.book.title }}
        </p>
        <p class="truncate text-xs text-gray-400">
          {{ source?.item.name }}
        </p>
      </div>

      <p class="flex gap-2 truncate text-xs">
        <span class="min-w-0 truncate">
          {{ book.book.author || '佚名' }}
        </span>
        <span v-if="unread" class="min-w-0 truncate">{{ unread }}章未读</span>
      </p>
      <p class="line-clamp-1 text-xs">
        {{ book.lastReadChapter?.title || '未开始阅读' }}
      </p>
      <p>
        <span class="line-clamp-1 text-xs">
          {{ latestChapterTitle }}
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
        subname: book.book.title,
        callback: () => {
          showMoreOptions = false;
          removeFromShelf(book, shelf);
        },
      },
    ]"
  />
</template>

<style scoped lang="less"></style>
