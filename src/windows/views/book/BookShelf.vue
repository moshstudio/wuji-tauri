<script setup lang="ts">
import { BookItemInShelf } from "@/extensions/book";
import { router } from "@/router";
import { useStore, useBookShelfStore, useDisplayStore } from "@/store";
import _ from "lodash";
import { storeToRefs } from "pinia";
import { showLoadingToast, showToast } from "vant";
import { Icon } from "@iconify/vue";
import { onMounted, onUnmounted, ref, watch } from "vue";
import AddBookShelfDialog from "@/windows/components/dialogs/AddBookShelf.vue";
import DeleteBookShelfDialog from "@/windows/components/dialogs/RemoveBookShelf.vue";

const show = defineModel("show", { type: Boolean, default: false });

const store = useStore();
const displayStore = useDisplayStore();
const shelfStore = useBookShelfStore();
const { bookShelf, bookChapterRefreshing } = storeToRefs(shelfStore);

const refreshChapters = async () => {
  await shelfStore.bookRefreshChapters();
};

const toBook = async (book: BookItemInShelf, chapterId?: string) => {
  const source = store.getBookSource(book.book.sourceId);
  if (!source) {
    showToast("源不存在或未启用");
    return;
  }
  if (!book.book.chapters?.length) {
    // 章节为空，获取章节
    const t = showLoadingToast({
      message: "正在获取章节",
      duration: 0,
      closeOnClick: true,
      closeOnClickOverlay: false,
    });
    const detail = await store.bookDetail(source, book.book);
    t.close();
    if (!detail?.chapters?.length) {
      showToast("章节列表为空");
      return;
    }
    book.book = detail;
  }

  chapterId ||= book.book.chapters![0].id;
  show.value = false;
  router.push({
    name: "BookRead",
    params: {
      bookId: book.book.id,
      sourceId: book.book.sourceId,
      chapterId: chapterId,
    },
  });
};
const removeBookFromShelf = (book: BookItemInShelf, shelfId: string) => {
  shelfStore.removeBookFromShelf(book.book, shelfId);
};

const lastChapter = (book: BookItemInShelf) => {
  if (!book.book.chapters?.length) return null;
  return book.book.chapters[book.book.chapters.length - 1];
};
// 计算还有多少章没读
const unreadCount = (book: BookItemInShelf): number | undefined => {
  if (!book.lastReadChapter || !book.book.chapters?.length) return undefined;
  const index = book.book.chapters.findIndex(
    (chapter) => chapter.id === book.lastReadChapter!.id
  );
  const num = book.book.chapters.length - index;
  if (num <= 0) return undefined;
  return num;
};

// 书架展示相关
const shelfAnchors = [0, Math.round(window.innerHeight)];
const shelfHeight = ref(0);
const hidePanel = () => {
  shelfHeight.value = shelfAnchors[0];
  show.value = false;
};
watch(
  show,
  (newValue) => {
    if (newValue) {
      shelfHeight.value = shelfAnchors[1];
    } else {
      shelfHeight.value = shelfAnchors[0];
    }
  },
  { immediate: true }
);
const updateAnchors = () => {
  shelfAnchors[1] = Math.round(window.innerHeight);
  if (show.value) {
    shelfHeight.value = shelfAnchors[1];
  }
};
onMounted(() => {
  window.addEventListener("resize", updateAnchors);
});
onUnmounted(() => {
  window.removeEventListener("resize", updateAnchors);
});
</script>

<template>
  <van-floating-panel
    v-model:height="shelfHeight"
    :anchors="shelfAnchors"
    :content-draggable="false"
    @height-change="
      (height) => {
        if (height.height === 0) {
          show = false;
        }
      }
    "
    class="left-[50px] right-[0px] w-auto rounded-none up-shadow"
    :style="show ? { height: `${shelfHeight}px` } : {}"
  >
    <template #header>
      <div class="flex justify-between items-center p-4 border-b">
        <h2 class="text-lg font-semibold">
          <slot name="title">
            <p class="text-[--van-text-color]">书架</p>
          </slot>
        </h2>
        <div class="text-button" @click="hidePanel">关闭书架</div>
      </div>
    </template>
    <div class="flex gap-2 m-2 p-1 shrink">
      <van-button
        icon="replay"
        size="small"
        type="primary"
        round
        :loading="bookChapterRefreshing"
        @click="refreshChapters"
      >
        刷新章节
      </van-button>
      <van-button
        icon="plus"
        size="small"
        round
        @click="() => (displayStore.showAddBookShelfDialog = true)"
      >
        新增书架</van-button
      >
      <van-button
        icon="delete-o"
        size="small"
        round
        @click="() => (displayStore.showRemoveBookShelfDialog = true)"
      >
        删除书架</van-button
      >
    </div>

    <van-tabs shrink>
      <van-tab :title="shelf.name" v-for="shelf in bookShelf" :key="shelf.id">
        <van-list class="p-2">
          <van-card
            :desc="item.book.intro"
            centered
            lazy-load
            v-for="item in _.orderBy(
              shelf.books,
              ['lastReadTime', 'createTime'],
              ['desc', 'desc']
            )"
            :key="item.book.id"
          >
            <template #thumb v-if="item.book.cover">
              <van-image width="80px" height="100px" :src="item.book.cover">
                <template #loading>
                  <Icon icon="codicon:book" width="48" height="48" />
                </template>
                <template #error>
                  <Icon icon="codicon:book" width="48" height="48" />
                </template>
              </van-image>
            </template>
            <template #title>
              <h1
                class="text-button-2 text-base font-bold"
                @click="() => toBook(item)"
              >
                {{ item.book.title }}
              </h1>
            </template>
            <template #tags>
              <p
                class="text-button-2 text-[var(--van-card-desc-color)] font-normal pt-1"
                @click="() => toBook(item, lastChapter(item)?.id)"
              >
                {{
                  item.book.chapters?.length
                    ? "最新章节:" + lastChapter(item)?.title
                    : undefined
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
                  @click="() => toBook(item, item.lastReadChapter?.id)"
                >
                  {{
                    item.lastReadChapter
                      ? "最近阅读:" + item.lastReadChapter.title
                      : undefined
                  }}
                </p>
              </van-badge>
            </template>
            <template #footer>
              <van-button
                size="mini"
                @click="() => removeBookFromShelf(item, shelf.id)"
              >
                移除
              </van-button>
            </template>
          </van-card>
        </van-list>
      </van-tab>
    </van-tabs>
  </van-floating-panel>
  <AddBookShelfDialog></AddBookShelfDialog>
  <DeleteBookShelfDialog></DeleteBookShelfDialog>
</template>

<style scoped lang="less">
:deep(.van-card__thumb) {
  width: 80px;
  height: 100px;
}
</style>
