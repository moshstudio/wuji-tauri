<script setup lang="ts">
import type { BookItem } from '@wuji-tauri/source-extension';
import { Icon } from '@iconify/vue';
import { castArray } from 'lodash';
import { computed } from 'vue';
import LoadImage from '../../LoadImage.vue';

const props = defineProps<{
  book: BookItem;
  click: (item: BookItem) => void;
}>();

const tagsText = computed(() => {
  const tags = castArray(props.book.tags);
  return tags.length ? `${tags.join(',')} ` : '';
});
</script>

<template>
  <div
    class="active-bg-scale flex gap-2 rounded-lg p-2"
    @click="() => click(book)"
  >
    <div class="h-[100px] w-[80px] text-center">
      <LoadImage
        :width="80"
        :height="100"
        radius="4"
        :src="book.cover"
        :headers="book.coverHeaders"
        lazy-load
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
      class="flex min-w-0 grow flex-col justify-around text-sm text-[--van-text-color]"
    >
      <p
        class="w-full text-base font-bold"
        :class="book.intro ? 'line-clamp-1' : ''"
      >
        {{ book.title }}
      </p>
      <p class="truncate text-xs">
        {{ book.author ? `${book.author} ` : '佚名' }}
        {{ tagsText }}
        {{ book.status || '' }}
      </p>
      <p class="line-clamp-3 text-xs">
        {{ book.intro || '暂无简介' }}
      </p>
    </div>
  </div>
</template>

<style scoped lang="less"></style>
