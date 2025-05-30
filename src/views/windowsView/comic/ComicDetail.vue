<script setup lang="ts">
import type { ComicChapter, ComicItem } from '@/extensions/comic';
import type { ComicSource } from '@/types';
import type { PropType } from 'vue';
import ComicShelfButton from '@/components/ComicShelfButton.vue';
import ResponsiveGrid2 from '@/components/ResponsiveGrid2.vue';
import { useDisplayStore } from '@/store';
import ComicShelf from '@/views/comic/ComicShelf.vue';
import _ from 'lodash';
import tinycolor from 'tinycolor2';

const emit = defineEmits<{
  (e: 'back'): void;
  (e: 'loadData'): void;
  (e: 'toChapter', chapter: ComicChapter): void;
}>();
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

const displayStore = useDisplayStore();
</script>

<template>
  <div class="w-full h-full flex flex-col overflow-hidden">
    <div class="relative grow w-full h-full overflow-hidden">
      <van-nav-bar left-arrow @click-left="() => emit('back')" />
      <div
        v-if="comic"
        v-remember-scroll
        ref="content"
        class="flex flex-col items-center px-4 pb-12 grow gap-2 w-full h-full overflow-y-auto"
      >
        <van-row justify="center" align="center" class="p-2 shadow-md w-[80%]">
          <van-image
            v-if="comic.cover"
            width="80px"
            height="100px"
            radius="4"
            :src="comic.cover"
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
          v-if="comic.chapters"
          class="w-full p-2 mt-4 text-[--van-text-color] lg:w-[80%]"
        >
          <div class="w-full flex justify-between gap-2 items-center">
            <p class="font-bold ml-6">共有{{ comic.chapters.length }} 章</p>
            <div class="flex gap-2 items-center">
              <ComicShelfButton :comic="comic" />
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
            <p
              v-for="chapter in isAscending
                ? comic.chapters
                : [...comic.chapters].reverse()"
              :key="chapter.id"
              class="text-sm p-2 h-9 hover:bg-[--van-background] hover:shadow-md rounded-lg cursor-pointer select-none truncate van-haptics-feedback"
              @click="() => emit('toChapter', chapter)"
            >
              {{ chapter.title }}
            </p>
          </ResponsiveGrid2>
        </div>
      </div>
      <ComicShelf />
    </div>
  </div>
</template>

<style scoped lang="less"></style>
