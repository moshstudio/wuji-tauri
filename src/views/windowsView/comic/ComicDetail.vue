<script setup lang="ts">
import { ComicChapter, ComicItem } from '@/extensions/comic';
import { ComicSource } from '@/types';
import tinycolor from 'tinycolor2';
import _ from 'lodash';
import { PropType } from 'vue';
import ResponsiveGrid from '@/components/ResponsiveGrid.vue';
import ComicShelfButton from '@/components/ComicShelfButton.vue';
import ComicShelf from '@/views/comic/ComicShelf.vue';
import { useDisplayStore } from '@/store';

const comic = defineModel('comic', {
  type: Object as PropType<ComicItem>,
});
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

const emit = defineEmits<{
  (e: 'back'): void;
  (e: 'loadData'): void;
  (e: 'toChapter', chapter: ComicChapter): void;
}>();

const displayStore = useDisplayStore();
</script>

<template>
  <div class="relative h-full flex flex-col">
    <van-nav-bar left-arrow @click-left="() => emit('back')" />
    <main
      ref="content"
      class="grow flex flex-col items-center overflow-y-auto p-4 bg-[--van-background-3] select-none"
      v-if="comic"
    >
      <van-row justify="center" align="center" class="p-2 shadow-md w-[80%]">
        <van-image
          width="80px"
          height="100px"
          radius="4"
          :src="comic.cover"
          class="mr-4"
          v-if="comic.cover"
        >
          <template #loading>
            <div
              class="text-center self-center content-center text-lg p-1 w-[80px] h-[100px]"
              :style="{ color: tinycolor.random().toRgbString() }"
            >
              {{ comic.title }}
            </div>
          </template>
        </van-image>
        <div
          class="flex flex-col gap-1 justify-start text-sm text-[--van-text-color] w-[80%]"
        >
          <p class="text-base font-bold">
            {{ comic.title }}
          </p>
          <p class="text-xs flex gap-2">
            <span>{{ comic.author }}</span>
            <span>{{ _.castArray(comic.tags)?.join(',') }}</span>
            <span>{{ comic.status }}</span>
          </p>
          <van-text-ellipsis
            :content="comic.intro"
            class="text-xs text-[--van-text-color]"
            rows="3"
            expand-text="展开"
            collapse-text="收起"
          />
          <p>
            <span class="text-sm">{{ comic.latestChapter }}</span>
          </p>
        </div>
      </van-row>
      <div
        class="p-2 mt-4 shadow-md text-[--van-text-color] w-[80%]"
        v-if="comic.chapters"
      >
        <div class="w-full flex justify-between gap-2 items-center">
          <p class="font-bold ml-6">共有{{ comic.chapters.length }} 章</p>
          <div class="flex gap-2 items-center">
            <ComicShelfButton :comic="comic"></ComicShelfButton>
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
        <ResponsiveGrid>
          <li
            v-for="chapter in isAscending
              ? comic.chapters
              : [...comic.chapters].reverse()"
            :key="chapter.id"
            @click="() => emit('toChapter', chapter)"
            class="text-sm p-2 h-9 hover:bg-[--van-background] hover:shadow-md rounded-lg cursor-pointer select-none truncate van-haptics-feedback"
          >
            {{ chapter.title }}
          </li>
        </ResponsiveGrid>
      </div>
    </main>
    <ComicShelf></ComicShelf>
  </div>
</template>

<style scoped lang="less"></style>
