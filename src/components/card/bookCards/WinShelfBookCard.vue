<script setup lang="ts">
import _ from 'lodash';
import { BookItem, BookItemInShelf } from '@/extensions/book';
import { Icon } from '@iconify/vue';
import { ref } from 'vue';
import LoadImage from '@/components/LoadImage.vue';
import MoreOptionsSheet from '@/components/actionSheets/MoreOptions.vue';
import { useStore } from '@/store';

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
    class="flex gap-2 p-2 rounded-lg transform transition-all duration-100 cursor-pointer select-none active:bg-[--van-background]"
    @click="() => emit('click', shelfBook)"
  >
    <div class="w-[80px] h-[100px]">
      <LoadImage
        width="80px"
        height="100px"
        radius="4"
        :src="shelfBook.book.cover"
        :headers="shelfBook.book.coverHeaders"
      >
        <template #loading>
          <Icon icon="codicon:book" width="48" height="48" />
        </template>
        <template #error>
          <Icon icon="codicon:book" width="48" height="48" />
        </template>
      </LoadImage>
    </div>

    <div class="grow flex flex-col gap-1 text-sm text-[--van-text-color]">
      <div class="flex gap-2 items-center">
        <p class="text-base font-bold h-6 line-clamp-2">
          {{ shelfBook.book.title }}
        </p>
        <p class="text-xs text-gray-400 truncate">
          {{ store.getBookSource(shelfBook.book.sourceId)?.item.name }}
        </p>
      </div>

      <p class="text-xs truncate flex gap-2">
        <span v-if="shelfBook.book.author" class="min-w-0 truncate">
          {{ shelfBook.book.author }}
        </span>
        <span v-if="unread" class="min-w-0 truncate"> {{ unread }}章未读 </span>
      </p>
      <p class="text-xs line-clamp-1">
        {{ shelfBook.lastReadChapter?.title }}
      </p>
      <p>
        <span class="text-xs line-clamp-1">
          {{ _.last(shelfBook.book.chapters)?.title }}
        </span>
      </p>
    </div>
    <div class="flex flex-col justify-start mt-1 van-haptics-feedback">
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
        subname: shelfBook.book.title,
        color: '#1989fa',
        callback: () => {
          showMoreOptions = false;
          emit('remove', shelfBook);
        },
      },
    ]"
  ></MoreOptionsSheet>
</template>

<style scoped lang="less"></style>
