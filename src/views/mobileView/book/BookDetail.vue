<script setup lang="ts">
import { BookChapter, BookItem } from '@/extensions/book';
import { BookSource } from '@/types';
import tinycolor from 'tinycolor2';
import _ from 'lodash';
import { PropType } from 'vue';
import LoadImage from '@/components/LoadImage.vue';
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

const emit = defineEmits<{
  (e: 'back'): void;
  (e: 'loadData'): void;
  (e: 'toChapter', chapter: BookChapter): void;
}>();
</script>

<template>
  <div class="relative w-full h-full flex flex-col">
    <van-nav-bar left-arrow @click-left="() => emit('back')" />
    <main
      ref="content"
      class="grow flex flex-col items-center w-full overflow-y-auto p-2 bg-[--van-background-2] select-none"
      v-if="book"
    >
      <div class="flex flex-col gap-1 p-2 w-full shadow-md rounded">
        <div class="flex gap-2 items-center justify-center flex-nowrap">
          <div class="w-[80px] h-[100px]">
            <LoadImage
              width="80px"
              height="100px"
              radius="4"
              :src="book.cover"
              :Headers="book.coverHeaders"
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
            </LoadImage>
          </div>

          <div
            class="flex flex-col gap-1 justify-start text-sm text-[--van-text-color]"
          >
            <div class="font-bold">
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
        </div>
        <van-text-ellipsis
          :content="book.intro"
          class="text-xs text-[--van-text-color] self-center"
          rows="3"
          expand-text="展开"
          collapse-text="收起"
        />
      </div>

      <div class="mt-4 w-full text-[--van-text-color]" v-if="book.chapters">
        <van-row align="center" justify="space-between">
          <p class="font-bold ml-6">共有{{ book.chapters.length }} 章</p>
          <div class="flex gap-2 items-center">
            <BookShelfButton :book="book"></BookShelfButton>
          </div>
        </van-row>
        <van-tabs shrink animated>
          <van-tab
            :title="`${index * 200 + 1}-${Math.min(book.chapters.length, (index + 1) * 200)}`"
            v-for="index of Array(Math.ceil(book.chapters.length / 200)).keys()"
          >
            <ResponsiveGrid>
              <p
                v-for="chapter in book.chapters.slice(
                  index * 200,
                  Math.min(book.chapters.length, (index + 1) * 200 - 1)
                )"
                :key="chapter.id"
                @click="() => emit('toChapter', chapter)"
                class="text-sm rounded-lg cursor-pointer select-none truncate van-haptics-feedback"
              >
                {{ chapter.title }}
              </p>
            </ResponsiveGrid>
          </van-tab>
        </van-tabs>
      </div>
      <van-back-top bottom="60" right="10" />
    </main>
    <BookShelf></BookShelf>
  </div>
</template>

<style scoped lang="less"></style>
