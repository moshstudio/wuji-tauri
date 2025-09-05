<script setup lang="ts">
import type { BookChapter, BookItem } from '@wuji-tauri/source-extension';
import type { BookSource } from '@/types';
import { LoadImage } from '@wuji-tauri/components/src';
import _ from 'lodash';
import tinycolor from 'tinycolor2';
import AddShelfButton from '@/components/button/AddShelfButton.vue';
import ResponsiveGrid2 from '@/components/grid/ResponsiveGrid2.vue';
import MNavBar from '@/components/header/MNavBar.vue';
import { router } from '@/router';

withDefaults(
  defineProps<{
    book?: BookItem;
    bookSource?: BookSource;
    inShelf: boolean;
    toChapter?: (book: BookItem, chapter: BookChapter) => void;
    addToShelf?: (book: BookItem) => void;
  }>(),
  {},
);
</script>

<template>
  <div class="relative flex h-full w-full flex-col">
    <MNavBar title="书籍详情" />
    <main
      v-remember-scroll
      class="flex w-full grow select-none flex-col items-center overflow-y-auto bg-[--van-background-2] p-2"
    >
      <div v-if="book" class="flex w-full flex-col gap-1 rounded p-2 shadow-md">
        <div class="flex flex-nowrap items-center justify-center gap-2">
          <div v-if="book.cover" class="h-[100px] w-[80px]">
            <LoadImage
              width="80px"
              height="100px"
              radius="4"
              :src="book.cover"
              :Headers="book.coverHeaders"
              class="mr-4"
            >
              <template #loading>
                <div
                  class="h-[100px] w-[80px] content-center self-center p-1 text-center text-lg"
                  :style="{ color: tinycolor.random().toRgbString() }"
                >
                  {{ book.title }}
                </div>
              </template>
            </LoadImage>
          </div>

          <div
            class="flex flex-col justify-start gap-1 text-sm text-[--van-text-color]"
          >
            <div class="font-bold">
              {{ book.title }}
            </div>
            <p class="flex gap-2 text-xs">
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
          class="self-center text-xs text-gray-400"
          rows="3"
          expand-text="展开"
          collapse-text="收起"
        />
      </div>

      <div v-if="book?.chapters" class="mt-4 w-full text-[--van-text-color]">
        <div class="flex w-full items-center justify-between">
          <p class="font-bold">共有{{ book.chapters.length }} 章</p>
          <AddShelfButton
            :is-added="inShelf"
            add-text="加入书架"
            added-text="已加书架"
            :add-click="
              () => {
                if (book) {
                  addToShelf?.(book);
                }
              }
            "
            :added-click="
              () => {
                router.push({ name: 'BookShelf' });
              }
            "
          />
        </div>
        <van-tabs shrink animated>
          <van-tab
            v-for="index of Array(Math.ceil(book.chapters.length / 200)).keys()"
            :title="`${index * 200 + 1}-${Math.min(book.chapters.length, (index + 1) * 200)}`"
          >
            <ResponsiveGrid2>
              <p
                v-for="chapter in book.chapters.slice(
                  index * 200,
                  Math.min(book.chapters.length, (index + 1) * 200 - 1),
                )"
                :key="chapter.id"
                class="van-haptics-feedback cursor-pointer select-none truncate rounded-lg text-sm"
                @click="
                  () => {
                    if (book) {
                      toChapter?.(book, chapter);
                    }
                  }
                "
              >
                {{ chapter.title }}
              </p>
            </ResponsiveGrid2>
          </van-tab>
        </van-tabs>
      </div>
      <div v-if="!book" class="flex w-full items-center justify-center">
        <van-loading />
      </div>
      <van-back-top bottom="60" right="10" />
    </main>
  </div>
</template>

<style scoped lang="less"></style>
