<script setup lang="ts">
import type { BookItem } from '@/extensions/book';
import LoadImage from '@/components/LoadImage.vue';
import { Icon } from '@iconify/vue';
import _ from 'lodash';

const { bookItem } = defineProps<{
  bookItem: BookItem;
}>();
const emit = defineEmits<{
  (e: 'click', item: BookItem): void;
}>();
</script>

<template>
  <div
    class="flex gap-2 p-2 rounded-lg transform transition-all duration-100 cursor-pointer select-none active:bg-[--van-background]"
    @click="() => emit('click', bookItem)"
  >
    <div class="w-[80px] h-[100px] text-center">
      <LoadImage
        :width="80"
        :height="100"
        radius="4"
        lazy-load
        :src="bookItem.cover"
        :headers="bookItem.coverHeaders"
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
      class="grow flex flex-col justify-around text-sm text-[--van-text-color]"
    >
      <p
        class="text-base font-bold w-full"
        :class="bookItem.intro ? 'line-clamp-1' : ''"
      >
        {{ bookItem.title }}
      </p>
      <p class="text-xs truncate">
        {{ bookItem.author ? `${bookItem.author} ` : '佚名' }}
        {{
          _.castArray(bookItem.tags).length
            ? `${_.castArray(bookItem.tags)?.join(',')} `
            : ''
        }}
        {{ bookItem.status || '' }}
      </p>
      <p class="text-xs line-clamp-3">
        {{ bookItem.intro || '暂无简介' }}
      </p>
    </div>
  </div>
</template>

<style scoped lang="less"></style>
