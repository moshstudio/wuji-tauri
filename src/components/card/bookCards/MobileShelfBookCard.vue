<script setup lang="ts">
import type { BookItemInShelf } from '@/extensions/book';
import MoreOptionsSheet from '@/components/actionSheets/MoreOptions.vue';
import LoadImage from '@/components/LoadImage.vue';
import { useStore } from '@/store';
import { Icon } from '@iconify/vue';
import _ from 'lodash';
import { ref } from 'vue';

const { shelfBook, unread } = defineProps<{
  shelfBook: BookItemInShelf;
  unread?: number;
}>();
const emit = defineEmits<{
  (e: 'click', item: BookItemInShelf, chapterId?: string): void;
  (e: 'remove', item: BookItemInShelf): void;
}>();

const store = useStore();
const showMoreOptions = ref(false);
</script>

<template>
  <div
    class="flex gap-2 m-2 p-2 rounded-lg transform transition-all duration-100 cursor-pointer select-none active:bg-[--van-background]"
    @click="() => emit('click', shelfBook, shelfBook.lastReadChapter?.id)"
  >
    <div class="w-[80px] h-[100px]">
      <LoadImage
        width="80px"
        height="100px"
        radius="4"
        lazy-load
        :src="shelfBook.book.cover"
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
      class="grow flex flex-col justify-around text-sm text-[--van-text-color]"
    >
      <div class="flex gap-2 items-center">
        <p class="text-base font-bold h-6 line-clamp-2">
          {{ shelfBook.book.title }}
        </p>
        <p class="text-xs text-gray-400 truncate">
          {{ store.getBookSource(shelfBook.book.sourceId)?.item.name }}
        </p>
      </div>

      <p class="text-xs truncate flex gap-2">
        <span class="min-w-0 truncate">
          {{ shelfBook.book.author || '佚名' }}
        </span>
        <span v-if="unread" class="min-w-0 truncate">{{ unread }}章未读</span>
      </p>
      <p class="text-xs line-clamp-1">
        {{ shelfBook.lastReadChapter?.title || '未开始阅读' }}
      </p>
      <p>
        <span class="text-xs line-clamp-1">
          {{ _.last(shelfBook.book.chapters)?.title }}
        </span>
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
        color: '#E74C3C',
        subname: shelfBook.book.title,
        callback: () => {
          showMoreOptions = false;
          emit('remove', shelfBook);
        },
      },
    ]"
  />
</template>

<style scoped lang="less"></style>
