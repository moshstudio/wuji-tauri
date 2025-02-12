<script setup lang="ts">
import _ from 'lodash';
import { BookItem } from '@/extensions/book';
import { Icon } from '@iconify/vue';
const { bookItem } = defineProps<{
  bookItem: BookItem;
}>();
const emit = defineEmits<{
  (e: 'click', item: BookItem): void;
}>();
</script>

<template>
  <div
    class="flex gap-2 m-2 p-2 bg-[--van-background] rounded-lg shadow transform transition-all duration-100 hover:-translate-y-1 hover:shadow-md cursor-pointer select-none active:bg-[--van-background-2]"
    @click="() => emit('click', bookItem)"
  >
    <van-image
      width="80px"
      height="100px"
      :src="bookItem.cover"
      v-if="bookItem.cover"
    >
      <template #loading>
        <Icon icon="codicon:book" width="48" height="48" />
      </template>
      <template #error>
        <Icon icon="codicon:book" width="48" height="48" />
      </template>
    </van-image>
    <div
      class="flex flex-col gap-1 justify-start text-sm text-[--van-text-color] min-w-[180px] max-w-[200px]"
    >
      <p
        class="text-base font-bold h-6 line-clamp-1"
      >
        {{ bookItem.title }}
      </p>
      <p class="text-xs line-clamp-1 flex gap-2">
        <span v-if="bookItem.author">{{ bookItem.author }}</span>
        <span v-if="_.castArray(bookItem.tags).length">
          {{ _.castArray(bookItem.tags)?.join(',') }}
        </span>
        <span v-if="bookItem.status">{{ bookItem.status }}</span>
      </p>
      <p class="text-xs line-clamp-3">
        {{ bookItem.intro }}
      </p>
      <!-- <p>
        <span class="text-sm">{{ bookItem.latestChapter }}</span>
      </p> -->
    </div>
  </div>
</template>

<style scoped lang="less"></style>
