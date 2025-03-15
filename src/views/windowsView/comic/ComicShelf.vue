<script setup lang="ts">
import { ComicChapter, ComicItemInShelf } from '@/extensions/comic';
import { useComicShelfStore, useDisplayStore, useStore } from '@/store';
import _ from 'lodash';
import { storeToRefs } from 'pinia';
import { Icon } from '@iconify/vue';
import { computed, PropType } from 'vue';
import AddComicShelfDialog from '@/components/windows/dialogs/AddComicShelf.vue';
import DeleteComicShelfDialog from '@/components/windows/dialogs/RemoveComicShelf.vue';

const shelfAnchors = defineModel('shelfAnchors', {
  type: Array as PropType<number[]>,
  required: true,
});
const shelfHeight = defineModel('shelfHeight', {
  type: Number,
  required: true,
});

const displayStore = useDisplayStore();
const shelfStore = useComicShelfStore();
const { comicShelf, comicChapterRefreshing } = storeToRefs(shelfStore);

const emit = defineEmits<{
  (e: 'refreshChapters'): void;
  (e: 'toComic', comic: ComicItemInShelf, chapterId?: string): void;
  (e: 'removeComicFromShelf', comic: ComicItemInShelf, shelfId: string): void;
  (e: 'hidePanel'): void;
}>();

const lastChapter = (comic: ComicItemInShelf) => {
  if (!comic.comic.chapters?.length) return null;
  return comic.comic.chapters[comic.comic.chapters.length - 1];
};
// 计算还有多少章没读
const unreadCount = (comic: ComicItemInShelf): number | undefined => {
  if (!comic.lastReadChapter || !comic.comic.chapters?.length) return undefined;
  const index = comic.comic.chapters.findIndex(
    (chapter) => chapter.id === comic.lastReadChapter!.id
  );
  const num = comic.comic.chapters.length - index - 1;
  if (num <= 0) return undefined;
  return num;
};
const sourceName = (comic: ComicItemInShelf) => {
  const store = useStore();
  const source = store.getComicSource(comic.comic.sourceId);
  return source?.item.name;
};
</script>

<template>
  <van-floating-panel
    v-model:height="shelfHeight"
    :anchors="shelfAnchors"
    :content-draggable="false"
    @height-change="
      (height) => {
        if (height.height === 0) {
          displayStore.showComicShelf = false;
        }
      }
    "
    class="left-[50px] right-[0px] w-auto rounded-none up-shadow"
    :style="displayStore.showComicShelf ? { height: `${shelfHeight}px` } : {}"
  >
    <template #header>
      <div class="flex justify-between items-center p-4 border-b">
        <h2 class="text-lg font-semibold">
          <slot name="title">
            <p class="text-[--van-text-color]">书架</p>
          </slot>
        </h2>
        <div class="text-button" @click="() => emit('hidePanel')">关闭书架</div>
      </div>
    </template>
    <div class="flex gap-2 m-2 p-1 shrink">
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
      >
      </van-button>
      <van-button
        icon="delete-o"
        size="small"
        round
        @click="() => (displayStore.showRemoveComicShelfDialog = true)"
      >
      </van-button>
    </div>

    <van-tabs shrink>
      <van-tab :title="shelf.name" v-for="shelf in comicShelf" :key="shelf.id">
        <van-list class="p-2">
          <van-card
            :desc="item.comic.intro"
            centered
            lazy-load
            v-for="item in _.orderBy(
              shelf.comics,
              [(comic) => comic.lastReadTime || 0, (comic) => comic.createTime],
              ['desc', 'desc']
            )"
            :key="item.comic.id"
          >
            <template #thumb>
              <van-image
                width="80px"
                height="100px"
                radius="4"
                :src="item.comic.cover"
              >
                <template #loading>
                  <Icon icon="codicon:comic" width="48" height="48" />
                </template>
                <template #error>
                  <Icon icon="codicon:comic" width="48" height="48" />
                </template>
              </van-image>
            </template>
            <template #title>
              <van-row align="center" class="gap-4">
                <h1
                  class="text-button-2 text-base font-bold"
                  @click="() => emit('toComic', item)"
                >
                  {{ item.comic.title }}
                </h1>
                <span class="text-gray-400">{{ sourceName(item) }}</span>
              </van-row>
            </template>
            <template #tags>
              <p
                class="text-button-2 text-[var(--van-card-desc-color)] font-normal pt-1"
                @click="() => emit('toComic', item, lastChapter(item)?.id)"
              >
                {{
                  item.comic.chapters?.length
                    ? '最新章节:' + lastChapter(item)?.title
                    : ''
                }}
              </p>
            </template>
            <template #price>
              <van-badge
                :content="unreadCount(item)"
                color="#1989fa"
                :offset="[18, 13.8]"
              >
                <p
                  class="text-button-2 text-[var(--van-card-desc-color)] pt-1"
                  @click="() => emit('toComic', item, item.lastReadChapter?.id)"
                >
                  {{
                    item.lastReadChapter
                      ? '最近阅读:' + item.lastReadChapter.title
                      : undefined
                  }}
                </p>
              </van-badge>
            </template>
            <template #footer>
              <van-button
                size="mini"
                @click="() => emit('removeComicFromShelf', item, shelf.id)"
              >
                移除
              </van-button>
            </template>
          </van-card>
        </van-list>
      </van-tab>
    </van-tabs>
  </van-floating-panel>
  <AddComicShelfDialog></AddComicShelfDialog>
  <DeleteComicShelfDialog></DeleteComicShelfDialog>
</template>

<style scoped lang="less">
:deep(.van-card__thumb) {
  width: 80px;
  height: 100px;
}
</style>
