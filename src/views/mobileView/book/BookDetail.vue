<script setup lang="ts">
import { BookChapter, BookItem } from '@/extensions/book';
import { BookSource } from '@/types';
import tinycolor from 'tinycolor2';
import _ from 'lodash';
import { PropType } from 'vue';
import ResponsiveGrid from '@/components/ResponsiveGrid.vue';
import BookShelfButton from '@/components/BookShelfButton.vue';
import BookShelf from '@/views/book/BookShelf.vue';

const book = defineModel('book', { type: Object as PropType<BookItem> });
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
const showBookShelf = defineModel('showBookShelf', {
  type: Boolean,
  required: true,
});

const emit = defineEmits<{
  (e: 'back'): void;
  (e: 'loadData'): void;
  (e: 'toChapter', chapter: BookChapter): void;
}>();
</script>

<template>
  <div class="relative h-full flex flex-col">
    <van-nav-bar left-arrow @click-left="() => emit('back')" />
    <main
      ref="content"
      class="grow flex flex-col items-center overflow-y-auto p-4 bg-[--van-background-3] select-none"
      v-if="book"
    >
      <div class="flex flex-col gap-1 p-2 shadow-md rounded">
        <van-row justify="center" align="center">
          <van-image
            width="80px"
            height="100px"
            :src="book.cover"
            class="mr-4"
            v-if="book.cover"
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
            class="flex flex-col gap-1 justify-start text-sm text-[--van-text-color] min-w-[180px] max-w-[50%]"
          >
            <div class="font-bold truncate">
              {{ book.title }}
            </div>
            <p class="text-xs flex gap-2">
              <span>{{ book.author }}</span>
              <span>{{ _.castArray(book.tags)?.join(',') }}</span>
              <span>{{ book.status }}</span>
            </p>

            <p>
              <span class="text-xs">{{ book.latestChapter }}</span>
            </p>
          </div>
        </van-row>
        <van-text-ellipsis
          :content="book.intro"
          class="text-xs text-[--van-text-color]"
          rows="3"
          expand-text="展开"
          collapse-text="收起"
        />
      </div>

      <div
        class="p-2 mt-4 shadow rounded text-[--van-text-color]"
        v-if="book.chapters"
      >
        <van-row align="center" justify="space-between">
          <p class="font-bold ml-6">共有{{ book.chapters.length }} 章</p>
          <div class="flex gap-2 items-center">
            <BookShelfButton
              :book="book"
              @show-shelf="showBookShelf = true"
            ></BookShelfButton>
            <p>
              <van-button
                :icon="isAscending ? 'ascending' : 'descending'"
                size="small"
                @click="() => (isAscending = !isAscending)"
              >
                {{ isAscending ? '正序' : '倒序' }}
              </van-button>
            </p>
          </div>
        </van-row>
        <ResponsiveGrid>
          <li
            v-for="chapter in isAscending
              ? book.chapters
              : [...book.chapters].reverse()"
            :key="chapter.id"
            @click="() => emit('toChapter', chapter)"
            class="text-sm p-2 h-9 hover:bg-[--van-background] hover:shadow-md rounded-lg cursor-pointer select-none truncate van-haptics-feedback"
          >
            {{ chapter.title }}
          </li>
        </ResponsiveGrid>
      </div>
    </main>
    <BookShelf v-model:show="showBookShelf"></BookShelf>
  </div>
</template>

<style scoped lang="less"></style>
