<script setup lang="ts">
import type {
  ComicItemInShelf,
  ComicShelf,
  ComicSource,
} from '@wuji-tauri/source-extension';
import { WComicShelfCard } from '@wuji-tauri/components/src';
import _ from 'lodash';
import ResponsiveGrid2 from '@/components/grid/ResponsiveGrid2.vue';
import WNavbar from '@/components/header/WNavbar.vue';
import { showPromptDialog } from '@/utils/usePromptDialog';

withDefaults(
  defineProps<{
    comicShelfs: ComicShelf[];
    isChapterRefreshing?: boolean;
    refreshChapters: () => void;
    unreadCount: (comic: ComicItemInShelf) => number | undefined;
    getSource: (comic: ComicItemInShelf) => ComicSource | undefined;
    toComic: (comic: ComicItemInShelf, chapterId?: string) => void;
    createShelf: (name: string) => void;
    removeShelf: () => void;
    removeComicFromShelf: (comic: ComicItemInShelf, shelfId: string) => void;
  }>(),
  { isChapterRefreshing: false },
);

const activeIndex = defineModel<number>('activeIndex', {
  required: true,
});
</script>

<template>
  <div class="flex h-full w-full flex-col overflow-hidden">
    <WNavbar title="书架" />
    <div class="flex w-full flex-shrink-0 gap-2 px-4 pt-2">
      <van-button
        icon="replay"
        size="small"
        type="primary"
        round
        :loading="isChapterRefreshing"
        @click="() => refreshChapters()"
      >
        刷新章节
      </van-button>
      <van-button
        icon="plus"
        size="small"
        round
        @click="
          () => {
            showPromptDialog({
              title: '创建书架',
              message: '请输入书架名称',
              placeholder: '请输入书架名称',
              defaultValue: '',
              confirmText: '创建',
              cancelText: '取消',
            }).then((name) => {
              if (name) {
                createShelf(name);
              }
            });
          }
        "
      />
      <van-button
        icon="delete-o"
        size="small"
        round
        @click="() => removeShelf()"
      />
    </div>

    <van-tabs
      shrink
      animated
      sticky
      v-model:active="activeIndex"
      class="h-full w-full flex-1 overflow-y-scroll"
    >
      <van-tab v-for="shelf in comicShelfs" :key="shelf.id" :title="shelf.name">
        <transition name="list" tag="ul">
          <ResponsiveGrid2>
            <template
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
              <WComicShelfCard
                :comic="item"
                :shelf="shelf"
                :source="getSource(item)"
                :unread="unreadCount(item)"
                :click="(comic, chapterId) => toComic(comic, chapterId)"
                :remove-from-shelf="
                  (comic) => removeComicFromShelf(comic, shelf.id)
                "
              />
            </template>
          </ResponsiveGrid2>
        </transition>
      </van-tab>
    </van-tabs>
  </div>
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
