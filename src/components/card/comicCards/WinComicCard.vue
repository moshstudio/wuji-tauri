<script setup lang="ts">
import type { ComicItem } from '@/extensions/comic';
import LoadImage from '@/components/LoadImage.vue';
import { Icon } from '@iconify/vue';
import _ from 'lodash';

const { comicItem } = defineProps<{
  comicItem: ComicItem;
}>();
const emit = defineEmits<{
  (e: 'click', item: ComicItem): void;
}>();
</script>

<template>
  <div
    class="flex gap-2 p-2 min-w-[280px] max-w-[280px] rounded-lg transform transition-all duration-100 cursor-pointer select-none active:bg-[--van-background]"
    @click="() => emit('click', comicItem)"
  >
    <div class="w-[80px] h-[100px]">
      <LoadImage
        width="80px"
        height="100px"
        radius="4"
        :src="comicItem.cover"
        :headers="comicItem.coverHeaders"
      >
        <template #loading>
          <Icon icon="codicon:comic" width="48" height="48" />
        </template>
        <template #error>
          <Icon icon="codicon:comic" width="48" height="48" />
        </template>
      </LoadImage>
    </div>

    <div
      class="flex-grow flex flex-col justify-around text-sm text-[--van-text-color] overflow-hidden"
    >
      <p
        class="text-base font-bold w-full"
        :class="comicItem.intro ? 'line-clamp-1' : ''"
      >
        {{ comicItem.title }}
      </p>
      <p class="text-xs truncate">
        {{ comicItem.author ? `${comicItem.author} ` : '佚名' }}
        {{
          _.castArray(comicItem.tags).length
            ? `${_.castArray(comicItem.tags)?.join(',')} `
            : ''
        }}
        {{ comicItem.status || '' }}
      </p>
      <p class="text-xs line-clamp-3">
        {{ comicItem.intro || '暂无简介' }}
      </p>
    </div>
  </div>
</template>

<style scoped lang="less"></style>
