<script setup lang="ts">
import type { BookChapter, BookItem } from '@wuji-tauri/source-extension';
import type { BookSource } from '@/types';
import { LiquidGlassContainer } from '@tinymomentum/liquid-glass-vue';
import { LoadImage } from '@wuji-tauri/components';
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
    inShelf?: boolean;
    preview?: boolean;
    toChapter?: (book: BookItem, chapter: BookChapter) => void;
    addToShelf?: (book: BookItem) => void;
    onDownload?: () => void;
  }>(),
  {
    inShelf: false,
    preview: false,
  },
);

const getRandomColor = () => tinycolor.random().toRgbString();
function joinTags(tags: string | string[] | undefined) {
  return _.castArray(tags)?.join(',');
}
</script>

<template>
  <div class="relative flex h-full w-full flex-col">
    <MNavBar v-if="!preview" title="书籍详情" />
    <main
      v-remember-scroll="!preview"
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
              :headers="book.coverHeaders"
              class="mr-4"
            >
              <template #loading>
                <div
                  class="h-[100px] w-[80px] content-center self-center p-1 text-center text-lg"
                  :style="{ color: getRandomColor() }"
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
              <span>{{ joinTags(book.tags) }}</span>
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
          <p class="font-bold">
            共有{{ book.chapters.length }} 章
          </p>
          <div v-if="!preview" class="flex items-center gap-2">
            <van-button
              size="small"
              type="primary"
              plain
              @click="() => onDownload?.()"
            >
              下载
            </van-button>
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
        </div>
        <van-tabs shrink animated>
          <van-tab
            v-for="index in Array(Math.ceil(book.chapters.length / 200)).keys()"
            :key="index"
            :title="`${index * 200 + 1}-${Math.min(book.chapters.length, (index + 1) * 200)}`"
          >
            <ResponsiveGrid2>
              <p
                v-for="chapter in book.chapters.slice(
                  index * 200,
                  Math.min(book.chapters.length, (index + 1) * 200 - 1),
                )"
                :key="chapter.id"
                class="select-none truncate rounded-lg text-sm"
                :class="
                  preview ? '' : 'van-haptics-feedback cursor-pointer'
                "
                @click="
                  () => {
                    if (!preview && book) {
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
      <van-back-top v-if="!preview" bottom="60" right="10">
        <LiquidGlassContainer
          :width="40"
          :height="40"
          :border-radius="20"
          glass-tint-color="#000000"
          :glass-tint-opacity="20"
          :frost-blur-radius="1"
        >
          <van-icon name="arrow-up" />
        </LiquidGlassContainer>
      </van-back-top>
    </main>
  </div>
</template>

<style scoped lang="less"></style>
