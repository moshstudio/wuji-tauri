<script setup lang="ts">
import type { BookChapter, BookItem } from '@/extensions/book';
import type { BookSource } from '@/types';
import type { PropType } from 'vue';
import BookShelfButton from '@/components/BookShelfButton.vue';
import ResponsiveGrid2 from '@/components/ResponsiveGrid2.vue';
import { useDisplayStore } from '@/store';
import BookShelf from '@/views/book/BookShelf.vue';
import _ from 'lodash';
import tinycolor from 'tinycolor2';

const emit = defineEmits<{
  (e: 'back'): void;
  (e: 'loadData'): void;
  (e: 'toChapter', chapter: BookChapter): void;
}>();
const book = defineModel('book', {
  type: Object as PropType<BookItem>,
});
const bookSource = defineModel('bookSource', {
  type: Object as PropType<BookSource>,
});
const content = defineModel('content', {
  type: Object as PropType<HTMLElement>,
});
const isAscending = defineModel('isAscending', {
  type: Boolean,
  required: true,
});

const displayStore = useDisplayStore();
</script>

<template>
  <div class="w-full h-full flex flex-col overflow-hidden">
    <div class="relative grow w-full h-full overflow-hidden">
      <van-nav-bar left-arrow @click-left="() => emit('back')" />
      <div
        v-remember-scroll
        v-if="book"
        ref="content"
        class="flex flex-col items-center px-4 pb-12 grow gap-2 w-full h-full overflow-y-auto"
      >
        <van-row
          justify="center"
          align="center"
          class="p-2 rounded shadow-md w-[80%]"
        >
          <van-image
            v-if="book.cover"
            width="80px"
            height="100px"
            radius="4"
            :src="book.cover"
            class="mr-4"
          >
            <template #loading>
              <div
                class="text-center self-center content-center text-lg p-1 w-[80px] h-[100px]"
                :style="{ color: tinycolor.random().toRgbString() }"
              >
                {{ book.title }}
              </div>
            </template>
          </van-image>
          <div
            class="flex flex-col gap-1 justify-start text-sm text-[--van-text-color] w-[80%]"
          >
            <p class="text-base font-bold">
              {{ book.title }}
            </p>
            <p class="text-xs flex gap-2">
              <span>{{ book.author }}</span>
              <span>{{ _.castArray(book.tags)?.join(',') }}</span>
              <span>{{ book.status }}</span>
            </p>
            <van-text-ellipsis
              :content="book.intro"
              class="text-xs text-[--van-text-color]"
              rows="3"
              expand-text="展开"
              collapse-text="收起"
            />
          </div>
        </van-row>
        <div
          v-if="book.chapters"
          class="w-full p-2 mt-4 shadow-md rounded text-[--van-text-color] lg:w-[80%]"
        >
          <div class="w-full flex justify-between gap-2 items-center">
            <p class="font-bold ml-6">共有{{ book.chapters.length }} 章</p>
            <div class="flex gap-2 items-center">
              <BookShelfButton :book="book" />
              <p class="mr-1">
                <van-button
                  :icon="isAscending ? 'ascending' : 'descending'"
                  size="small"
                  @click="() => (isAscending = !isAscending)"
                >
                  {{ isAscending ? '正序' : '倒序' }}
                </van-button>
              </p>
            </div>
          </div>
          <ResponsiveGrid2>
            <div
              v-for="chapter in isAscending
                ? book.chapters
                : [...book.chapters].reverse()"
              :key="chapter.id"
              class="text-sm p-2 hover:bg-[--van-background] rounded-lg cursor-pointer select-none truncate van-haptics-feedback"
              @click="() => emit('toChapter', chapter)"
            >
              {{ chapter.title }}
            </div>
          </ResponsiveGrid2>
        </div>
      </div>
      <BookShelf />
    </div>
  </div>
</template>

<style scoped lang="less"></style>
