<script setup lang="ts">
import type { ComicItemInShelf } from '@/extensions/comic';
import MobileShelfComicCard from '@/components/card/comicCards/MobileShelfComicCard.vue';
import LeftPopup from '@/components/mobile/LeftPopup.vue';
import AddComicShelfDialog from '@/components/windows/dialogs/AddComicShelf.vue';
import DeleteComicShelfDialog from '@/components/windows/dialogs/RemoveComicShelf.vue';
import { useComicShelfStore, useDisplayStore, useStore } from '@/store';
import _ from 'lodash';
import { storeToRefs } from 'pinia';

const emit = defineEmits<{
  (e: 'refreshChapters'): void;
  (e: 'toComic', comic: ComicItemInShelf, chapterId?: string): void;
  (e: 'removeComicFromShelf', comic: ComicItemInShelf, shelfId: string): void;
}>();

const activeIndex = defineModel('activeIndex', {
  type: Number,
  required: true,
});

const displayStore = useDisplayStore();
const shelfStore = useComicShelfStore();
const { comicShelf, comicChapterRefreshing } = storeToRefs(shelfStore);
const { showComicShelf } = storeToRefs(displayStore);

// 计算还有多少章没读
function unreadCount(comic: ComicItemInShelf): number | undefined {
  if (!comic.lastReadChapter || !comic.comic.chapters?.length) return undefined;
  const index = comic.comic.chapters.findIndex(
    (chapter) => chapter.id === comic.lastReadChapter!.id,
  );
  const num = comic.comic.chapters.length - index - 1;
  if (num <= 0) return undefined;
  return num;
}
function sourceName(comic: ComicItemInShelf) {
  const store = useStore();
  const source = store.getComicSource(comic.comic.sourceId);
  return source?.item.name;
}
</script>

<template>
  <van-popup
    v-model:show="showComicShelf"
    position="bottom"
    :overlay="false"
    :z-index="1000"
    class="overflow-hidden absolute insert-0 w-full h-full flex flex-col"
  >
    <div
      class="shrink-0 w-full flex justify-between items-center px-4 h-[46px] border-b"
    >
      <div class="flex items-center gap-2">
        <LeftPopup />
        <h2 class="text-lg font-semibold text-[--van-text-color]">书架</h2>
      </div>
      <van-icon
        name="arrow-down"
        size="24"
        @click="showComicShelf = false"
        class="van-haptics-feedback text-[--van-text-color]"
      />
    </div>
    <div class="shrink-0 w-full flex gap-2 px-4 pt-2 h-[44px]">
      <van-button
        icon="replay"
        size="small"
        type="primary"
        round
        :loading="comicChapterRefreshing"
        @click="() => emit('refreshChapters')"
      >
        刷新章节
      </van-button>
      <van-button
        icon="plus"
        size="small"
        round
        @click="() => (displayStore.showAddComicShelfDialog = true)"
      />
      <van-button
        icon="delete-o"
        size="small"
        round
        @click="() => (displayStore.showRemoveComicShelfDialog = true)"
      />
    </div>

    <van-tabs
      shrink
      animated
      sticky
      :offset-top="90"
      :active="activeIndex"
      class="w-full h-full overflow-y-scroll"
    >
      <van-tab v-for="shelf in comicShelf" :key="shelf.id" :title="shelf.name">
        <transition name="list" tag="ul">
          <van-list class="p-2">
            <ul
              v-for="item in _.orderBy(
                shelf.comics,
                [
                  (comic) => comic.lastReadTime || 0,
                  (comic) => comic.createTime,
                ],
                ['desc', 'desc'],
              )"
              :key="item.comic.id"
            >
              <MobileShelfComicCard
                :shelf-comic="item"
                :unread="unreadCount(item)"
                @click="(comic, chapterId) => emit('toComic', comic, chapterId)"
                @remove="
                  (comic) => emit('removeComicFromShelf', comic, shelf.id)
                "
              />
            </ul>
          </van-list>
        </transition>
      </van-tab>
    </van-tabs>
  </van-popup>
  <AddComicShelfDialog />
  <DeleteComicShelfDialog />
</template>

<style scoped lang="less">
:deep(.van-card__thumb) {
  width: 80px;
  height: 100px;
}
.list-move, /* 对移动中的元素应用的过渡 */
.list-enter-active,
.list-leave-active {
  transition: all 0.5s ease;
}

.list-enter-from,
.list-leave-to {
  opacity: 0;
  transform: translateX(30px);
}

/* 确保将离开的元素从布局流中删除
  以便能够正确地计算移动的动画。 */
.list-leave-active {
  position: absolute;
}
</style>
