<script setup lang="ts">
import _ from 'lodash';
import { ComicItem } from '@/extensions/comic';
import { Icon } from '@iconify/vue';
const { comicItem } = defineProps<{
  comicItem: ComicItem;
}>();
const emit = defineEmits<{
  (e: 'click', item: ComicItem): void;
}>();
</script>

<template>
  <div
    class="border flex gap-2 m-2 p-2 min-w-[max(10%,260px)] max-w-[280px] bg-[--van-background] rounded-lg shadow transform transition-all duration-100 hover:-translate-y-1 hover:shadow-md cursor-pointer select-none active:bg-[--van-background-2]"
    @click="() => emit('click', comicItem)"
  >
    <div class="w-[80px] h-[100px]">
      <van-image width="80px" height="100px" radius="4" :src="comicItem.cover">
        <template #loading>
          <Icon icon="codicon:comic" width="48" height="48" />
        </template>
        <template #error>
          <Icon icon="codicon:comic" width="48" height="48" />
        </template>
      </van-image>
    </div>

    <div
      class="flex flex-col gap-1 justify-start text-sm text-[--van-text-color]"
    >
      <p class="text-base font-bold h-6 line-clamp-1">
        {{ comicItem.title }}
      </p>
      <p class="text-xs line-clamp-1 flex gap-2">
        <span v-if="comicItem.author">{{ comicItem.author }}</span>
        <span v-if="_.castArray(comicItem.tags).length">
          {{ _.castArray(comicItem.tags)?.join(',') }}
        </span>
        <span v-if="comicItem.status">{{ comicItem.status }}</span>
      </p>
      <p class="text-xs line-clamp-3">
        {{ comicItem.intro }}
      </p>
      <!-- <p>
        <span class="text-sm">{{ comicItem.latestChapter }}</span>
      </p> -->
    </div>
  </div>
</template>

<style scoped lang="less"></style>
