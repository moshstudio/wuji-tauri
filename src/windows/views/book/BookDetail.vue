<script setup lang="ts">
import { BookChapter, BookItem } from "@/extensions/book";
import { router } from "@/router";
import { useStore, usePhotoShelfStore } from "@/store";
import { BookSource } from "@/types";
import { showLoadingToast, showToast } from "vant";
import tinycolor from "tinycolor2";
import _ from "lodash";
import { ref, triggerRef, watch, onActivated } from "vue";
import ResponsiveGrid from "@/components/ResponsiveGrid.vue";
import BookShelfButton from "@/components/BookShelfButton.vue";
import BookShelf from "./BookShelf.vue";
import { retryOnFalse, sleep } from "@/utils";

const { bookId, sourceId } = defineProps({
  bookId: String,
  sourceId: String,
});

const store = useStore();
const bookSource = ref<BookSource>();
const book = ref<BookItem>();
const content = ref<HTMLElement>();
const shouldLoad = ref(true);
const isAscending = ref(true);
const showBookShelf = ref(false);
function back() {
  shouldLoad.value = true;
  router.push({ name: "Book" });
}

const loadData = retryOnFalse({ onFailed: back })(async () => {
  book.value = undefined;
  if (!bookId || !sourceId) {
    return false;
  }

  const source = store.getBookSource(sourceId!);
  if (!source) {
    showToast("源不存在或未启用");
    return false;
  }
  bookSource.value = source;

  const item = await store.getBookItem(source, bookId);
  if (!item) {
    return false;
  }
  book.value = item;

  const toast = showLoadingToast({
    message: "书籍加载中",
    duration: 0,
    closeOnClick: true,
    closeOnClickOverlay: false,
  });
  const detail = await store.bookDetail(source!, book.value!);
  toast.close();
  if (detail) {
    book.value = detail;
  }
  if (!detail?.chapters) {
    showToast("章节列表为空");
  }
  content.value!.scrollTop = 0;
  triggerRef(book);
  return true;
});

function toChapter(chapter: BookChapter) {
  router.push({
    name: "BookRead",
    params: {
      bookId: bookId,
      sourceId: sourceId,
      chapterId: chapter.id,
    },
  });
}

watch([() => bookId, () => sourceId], () => {
  shouldLoad.value = false; // watch这里优先load
  loadData();
});
onActivated(async () => {
  await sleep(200);
  if (shouldLoad.value) {
    shouldLoad.value = false;
    loadData();
  }
});
</script>

<template>
  <div class="relative h-full flex flex-col">
    <van-nav-bar left-arrow @click-left="back" />
    <main
      ref="content"
      class="grow flex flex-col items-center overflow-y-auto p-4 bg-[--van-background-3] select-none"
      v-if="book"
    >
      <van-row justify="center" align="center" class="p-2 shadow-md w-[80%]">
        <van-image
          width="80px"
          height="100px"
          :src="book.cover"
          class="mr-4"
          v-if="book.cover"
        >
          <template #loading>
            <div
              class="text-center self-center content-center text-lg p-1 w-[80px] h-[100px]"
              :style="{ color: tinycolor.random().toRgbString() }"
            >
              {{ book.title }}
            </div>
          </template>
        </van-image>
        <div
          class="flex flex-col gap-1 justify-start text-sm text-[--van-text-color] min-w-[180px] max-w-[50%]"
        >
          <p class="text-base font-bold">
            {{ book.title }}
          </p>
          <p class="text-xs flex gap-2">
            <span>{{ book.author }}</span>
            <span>{{ _.castArray(book.tags)?.join(",") }}</span>
            <span>{{ book.status }}</span>
          </p>
          <p class="text-xs">
            {{ book.intro }}
          </p>
          <p>
            <span class="text-sm">{{ book.latestChapter }}</span>
          </p>
        </div>
      </van-row>
      <div
        class="p-2 mt-4 shadow-md w-[80%] text-[--van-text-color]"
        v-if="book.chapters"
      >
        <van-row align="center" justify="space-between">
          <p class="font-bold ml-6">共有{{ book.chapters.length }} 章</p>
          <div class="flex gap-2 items-center">
            <BookShelfButton
              :book="book"
              @show-shelf="showBookShelf = true"
            ></BookShelfButton>
            <p class="mr-6">
              <van-button
                :icon="isAscending ? 'ascending' : 'descending'"
                size="small"
                @click="() => (isAscending = !isAscending)"
              >
                {{ isAscending ? "正序" : "倒序" }}
              </van-button>
            </p>
          </div>
        </van-row>
        <ResponsiveGrid>
          <li
            v-for="chapter in isAscending
              ? book.chapters
              : [...book.chapters].reverse()"
            :key="chapter.id"
            @click="() => toChapter(chapter)"
            class="text-sm p-2 h-9 hover:bg-[--van-background] hover:shadow-md rounded-lg cursor-pointer select-none truncate van-haptics-feedback"
          >
            {{ chapter.title }}
          </li>
        </ResponsiveGrid>
      </div>
    </main>
    <BookShelf v-model:show="showBookShelf"></BookShelf>
  </div>
</template>

<style scoped lang="less"></style>
