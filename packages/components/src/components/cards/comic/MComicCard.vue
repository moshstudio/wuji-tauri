<script setup lang="ts">
import type { ComicItem } from '@wuji-tauri/source-extension';
import { Icon } from '@iconify/vue';
import _ from 'lodash';
import LoadImage from '../../LoadImage.vue';

defineProps<{
  comic: ComicItem;
  click: (item: ComicItem) => void;
}>();
</script>

<template>
  <div
    class="active-bg-scale flex gap-2 rounded-lg p-2"
    @click="() => click(comic)"
  >
    <div class="h-[100px] w-[80px]">
      <LoadImage width="80px" height="100px" radius="4" :src="comic.cover">
        <template #loading>
          <Icon icon="codicon:comic" width="48" height="48" />
        </template>
        <template #error>
          <Icon icon="codicon:comic" width="48" height="48" />
        </template>
      </LoadImage>
    </div>

    <div
      class="flex min-w-0 grow flex-col justify-around text-sm text-[--van-text-color]"
    >
      <p
        class="w-full text-base font-bold"
        :class="comic.intro ? 'line-clamp-1' : ''"
      >
        {{ comic.title }}
      </p>
      <p class="truncate text-xs">
        {{ comic.author ? `${comic.author} ` : '佚名' }}
        {{
          _.castArray(comic.tags).length
            ? `${_.castArray(comic.tags)?.join(',')} `
            : ''
        }}
        {{ comic.status || '' }}
      </p>
      <p class="line-clamp-3 text-xs">
        {{ comic.intro || '暂无简介' }}
      </p>
    </div>
  </div>
</template>

<style scoped lang="less"></style>
