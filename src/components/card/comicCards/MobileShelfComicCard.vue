<script setup lang="ts">
import _ from 'lodash';
import { ComicItem, ComicItemInShelf } from '@/extensions/comic';
import { Icon } from '@iconify/vue';
import { ref } from 'vue';
import MoreOptionsSheet from '@/components/actionSheets/MoreOptions.vue';
import { useStore } from '@/store';

const { shelfComic, unread } = defineProps<{
  shelfComic: ComicItemInShelf;
  unread?: number;
}>();
const emit = defineEmits<{
  (e: 'click', item: ComicItemInShelf, chapterId?: string): void;
  (e: 'remove', item: ComicItemInShelf): void;
}>();

const store = useStore();
const showMoreOptions = ref(false);
</script>

<template>
  <div
    class="flex gap-2 p-2 rounded-lg transform transition-all duration-100 cursor-pointer select-none active:bg-[--van-background]"
    @click="() => emit('click', shelfComic, shelfComic.lastReadChapter?.id)"
  >
    <div class="w-[80px] h-[100px]">
      <van-image
        width="80px"
        height="100px"
        radius="4"
        :src="shelfComic.comic.cover"
      >
        <template #loading>
          <Icon icon="codicon:comic" width="48" height="48" />
        </template>
        <template #error>
          <Icon icon="codicon:comic" width="48" height="48" />
        </template>
      </van-image>
    </div>

    <div
      class="grow flex flex-col justify-around text-sm text-[--van-text-color]"
    >
      <div class="flex gap-2 items-center">
        <p class="text-base font-bold h-6 line-clamp-2">
          {{ shelfComic.comic.title }}
        </p>
        <p class="text-xs text-gray-400 truncate">
          {{ store.getComicSource(shelfComic.comic.sourceId)?.item.name }}
        </p>
      </div>

      <p class="text-xs truncate flex gap-2">
        <span v-if="shelfComic.comic.author">{{
          shelfComic.comic.author
        }}</span>
        <span v-if="unread"> {{ unread }}章未读 </span>
      </p>
      <p class="text-xs line-clamp-1">
        {{ shelfComic.lastReadChapter?.title }}
      </p>
      <p>
        <span class="text-xs line-clamp-1">
          {{ _.last(shelfComic.comic.chapters)?.title }}
        </span>
      </p>
    </div>
    <div class="flex flex-col justify-start mt-2 van-haptics-feedback">
      <van-icon
        name="ellipsis"
        class="clickable text-[--van-text-color]"
        size="16"
        @click.stop="() => (showMoreOptions = true)"
      />
    </div>
  </div>
  <MoreOptionsSheet
    v-model="showMoreOptions"
    :actions="[
      {
        name: '从当前收藏夹移除',
        color: '#1989fa',
        callback: () => {
          showMoreOptions = false;
          emit('remove', shelfComic);
        },
      },
    ]"
  ></MoreOptionsSheet>
</template>

<style scoped lang="less"></style>
