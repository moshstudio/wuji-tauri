<script setup lang="ts">
import MBookShelfCard from './MBookShelfCard.vue';
import type {
  BookItemInShelf,
  BookShelf,
  BookSource,
} from '@wuji-tauri/source-extension';
import _ from 'lodash';

defineProps<{
  book: BookItemInShelf;
  shelf: BookShelf;
  source?: BookSource;
  unread?: number;
  click: (book: BookItemInShelf, chapterId?: string) => void;
  removeFromShelf: (book: BookItemInShelf, shelf: BookShelf) => void;
}>();
</script>

<template>
  <MBookShelfCard
    v-bind="$attrs"
    :book="book"
    :shelf="shelf"
    :source="source"
    :unread="unread"
    :click="click"
    :remove-from-shelf="removeFromShelf"
  ></MBookShelfCard>
</template>

<!-- <script setup lang="ts">
import type {
  BookItemInShelf,
  BookShelf,
  BookSource,
} from '@wuji-tauri/source-extension';
import MoreOptionsSheet from '../../MoreOptionsSheet.vue';
import LoadImage from '../../LoadImage.vue';
import { Icon } from '@iconify/vue';
import _ from 'lodash';
import { ref } from 'vue';

defineProps<{
  book: BookItemInShelf;
  shelf: BookShelf;
  source?: BookSource;
  unread?: number;
  click: (book: BookItemInShelf, chapterId?: string) => void;
  removeFromShelf: (book: BookItemInShelf, shelf: BookShelf) => void;
}>();

const showMoreOptions = ref(false);
</script>

<template>
  <div
    class="active-bg-scale flex gap-2 rounded-lg p-2"
    @click="() => click(book, book.lastReadChapter?.id)"
  >
    <div class="h-[100px] w-[80px]">
      <LoadImage
        width="80px"
        height="100px"
        radius="4"
        :src="book.book.cover"
        :headers="book.book.coverHeaders"
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
      class="flex grow flex-col justify-around text-sm text-[--van-text-color]"
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
          {{ _.last(book.book.chapters)?.title }}
        </span>
      </p>
    </div>
    <div class="van-haptics-feedback mt-1 flex flex-col justify-start">
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
        subname: book.book.title,
        color: '#E74C3C',
        callback: () => {
          showMoreOptions = false;
          removeFromShelf(book, shelf);
        },
      },
    ]"
  />
</template>

<style scoped lang="less"></style> -->
