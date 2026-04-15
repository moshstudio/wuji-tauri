<script setup lang="ts">
import type { ComicChapter, ComicItem } from '@wuji-tauri/source-extension';
import type { ComicSource } from '@/types';
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
    comic?: ComicItem;
    comicSource?: ComicSource;
    inShelf: boolean;
    toChapter?: (comic: ComicItem, chapter: ComicChapter) => void;
    addToShelf?: (comic: ComicItem) => void;
    onDownload?: () => void;
  }>(),
  {},
);

const getRandomColor = () => tinycolor.random().toRgbString();
function joinTags(tags: string | string[] | undefined) {
  return _.castArray(tags)?.join(',');
}
</script>

<template>
  <div class="relative flex h-full w-full flex-col">
    <MNavBar title="漫画详情" />
    <main
      v-remember-scroll
      class="flex w-full grow select-none flex-col items-center overflow-y-auto bg-[--van-background-2] p-2"
    >
      <div
        v-if="comic"
        class="flex w-full flex-col gap-1 rounded p-2 shadow-md"
      >
        <div class="flex flex-nowrap items-center justify-center gap-2">
          <div v-if="comic.cover" class="h-[100px] w-[80px]">
            <LoadImage
              width="80px"
              height="100px"
              radius="4"
              :src="comic.cover"
              :headers="comic.coverHeaders"
              class="mr-4"
            >
              <template #loading>
                <div
                  class="h-[100px] w-[80px] content-center self-center p-1 text-center text-lg"
                  :style="{ color: getRandomColor() }"
                >
                  {{ comic.title }}
                </div>
              </template>
            </LoadImage>
          </div>

          <div
            class="flex flex-col justify-start gap-1 text-sm text-[--van-text-color]"
          >
            <div class="font-bold">
              {{ comic.title }}
            </div>
            <p class="flex gap-2 text-xs">
              <span>{{ comic.author }}</span>
              <span>{{ joinTags(comic.tags) }}</span>
              <span>{{ comic.status }}</span>
            </p>

            <p>
              <span class="text-xs">{{ comic.latestChapter }}</span>
            </p>
          </div>
        </div>
        <van-text-ellipsis
          :content="comic.intro"
          class="self-center text-xs text-gray-400"
          rows="3"
          expand-text="展开"
          collapse-text="收起"
        />
      </div>

      <div v-if="comic?.chapters" class="mt-4 w-full text-[--van-text-color]">
        <div class="flex w-full items-center justify-between">
          <p class="ml-6 font-bold">
            共有{{ comic.chapters.length }} 章
          </p>
          <div class="flex items-center gap-2">
            <van-button
              size="small"
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
                  if (comic) {
                    addToShelf?.(comic);
                  }
                }
              "
              :added-click="
                () => {
                  router.push({ name: 'ComicShelf' });
                }
              "
            />
          </div>
        </div>
        <van-tabs shrink animated>
          <van-tab
            v-for="index of Array(
              Math.ceil(comic.chapters.length / 200),
            ).keys()"
            :key="index"
            :title="`${index * 200 + 1}-${Math.min(comic.chapters.length, (index + 1) * 200)}`"
          >
            <ResponsiveGrid2>
              <p
                v-for="chapter in comic.chapters.slice(
                  index * 200,
                  Math.min(comic.chapters.length, (index + 1) * 200 - 1),
                )"
                :key="chapter.id"
                class="van-haptics-feedback cursor-pointer select-none truncate rounded-lg text-sm"
                @click="
                  () => {
                    if (comic) {
                      toChapter?.(comic, chapter);
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
      <div v-if="!comic" class="flex w-full items-center justify-center">
        <van-loading />
      </div>
      <van-back-top bottom="60" right="10">
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
