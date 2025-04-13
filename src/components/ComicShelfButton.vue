<script setup lang="ts">
import type { ComicChapter, ComicItem } from '@/extensions/comic';
import type { PropType } from 'vue';
import { useComicShelfStore, useDisplayStore } from '@/store';
import { storeToRefs } from 'pinia';
import { ref, watch } from 'vue';

const { comic, readingChapter, mode } = defineProps({
  comic: {
    type: Object as PropType<ComicItem>,
    required: false,
  },
  readingChapter: {
    type: Object as PropType<ComicChapter>,
    required: false,
  },
  mode: {
    type: String as PropType<'square' | 'rectangle'>,
    default: 'rectangle',
  },
});

const displayStore = useDisplayStore();
const shelfStore = useComicShelfStore();
const { comicShelf } = storeToRefs(shelfStore);
const numInShelf = ref(0);
const pickShelfDialog = ref(false);

function calcNumInShelf() {
  if (!comic)
    return;
  // 在几个书架中
  let count = 0;
  for (const shelf of comicShelf.value) {
    for (const b of shelf.comics) {
      if (b.comic.id === comic.id) {
        count++;
      }
    }
  }
  numInShelf.value = count;
}

function addToShelf() {
  if (!comic)
    return;
  if (comicShelf.value.length === 1) {
    shelfStore.addToComicSelf(comic);
    if (readingChapter) {
      shelfStore.updateComicReadInfo(comic, readingChapter);
    }
  }
  else {
    pickShelfDialog.value = true;
  }
}
function selectAddToShelf(item: { name: string; id: string }) {
  if (!comic)
    return;
  shelfStore.addToComicSelf(comic, item.id);
  if (readingChapter) {
    shelfStore.updateComicReadInfo(comic, readingChapter);
  }
  pickShelfDialog.value = false;
}

watch(
  [comicShelf, () => comic],
  () => {
    calcNumInShelf();
  },
  { immediate: true, deep: true },
);
</script>

<template>
  <div v-if="!comic" />
  <div v-else>
    <div v-if="mode === 'rectangle'">
      <van-badge v-if="numInShelf > 0">
        <template #content>
          <p @click="() => (displayStore.showComicShelf = true)">
            {{ numInShelf }}
          </p>
        </template>
        <van-button plain type="primary" size="small" @click="addToShelf">
          <span class="truncate"> 加入书架 </span>
        </van-button>
      </van-badge>
      <van-button v-else plain type="primary" size="small" @click="addToShelf">
        <span class="truncate"> 加入书架 </span>
      </van-button>
    </div>
    <div v-else>
      <van-button
        v-if="numInShelf === 0"
        icon="plus"
        square
        size="small"
        class="w-[46px] h-[46px] opacity-50 hover:opacity-100"
        @click="addToShelf"
      >
        <span>书架</span>
      </van-button>
      <van-button
        v-else
        square
        size="small"
        class="w-[46px] h-[46px] opacity-50 hover:opacity-100"
        @click="() => (displayStore.showComicShelf = true)"
      >
        <span>已加书架</span>
      </van-button>
    </div>
  </div>
  <van-dialog
    v-model:show="pickShelfDialog"
    show-cancel-button
    :show-confirm-button="false"
    title="选择书架"
  >
    <van-cell-group inset>
      <van-cell
        v-for="item in comicShelf"
        :key="item.id"
        :title="item.name"
        center
        clickable
        title-class="text-center"
        value-class="hidden"
        @click="() => selectAddToShelf({ name: item.name, id: item.id })"
      />
    </van-cell-group>
  </van-dialog>
</template>

<style scoped lang="less"></style>
