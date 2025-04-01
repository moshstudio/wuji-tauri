<script setup lang="ts">
import _ from 'lodash';
import { BookItem } from '@/extensions/book';
import { Icon } from '@iconify/vue';
import LoadImage from '@/components/LoadImage.vue';

const { bookItem } = defineProps<{
  bookItem: BookItem;
}>();
const emit = defineEmits<{
  (e: 'click', item: BookItem): void;
}>();
</script>

<template>
  <div
    class="flex gap-2 p-2 min-w-[280px] max-w-[280px] rounded-lg transform transition-all duration-100 cursor-pointer select-none active:bg-[--van-background]"
    @click="() => emit('click', bookItem)"
  >
    <div class="w-[80px] h-[100px]">
      <LoadImage
        width="80px"
        height="100px"
        radius="4"
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
      class="grow flex flex-col gap-1 justify-start text-sm text-[--van-text-color] max-w-[165px]"
    >
      <p
        class="text-base font-bold w-full"
        :class="bookItem.intro ? 'line-clamp-1' : ''"
      >
        {{ bookItem.title }}
      </p>
      <p class="text-xs truncate">
        {{ bookItem.author ? bookItem.author + ' ' : '' }}
        {{
          _.castArray(bookItem.tags).length
            ? _.castArray(bookItem.tags)?.join(',') + ' '
            : ''
        }}
        {{ bookItem.status || '' }}
      </p>
      <p class="text-xs line-clamp-3">
        {{ bookItem.intro }}
      </p>
    </div>
  </div>
</template>

<style scoped lang="less"></style>
