<script setup lang="ts">
import type { BookItem } from '@wuji-tauri/source-extension';
import MBookCard from './MBookCard.vue';

defineProps<{
  book: BookItem;
  click: (item: BookItem) => void;
}>();
</script>

<template>
  <MBookCard v-bind="$attrs" :book="book" :click="click"></MBookCard>
</template>

<!-- <script setup lang="ts">
import type { BookItem } from '@wuji-tauri/source-extension';
import LoadImage from '../../LoadImage.vue';
import { Icon } from '@iconify/vue';
import _ from 'lodash';

defineProps<{
  book: BookItem;
  click: (item: BookItem) => void;
}>();
</script>

<template>
  <div
    class="active-bg-scale flex min-w-[280px] max-w-[280px] gap-2 rounded-lg p-2"
    @click="() => click(book)"
  >
    <div class="h-[100px] w-[80px]">
      <LoadImage
        width="80px"
        height="100px"
        radius="4"
        :src="book.cover"
        :headers="book.coverHeaders"
      >
        <template #loading>
          <Icon icon="codicon:book" width="48" height="48" />
        </template>
        <template #error>
          <Icon icon="codicon:book" width="48" height="48" />
        </template>
      </LoadImage>
    </div>

    <div
      class="flex max-w-[165px] grow flex-col justify-around text-sm text-[--van-text-color]"
    >
      <p
        class="w-full text-base font-bold"
        :class="book.intro ? 'line-clamp-1' : ''"
      >
        {{ book.title }}
      </p>
      <p class="truncate text-xs">
        {{ book.author ? `${book.author} ` : '佚名' }}
        {{
          _.castArray(book.tags).length
            ? `${_.castArray(book.tags)?.join(',')} `
            : ''
        }}
        {{ book.status || '' }}
      </p>
      <p class="line-clamp-3 text-xs">
        {{ book.intro || '暂无简介' }}
      </p>
    </div>
  </div>
</template>

<style scoped lang="less"></style> -->
