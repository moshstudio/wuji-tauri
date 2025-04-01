<script setup lang="ts">
import _ from 'lodash';
import { ComicItem } from '@/extensions/comic';
import LoadImage from '@/components/LoadImage.vue';
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
    class="flex gap-2 p-2 rounded-lg transform transition-all duration-100 cursor-pointer select-none active:bg-[--van-background]"
    @click="() => emit('click', comicItem)"
  >
    <div class="w-[80px] h-[100px]">
      <LoadImage width="80px" height="100px" radius="4" :src="comicItem.cover">
        <template #loading>
          <Icon icon="codicon:comic" width="48" height="48" />
        </template>
        <template #error>
          <Icon icon="codicon:comic" width="48" height="48" />
        </template>
      </LoadImage>
    </div>

    <div
      class="grow flex flex-col gap-1 justify-start text-sm text-[--van-text-color]"
    >
      <p
        class="text-base font-bold w-full"
        :class="comicItem.intro ? 'line-clamp-1' : ''"
      >
        {{ comicItem.title }}
      </p>
      <p class="text-xs flex gap-2 truncate">
        <span v-if="comicItem.author" class="truncate">
          {{ comicItem.author }}
        </span>
        <span v-if="_.castArray(comicItem.tags).length" class="truncate">
          {{ _.castArray(comicItem.tags)?.join(',') }}
        </span>
        <span v-if="comicItem.status" class="truncate">
          {{ comicItem.status }}
        </span>
      </p>
      <p class="text-xs line-clamp-3">
        {{ comicItem.intro }}
      </p>
    </div>
  </div>
</template>

<style scoped lang="less"></style>
