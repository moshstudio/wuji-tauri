<script setup lang="ts">
import type { ComicChapter, ComicItem } from '@/extensions/comic';
import type { ComicSource } from '@/types';
import type { PropType } from 'vue';
import ComicShelfButton from '@/components/ComicShelfButton.vue';
import LoadImage from '@/components/LoadImage.vue';
import ResponsiveGrid from '@/components/ResponsiveGrid.vue';
import ComicShelf from '@/views/comic/ComicShelf.vue';
import _ from 'lodash';
import tinycolor from 'tinycolor2';

const emit = defineEmits<{
  (e: 'back'): void;
  (e: 'loadData'): void;
  (e: 'toChapter', chapter: ComicChapter): void;
}>();
const comic = defineModel('comic', { type: Object as PropType<ComicItem> });
const comicSource = defineModel('comicSource', {
  type: Object as PropType<ComicSource>,
});
const content = defineModel('content', {
  type: Object as PropType<HTMLElement>,
});
const isAscending = defineModel('isAscending', {
  type: Boolean,
  required: true,
});
</script>

<template>
  <div class="relative w-full h-full flex flex-col">
    <van-nav-bar left-arrow @click-left="() => emit('back')" />
    <main
      v-if="comic"
      v-remember-scroll
      ref="content"
      class="grow flex flex-col items-center w-full overflow-y-auto p-2 bg-[--van-background-2] select-none"
    >
      <div class="flex flex-col gap-1 p-2 w-full shadow-md rounded">
        <div class="flex gap-2 items-center justify-center flex-nowrap w-full">
          <div class="w-[80px] h-[100px]">
            <LoadImage
              v-if="comic.cover"
              width="80px"
              height="100px"
              radius="4"
              :src="comic.cover"
              :headers="comic.coverHeaders"
              class="mr-4"
            >
              <template #loading>
                <div
                  class="text-center self-center content-center text-lg p-1 w-[80px] h-[100px]"
                  :style="{ color: tinycolor.random().toRgbString() }"
                >
                  {{ comic.title }}
                </div>
              </template>
            </LoadImage>
          </div>

          <div
            class="grow flex flex-col gap-1 justify-start text-sm text-[--van-text-color] text-ellipsis"
          >
            <div class="font-bold">
              {{ comic.title }}
            </div>
            <p class="text-xs flex gap-2">
              <span>{{ comic.author }}</span>
              <span>{{ _.castArray(comic.tags)?.join(',') }}</span>
              <span>{{ comic.status }}</span>
            </p>

            <p>
              <span class="text-xs">{{ comic.latestChapter }}</span>
            </p>
          </div>
        </div>
        <van-text-ellipsis
          :content="comic.intro"
          class="text-xs text-[--van-text-color]"
          rows="3"
          expand-text="展开"
          collapse-text="收起"
        />
      </div>

      <div v-if="comic.chapters" class="mt-4 w-full text-[--van-text-color]">
        <van-row align="center" justify="space-between">
          <p class="font-bold ml-6">共有{{ comic.chapters.length }} 章</p>
          <div class="flex gap-2 items-center">
            <ComicShelfButton :comic="comic" />
            <!-- <p>
              <van-button
                :icon="isAscending ? 'ascending' : 'descending'"
                size="small"
                @click="() => (isAscending = !isAscending)"
              >
                {{ isAscending ? '正序' : '倒序' }}
              </van-button>
            </p> -->
          </div>
        </van-row>
        <van-tabs shrink animated>
          <van-tab
            v-for="index of Array(
              Math.ceil(comic.chapters.length / 200),
            ).keys()"
            :title="`${index * 200 + 1}-${Math.min(comic.chapters.length, (index + 1) * 200)}`"
          >
            <ResponsiveGrid>
              <p
                v-for="chapter in comic.chapters.slice(
                  index * 200,
                  Math.min(comic.chapters.length, (index + 1) * 200 - 1),
                )"
                :key="chapter.id"
                class="text-sm rounded-lg cursor-pointer select-none truncate van-haptics-feedback"
                @click="() => emit('toChapter', chapter)"
              >
                {{ chapter.title }}
              </p>
            </ResponsiveGrid>
          </van-tab>
        </van-tabs>
      </div>
      <van-back-top bottom="60" right="10" />
    </main>
    <ComicShelf />
  </div>
</template>

<style scoped lang="less"></style>
